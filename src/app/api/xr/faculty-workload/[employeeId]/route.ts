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

const paramsSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
});

function verifySignature(body: string, timestamp: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', SHARED_SECRET);
  hmac.update(body + timestamp);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * GET /api/xr/faculty-workload/[employeeId]
 * 
 * Get faculty current teaching workload and schedule
 * 
 * Returns:
 * - Number of sections assigned
 * - Total teaching hours per week
 * - Detailed schedule
 * - Workload capacity (can take more sections?)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  console.log('[Faculty Workload API] GET request received');
  
  const userIP = getServerIp(request);
  console.log('[Faculty Workload API] Client IP:', userIP);

  // Rate limiting
  try {
    await rateLimiter.consume(userIP, 1);
  } catch {
    console.warn('[Faculty Workload API] Rate limit exceeded for:', userIP);
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // API Key validation
  const auth = request.headers.get('authorization') || '';
  const apiKey = auth.split(' ')[1];
  console.log('[Faculty Workload API] API key received:', apiKey ? '[REDACTED]' : 'None');

  if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
    console.warn('[Faculty Workload API] Invalid API key');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timestamp and signature validation
  const timestamp = request.headers.get('x-timestamp') || '';
  const signature = request.headers.get('x-signature') || '';
  const now = Date.now();
  const tsInt = parseInt(timestamp, 10);

  if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
    console.warn('[Faculty Workload API] Invalid timestamp or signature window');
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // For GET requests, use empty string as body for signature verification
  const body = '';
  if (!verifySignature(body, timestamp, signature)) {
    console.warn('[Faculty Workload API] Signature verification failed');
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Validate params
  let employeeId: string;
  try {
    const validatedParams = paramsSchema.parse(params);
    employeeId = validatedParams.employeeId;
    console.log('[Faculty Workload API] Employee ID:', employeeId);
  } catch (err) {
    console.error('[Faculty Workload API] Params validation failed:', err);
    return Response.json({ error: 'Invalid employee ID' }, { status: 400 });
  }

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
          },
        },
        Department: true,
        Schedules: {
          include: {
            subject: true,
            classSection: true,
          },
          orderBy: {
            day: 'asc',
          },
        },
        Employee: {
          include: {
            employmentDetails: true,
            Contract: true,
          },
        },
      },
    });

    if (!faculty) {
      console.warn('[Faculty Workload API] Faculty not found:', employeeId);
      return Response.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Calculate teaching load
    const totalSections = faculty.Schedules.length;
    
    // Calculate total hours per week
    const totalHoursPerWeek = faculty.Schedules.reduce((total, schedule) => {
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

    const workloadPercentage = maxHoursPerWeek > 0 
      ? Math.round((totalHoursPerWeek / maxHoursPerWeek) * 100)
      : 0;

    const canTakeMoreSections = totalSections < maxSections && totalHoursPerWeek < maxHoursPerWeek;
    const availableHours = Math.max(0, maxHoursPerWeek - totalHoursPerWeek);

    // Group schedules by day for better visualization
    const scheduleByDay = faculty.Schedules.reduce((acc, schedule) => {
      const day = schedule.day;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push({
        scheduleId: schedule.id,
        subject: schedule.subject.name,
        section: schedule.classSection.name,
        time: schedule.time,
        duration: schedule.duration,
        subjectId: schedule.subjectId,
        sectionId: schedule.classSectionId,
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate hours per day
    const hoursPerDay = Object.entries(scheduleByDay).map(([day, schedules]) => ({
      day,
      totalHours: schedules.reduce((sum, s) => sum + (s.duration || 0), 0),
      numberOfClasses: schedules.length,
    }));

    // Format response
    const response = {
      employeeId: faculty.EmployeeID,
      facultyId: faculty.FacultyID,
      name: `${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`.trim(),
      email: faculty.User?.Email,
      position: faculty.Position,
      employmentType: faculty.EmployeeType,
      employmentStatus: faculty.EmploymentStatus,
      department: faculty.Department ? {
        id: faculty.Department.DepartmentID,
        name: faculty.Department.DepartmentName,
      } : null,
      
      workload: {
        totalSections,
        totalHoursPerWeek,
        maxHoursPerWeek,
        maxSections,
        availableHours,
        workloadPercentage,
        canTakeMoreSections,
        status: workloadPercentage >= 100 
          ? 'Full Load' 
          : workloadPercentage >= 80 
            ? 'Near Capacity' 
            : workloadPercentage >= 50
              ? 'Moderate Load'
              : 'Light Load',
      },

      scheduleByDay,
      hoursPerDay,

      schedules: faculty.Schedules.map(schedule => ({
        scheduleId: schedule.id,
        day: schedule.day,
        time: schedule.time,
        duration: schedule.duration,
        subject: {
          id: schedule.subjectId,
          name: schedule.subject.name,
        },
        section: {
          id: schedule.classSectionId,
          name: schedule.classSection.name,
        },
      })),

      contract: faculty.Employee?.Contract ? {
        contractType: faculty.Employee.Contract.ContractType,
        startDate: faculty.Employee.Contract.StartDate,
        endDate: faculty.Employee.Contract.EndDate,
      } : null,

      recommendations: {
        canAssignMore: canTakeMoreSections,
        suggestedMaxAdditionalHours: availableHours,
        suggestedMaxAdditionalSections: Math.max(0, maxSections - totalSections),
        warnings: [
          workloadPercentage >= 90 ? 'Faculty is near maximum capacity' : null,
          totalSections >= maxSections ? 'Maximum sections reached' : null,
          totalHoursPerWeek >= maxHoursPerWeek ? 'Maximum hours reached' : null,
        ].filter(Boolean),
      },
    };

    console.log('[Faculty Workload API] Success - Workload data retrieved');
    return Response.json(response);

  } catch (err) {
    console.error('[Faculty Workload API] Database error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
