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
 * GET /api/xr/faculty-qualifications/[employeeId]
 * 
 * Get faculty educational qualifications, licenses, and certifications
 * 
 * Returns:
 * - Educational background (degrees, majors, universities)
 * - Professional licenses (PRC License)
 * - Certifications and training
 * - Skills and specializations
 * - Teaching experience
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  console.log('[Faculty Qualifications API] GET request received');
  
  const userIP = getServerIp(request);
  console.log('[Faculty Qualifications API] Client IP:', userIP);

  // Rate limiting
  try {
    await rateLimiter.consume(userIP, 1);
  } catch {
    console.warn('[Faculty Qualifications API] Rate limit exceeded for:', userIP);
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // API Key validation
  const auth = request.headers.get('authorization') || '';
  const apiKey = auth.split(' ')[1];
  console.log('[Faculty Qualifications API] API key received:', apiKey ? '[REDACTED]' : 'None');

  if (!apiKey || !Object.values(VALID_API_KEYS).includes(apiKey)) {
    console.warn('[Faculty Qualifications API] Invalid API key');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Timestamp and signature validation
  const timestamp = request.headers.get('x-timestamp') || '';
  const signature = request.headers.get('x-signature') || '';
  const now = Date.now();
  const tsInt = parseInt(timestamp, 10);

  if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
    console.warn('[Faculty Qualifications API] Invalid timestamp or signature window');
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // For GET requests, use empty string as body for signature verification
  const body = '';
  if (!verifySignature(body, timestamp, signature)) {
    console.warn('[Faculty Qualifications API] Signature verification failed');
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Validate params
  let employeeId: string;
  try {
    const validatedParams = paramsSchema.parse(params);
    employeeId = validatedParams.employeeId;
    console.log('[Faculty Qualifications API] Employee ID:', employeeId);
  } catch (err) {
    console.error('[Faculty Qualifications API] Params validation failed:', err);
    return Response.json({ error: 'Invalid employee ID' }, { status: 400 });
  }

  try {
    // Query employee with all qualification-related data
    const employee = await prisma.employee.findFirst({
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
        Education: {
          orderBy: {
            yearGraduated: 'desc',
          },
        },
        governmentIds: true,
        certificates: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        skills: {
          orderBy: {
            proficiencyLevel: 'desc',
          },
        },
        trainings: {
          orderBy: {
            date: 'desc',
          },
        },
        Eligibility: {
          orderBy: {
            examDate: 'desc',
          },
        },
        EmploymentHistory: {
          orderBy: {
            startDate: 'desc',
          },
        },
        employmentDetails: true,
        Department: true,
        Faculty: true,
      },
    });

    if (!employee) {
      console.warn('[Faculty Qualifications API] Employee not found:', employeeId);
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if PRC License is valid
    const prcLicense = employee.governmentIds?.PRCLicenseNumber;
    const prcValidity = employee.governmentIds?.PRCValidity;
    const isPrcValid = prcLicense && prcValidity && new Date(prcValidity) > new Date();

    // Calculate years of teaching experience
    const hireDate = employee.Faculty?.HireDate || employee.HireDate;
    const yearsOfExperience = hireDate 
      ? Math.floor((Date.now() - new Date(hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 0;

    // Format response
    const response = {
      employeeId: employee.EmployeeID,
      facultyId: employee.Faculty?.FacultyID || null,
      name: `${employee.FirstName || ''} ${employee.LastName || ''}`.trim(),
      email: employee.Email || employee.User?.Email,
      position: employee.Position || employee.Faculty?.Position,
      department: employee.Department ? {
        id: employee.Department.DepartmentID,
        name: employee.Department.DepartmentName,
        type: employee.Department.type,
      } : null,
      
      // Educational Background
      education: employee.Education.map(edu => ({
        level: edu.level,
        schoolName: edu.schoolName,
        course: edu.course,
        yearGraduated: edu.yearGraduated,
        honors: edu.honors,
      })),
      highestEducation: employee.Education[0] ? {
        level: employee.Education[0].level,
        course: employee.Education[0].course,
        schoolName: employee.Education[0].schoolName,
      } : null,

      // Professional Licenses
      licenses: {
        prc: {
          licenseNumber: prcLicense || null,
          validity: prcValidity,
          isValid: isPrcValid,
          status: isPrcValid ? 'Valid' : prcLicense ? 'Expired or Expiring Soon' : 'Not Available',
        },
        other: {
          tin: employee.governmentIds?.TINNumber || null,
          bir: employee.governmentIds?.BIRNumber || null,
          passport: employee.governmentIds?.PassportNumber || null,
          passportValidity: employee.governmentIds?.PassportValidity || null,
        },
      },

      // Professional Eligibility (e.g., Civil Service, LET)
      eligibility: employee.Eligibility.map(elig => ({
        title: elig.type,
        licenseNumber: elig.licenseNumber,
        rating: elig.rating,
        examDate: elig.examDate,
        validityDate: elig.validUntil,
      })),

      // Certifications
      certifications: employee.certificates.map(cert => ({
        name: cert.title,
        issuingOrganization: cert.issuedBy,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        isValid: cert.expiryDate ? new Date(cert.expiryDate) > new Date() : true,
      })),

      // Skills and Specializations
      skills: employee.skills.map(skill => ({
        name: skill.name,
        proficiencyLevel: skill.proficiencyLevel,
        description: skill.description,
      })),

      // Training and Professional Development
      trainings: employee.trainings.map(training => ({
        title: training.title,
        sponsoredBy: training.conductedBy,
        numberOfHours: training.hours,
        dateCompleted: training.date,
      })),

      // Teaching Experience
      experience: {
        yearsOfTeaching: yearsOfExperience,
        hireDate: hireDate,
        currentPosition: employee.employmentDetails?.Position || employee.Position,
        employmentStatus: employee.employmentDetails?.EmploymentStatus || employee.Faculty?.EmploymentStatus,
        previousEmployment: employee.EmploymentHistory.map(hist => ({
          schoolName: hist.schoolName,
          position: hist.position,
          startDate: hist.startDate,
          endDate: hist.endDate,
          yearsOfService: hist.endDate 
            ? Math.floor((new Date(hist.endDate).getTime() - new Date(hist.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
            : null,
        })),
      },

      // Summary for quick validation
      qualificationSummary: {
        hasValidPRCLicense: isPrcValid,
        hasPostgraduate: employee.Education.some(edu => 
          edu.level?.toLowerCase().includes('master') || 
          edu.level?.toLowerCase().includes('doctor') ||
          edu.level?.toLowerCase().includes('phd')
        ),
        hasBachelors: employee.Education.some(edu => 
          edu.level?.toLowerCase().includes('bachelor') ||
          edu.level?.toLowerCase().includes('college')
        ),
        yearsOfExperience,
        numberOfCertifications: employee.certificates.length,
        numberOfTrainings: employee.trainings.length,
        isQualified: isPrcValid || employee.Education.length > 0,
      },
    };

    console.log('[Faculty Qualifications API] Success - Qualifications retrieved');
    return Response.json(response);

  } catch (err) {
    console.error('[Faculty Qualifications API] Database error:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
