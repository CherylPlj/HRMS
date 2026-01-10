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

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function verifySignature(body: string, timestamp: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', SHARED_SECRET);
  hmac.update(body + timestamp);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * GET /api/xr/faculty-availability/[employeeId]
 * 
 * Check faculty availability and leave status
 * 
 * Query params:
 * - startDate (optional): Check availability from this date (YYYY-MM-DD)
 * - endDate (optional): Check availability until this date (YYYY-MM-DD)
 * 
 * Returns:
 * - Faculty availability status
 * - Current leave information
 * - Employment status
 * - Schedule conflicts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  console.log('[Faculty Availability API] GET request received');
  
  const userIP = getServerIp(request);
  console.log('[Faculty Availability API] Client IP:', userIP);

  // Rate limiting
  try {
    await rateLimiter.consume(userIP, 1);
  } catch {
    console.warn('[Faculty Availability API] Rate limit exceeded for:', userIP);
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // API Key validation
  const auth = request.headers.get('authorization') || '';
  const apiKey = auth.split(' ')[1];
  console.log('[Faculty Availability API] API key received:', apiKey ? '[REDACTED]' : 'None');

  if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
    console.warn('[Faculty Availability API] Invalid API key');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timestamp and signature validation
  const timestamp = request.headers.get('x-timestamp') || '';
  const signature = request.headers.get('x-signature') || '';
  const now = Date.now();
  const tsInt = parseInt(timestamp, 10);

  if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
    console.warn('[Faculty Availability API] Invalid timestamp or signature window');
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // For GET requests, use empty string as body for signature verification
  const body = '';
  if (!verifySignature(body, timestamp, signature)) {
    console.warn('[Faculty Availability API] Signature verification failed');
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Validate params
  let employeeId: string;
  try {
    const validatedParams = paramsSchema.parse(params);
    employeeId = validatedParams.employeeId;
    console.log('[Faculty Availability API] Employee ID:', employeeId);
  } catch (err) {
    console.error('[Faculty Availability API] Params validation failed:', err);
    return Response.json({ error: 'Invalid employee ID' }, { status: 400 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // Query faculty with related data
    const faculty = await prisma.faculty.findFirst({
      where: { 
        EmployeeID: employeeId,
        isDeleted: false,
      },
      include: {
        Employee: {
          include: {
            employmentDetails: true,
          },
        },
        User: {
          select: {
            Email: true,
            FirstName: true,
            LastName: true,
            Status: true,
          },
        },
        Department: true,
        Leaves: {
          where: {
            Status: {
              in: ['Pending', 'Approved'],
            },
            ...(startDate && endDate ? {
              OR: [
                {
                  StartDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                },
                {
                  EndDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                },
                {
                  AND: [
                    { StartDate: { lte: new Date(startDate) } },
                    { EndDate: { gte: new Date(endDate) } },
                  ],
                },
              ],
            } : {}),
          },
          orderBy: {
            StartDate: 'desc',
          },
          take: 10, // Limit to recent leaves
        },
      },
    });

    if (!faculty) {
      console.warn('[Faculty Availability API] Faculty not found:', employeeId);
      return Response.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Check current availability
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentLeave = faculty.Leaves.find(leave => {
      if (!leave.StartDate || !leave.EndDate) return false;
      const start = new Date(leave.StartDate);
      const end = new Date(leave.EndDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return today >= start && today <= end && leave.Status === 'Approved';
    });

    const isAvailable = !currentLeave && 
                       faculty.User?.Status === 'Active' &&
                       faculty.EmploymentStatus !== 'Resigned' &&
                       faculty.EmploymentStatus !== 'Retired';

    // Format response
    const response = {
      employeeId: faculty.EmployeeID,
      facultyId: faculty.FacultyID,
      name: `${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`.trim(),
      email: faculty.User?.Email,
      isAvailable,
      availability: {
        status: isAvailable ? 'Available' : 'Unavailable',
        reason: currentLeave 
          ? `On ${currentLeave.LeaveType} Leave` 
          : !isAvailable 
            ? `Status: ${faculty.EmploymentStatus || faculty.User?.Status}` 
            : null,
      },
      employmentStatus: faculty.EmploymentStatus,
      employeeType: faculty.EmployeeType,
      userStatus: faculty.User?.Status,
      department: faculty.Department ? {
        id: faculty.Department.DepartmentID,
        name: faculty.Department.DepartmentName,
      } : null,
      currentLeave: currentLeave ? {
        leaveId: currentLeave.LeaveID,
        type: currentLeave.LeaveType,
        requestType: currentLeave.RequestType,
        startDate: currentLeave.StartDate,
        endDate: currentLeave.EndDate,
        reason: currentLeave.Reason,
        status: currentLeave.Status,
      } : null,
      upcomingLeaves: faculty.Leaves
        .filter(leave => {
          if (!leave.StartDate) return false;
          const start = new Date(leave.StartDate);
          return start > today && leave.Status === 'Approved';
        })
        .map(leave => ({
          leaveId: leave.LeaveID,
          type: leave.LeaveType,
          requestType: leave.RequestType,
          startDate: leave.StartDate,
          endDate: leave.EndDate,
          reason: leave.Reason,
          status: leave.Status,
        })),
      recentLeaves: faculty.Leaves
        .filter(leave => leave !== currentLeave)
        .slice(0, 5)
        .map(leave => ({
          leaveId: leave.LeaveID,
          type: leave.LeaveType,
          requestType: leave.RequestType,
          startDate: leave.StartDate,
          endDate: leave.EndDate,
          status: leave.Status,
        })),
    };

    console.log('[Faculty Availability API] Success - Faculty availability retrieved');
    return Response.json(response);

  } catch (err) {
    console.error('[Faculty Availability API] Database error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
