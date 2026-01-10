import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimiter } from '@/lib/limiter';
import { getServerIp } from '@/lib/ip';
import { z } from 'zod';
import crypto from 'crypto';

const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
const VALID_API_KEYS = {
  'sis': process.env.SJSFI_SIS_API_KEY,
  'lms': process.env.SJSFI_LMS_API_KEY,
};

const requestSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  additionalHours: z.number().min(0).optional(),
  additionalSections: z.number().int().min(0).optional(),
  day: z.string().optional(),
  time: z.string().optional(),
  duration: z.number().min(0).optional(),
});

function verifySignature(body: string, timestamp: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', SHARED_SECRET);
  hmac.update(body + timestamp);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * POST /api/xr/faculty-workload/validate
 * 
 * Validate if a faculty can take additional workload
 * 
 * Request body:
 * {
 *   employeeId: string,
 *   additionalHours?: number,
 *   additionalSections?: number,
 *   day?: string,          // for checking schedule conflicts
 *   time?: string,         // for checking schedule conflicts
 *   duration?: number      // for checking schedule conflicts
 * }
 * 
 * Returns:
 * - Can assign: boolean
 * - Reason if cannot assign
 * - Current vs proposed workload
 * - Schedule conflicts if any
 */
export async function POST(request: NextRequest) {
  console.log('[Faculty Workload Validate API] POST request received');
  
  const userIP = getServerIp(request);
  console.log('[Faculty Workload Validate API] Client IP:', userIP);

  // Rate limiting
  try {
    await rateLimiter.consume(userIP, 1);
  } catch {
    console.warn('[Faculty Workload Validate API] Rate limit exceeded for:', userIP);
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // API Key validation
  const auth = request.headers.get('authorization') || '';
  const apiKey = auth.split(' ')[1];
  console.log('[Faculty Workload Validate API] API key received:', apiKey ? '[REDACTED]' : 'None');

  if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
    console.warn('[Faculty Workload Validate API] Invalid API key');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timestamp and signature validation
  const timestamp = request.headers.get('x-timestamp') || '';
  const signature = request.headers.get('x-signature') || '';
  const now = Date.now();
  const tsInt = parseInt(timestamp, 10);

  if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
    console.warn('[Faculty Workload Validate API] Invalid timestamp or signature window');
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const rawBody = await request.text();
  console.log('[Faculty Workload Validate API] Raw body:', rawBody);

  if (!verifySignature(rawBody, timestamp, signature)) {
    console.warn('[Faculty Workload Validate API] Signature verification failed');
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Parse and validate request body
  let validatedData: z.infer<typeof requestSchema>;
  try {
    const parsed = JSON.parse(rawBody);
    validatedData = requestSchema.parse(parsed);
    console.log('[Faculty Workload Validate API] Validated data:', validatedData);
  } catch (err) {
    console.error('[Faculty Workload Validate API] Validation failed:', err);
    return Response.json({ error: 'Invalid request data' }, { status: 400 });
  }

  const { employeeId, additionalHours = 0, additionalSections = 0, day, time, duration } = validatedData;

  try {
    // Query faculty with schedule data
    const faculty = await prisma.faculty.findFirst({
      where: { 
        EmployeeID: employeeId,
        isDeleted: false,
      },
      include: {
        User: {
          select: {
            Email: true,
            FirstName: true,
            LastName: true,
            Status: true,
          },
        },
        Schedules: {
          include: {
            subject: true,
            classSection: true,
          },
        },
        Leaves: {
          where: {
            Status: 'Approved',
            StartDate: {
              lte: new Date(),
            },
            EndDate: {
              gte: new Date(),
            },
          },
        },
      },
    });

    if (!faculty) {
      console.warn('[Faculty Workload Validate API] Faculty not found:', employeeId);
      return Response.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Check if faculty is available (not on leave, active status)
    const isOnLeave = faculty.Leaves.length > 0;
    const isActive = faculty.User?.Status === 'Active' && 
                     faculty.EmploymentStatus !== 'Resigned' && 
                     faculty.EmploymentStatus !== 'Retired';

    if (isOnLeave) {
      return Response.json({
        canAssign: false,
        reason: 'Faculty is currently on leave',
        currentLeave: faculty.Leaves[0] ? {
          type: faculty.Leaves[0].LeaveType,
          startDate: faculty.Leaves[0].StartDate,
          endDate: faculty.Leaves[0].EndDate,
        } : null,
      });
    }

    if (!isActive) {
      return Response.json({
        canAssign: false,
        reason: `Faculty status: ${faculty.EmploymentStatus || faculty.User?.Status}`,
      });
    }

    // Calculate current workload
    const currentSections = faculty.Schedules.length;
    const currentHoursPerWeek = faculty.Schedules.reduce((total, schedule) => {
      return total + (schedule.duration || 0);
    }, 0);

    // Define workload limits based on employment type
    let maxHoursPerWeek = 40;
    let maxSections = 10;
    
    if (faculty.EmployeeType === 'Part_Time') {
      maxHoursPerWeek = 20;
      maxSections = 5;
    } else if (faculty.EmployeeType === 'Probationary') {
      maxHoursPerWeek = 35;
      maxSections = 8;
    }

    // Calculate proposed workload
    const proposedSections = currentSections + additionalSections;
    const proposedHours = currentHoursPerWeek + additionalHours + (duration || 0);

    // Check if proposed workload exceeds limits
    const exceedsHours = proposedHours > maxHoursPerWeek;
    const exceedsSections = proposedSections > maxSections;

    // Check for schedule conflicts if day and time provided
    let scheduleConflict = false;
    let conflictingSchedules: any[] = [];

    if (day && time) {
      // Simple time conflict check - can be enhanced with proper time parsing
      conflictingSchedules = faculty.Schedules.filter(schedule => {
        if (schedule.day === day && schedule.time === time) {
          return true;
        }
        // TODO: Add more sophisticated time overlap checking
        return false;
      });

      scheduleConflict = conflictingSchedules.length > 0;
    }

    // Determine if can assign
    const canAssign = !exceedsHours && !exceedsSections && !scheduleConflict;

    // Build reasons if cannot assign
    const reasons: string[] = [];
    if (exceedsHours) {
      reasons.push(`Exceeds maximum hours (${proposedHours}/${maxHoursPerWeek} hours)`);
    }
    if (exceedsSections) {
      reasons.push(`Exceeds maximum sections (${proposedSections}/${maxSections} sections)`);
    }
    if (scheduleConflict) {
      reasons.push('Schedule conflict detected');
    }

    // Format response
    const response = {
      canAssign,
      reason: reasons.length > 0 ? reasons.join('; ') : 'Faculty can take additional workload',
      validation: {
        employeeId: faculty.EmployeeID,
        facultyId: faculty.FacultyID,
        name: `${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`.trim(),
        employmentType: faculty.EmployeeType,
      },
      currentWorkload: {
        sections: currentSections,
        hoursPerWeek: currentHoursPerWeek,
      },
      proposedWorkload: {
        sections: proposedSections,
        hoursPerWeek: proposedHours,
      },
      limits: {
        maxSections,
        maxHoursPerWeek,
      },
      availability: {
        remainingSections: Math.max(0, maxSections - proposedSections),
        remainingHours: Math.max(0, maxHoursPerWeek - proposedHours),
      },
      checks: {
        exceedsHours,
        exceedsSections,
        scheduleConflict,
      },
      conflicts: scheduleConflict ? conflictingSchedules.map(schedule => ({
        day: schedule.day,
        time: schedule.time,
        duration: schedule.duration,
        subject: schedule.subject.name,
        section: schedule.classSection.name,
      })) : [],
    };

    console.log('[Faculty Workload Validate API] Success - Validation completed');
    return Response.json(response);

  } catch (err) {
    console.error('[Faculty Workload Validate API] Database error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
