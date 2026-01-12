import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimiter } from '@/lib/limiter';
import { getServerIp } from '@/lib/ip';
import crypto from 'crypto';

const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
const VALID_API_KEYS = {
  'sis': process.env.SJSFI_SIS_API_KEY,
  'lms': process.env.SJSFI_LMS_API_KEY,
};

function verifySignature(body: string, timestamp: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', SHARED_SECRET);
  hmac.update(body + timestamp);
  const digest = hmac.digest('hex');
  return digest === signature;
}

/**
 * GET /api/xr/section-assignments
 * 
 * Get all class section assignments (advisers, homeroom teachers, section heads)
 * 
 * Query params:
 * - sectionId (optional): Filter by specific section ID
 * - gradeLevel (optional): Filter by grade level
 * - schoolYear (optional): Filter by school year
 * 
 * Returns:
 * - Array of sections with their assignments
 * - Adviser information (if assigned)
 * - Homeroom teacher information (if assigned)
 * - Section head information (if assigned)
 */
export async function GET(request: NextRequest) {
  console.log('[Section Assignments API] GET request received');
  
  const userIP = getServerIp(request);
  console.log('[Section Assignments API] Client IP:', userIP);

  // Rate limiting
  try {
    await rateLimiter.consume(userIP, 1);
  } catch {
    console.warn('[Section Assignments API] Rate limit exceeded for:', userIP);
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // API Key validation
  const auth = request.headers.get('authorization') || '';
  const apiKey = auth.split(' ')[1];
  console.log('[Section Assignments API] API key received:', apiKey ? '[REDACTED]' : 'None');

  if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
    console.warn('[Section Assignments API] Invalid API key');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timestamp and signature validation
  const timestamp = request.headers.get('x-timestamp') || '';
  const signature = request.headers.get('x-signature') || '';
  const now = Date.now();
  const tsInt = parseInt(timestamp, 10);

  if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
    console.warn('[Section Assignments API] Invalid timestamp or signature window');
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // For GET requests, use empty string as body for signature verification
  const body = '';
  if (!verifySignature(body, timestamp, signature)) {
    console.warn('[Section Assignments API] Invalid signature');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const gradeLevel = searchParams.get('gradeLevel');
    const schoolYear = searchParams.get('schoolYear');

    // Build where clause
    const where: any = {};
    if (sectionId) {
      where.id = parseInt(sectionId);
    }
    if (gradeLevel) {
      where.gradeLevel = gradeLevel;
    }
    if (schoolYear) {
      where.schoolYear = schoolYear;
    }

    // Fetch sections with assignments
    const sections = await prisma.classSection.findMany({
      where,
      include: {
        adviserFaculty: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
                Email: true,
              },
            },
            Employee: {
              select: {
                EmployeeID: true,
              },
            },
          },
        },
        homeroomTeacher: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
                Email: true,
              },
            },
            Employee: {
              select: {
                EmployeeID: true,
              },
            },
          },
        },
        sectionHead: {
          include: {
            User: {
              select: {
                FirstName: true,
                LastName: true,
                Email: true,
              },
            },
            Employee: {
              select: {
                EmployeeID: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format response for SIS
    const assignments = sections.map(section => ({
      sectionId: section.id,
      sectionName: section.name,
      gradeLevel: section.gradeLevel,
      section: section.section,
      schoolYear: section.schoolYear,
      semester: section.semester,
      adviser: section.adviserFaculty ? {
        facultyId: section.adviserFaculty.FacultyID,
        employeeId: section.adviserFaculty.Employee?.EmployeeID,
        firstName: section.adviserFaculty.User.FirstName,
        lastName: section.adviserFaculty.User.LastName,
        fullName: `${section.adviserFaculty.User.FirstName} ${section.adviserFaculty.User.LastName}`,
        email: section.adviserFaculty.User.Email,
      } : null,
      homeroomTeacher: section.homeroomTeacher ? {
        facultyId: section.homeroomTeacher.FacultyID,
        employeeId: section.homeroomTeacher.Employee?.EmployeeID,
        firstName: section.homeroomTeacher.User.FirstName,
        lastName: section.homeroomTeacher.User.LastName,
        fullName: `${section.homeroomTeacher.User.FirstName} ${section.homeroomTeacher.User.LastName}`,
        email: section.homeroomTeacher.User.Email,
      } : null,
      sectionHead: section.sectionHead ? {
        facultyId: section.sectionHead.FacultyID,
        employeeId: section.sectionHead.Employee?.EmployeeID,
        firstName: section.sectionHead.User.FirstName,
        lastName: section.sectionHead.User.LastName,
        fullName: `${section.sectionHead.User.FirstName} ${section.sectionHead.User.LastName}`,
        email: section.sectionHead.User.Email,
      } : null,
    }));

    console.log(`[Section Assignments API] Returning ${assignments.length} section assignments`);
    return Response.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error('[Section Assignments API] Error:', error);
    return Response.json(
      { error: 'Failed to fetch section assignments' },
      { status: 500 }
    );
  }
}
