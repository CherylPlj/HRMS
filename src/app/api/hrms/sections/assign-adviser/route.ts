import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimiter } from '@/lib/limiter';
import { getServerIp } from '@/lib/ip';
import { z } from 'zod';
import crypto from 'crypto';

const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
const VALID_API_KEYS = {
    'lms': process.env.SJSFI_LMS_API_KEY,
    'sis': process.env.SJSFI_SIS_API_KEY,
    // Don't use HRMS API key for receiving from SIS
}

const assignmentSchema = z.object({
    sectionId: z.union([z.number(), z.string()]).optional(),
    sectionName: z.string().optional(),
    adviser: z.object({
        employeeId: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        fullName: z.string().optional(),
    }).nullable().optional(),
});

const requestSchema = z.object({
    data: z.string(),
});

function verifySignature(body: string, timestamp: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(body + timestamp);
    const digest = hmac.digest('hex');
    console.log('[verifySignature] Computed digest:', digest);
    
    // Use constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(digest, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        // If buffers are different lengths, timingSafeEqual throws
        return false;
    }
}

export async function POST(request: NextRequest) {
    console.log('POST /api/hrms/sections/assign-adviser called');

    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        const proto = request.headers.get('x-forwarded-proto');
        if (proto !== 'https') {
            console.warn('HTTPS required in production');
            return Response.json({ error: 'HTTPS required' }, { status: 403 });
        }
    }

    const userIP = getServerIp(request);
    console.log('Client IP:', userIP);

    try {
        await rateLimiter.consume(userIP, 1);
    } catch {
        console.warn('Rate limit exceeded for:', userIP);
        return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    const auth = request.headers.get('authorization') || '';
    const apiKey = auth.split(' ')[1];
    console.log('Received API key:', apiKey ? '[REDACTED]' : 'None');

    // Use constant-time comparison for API key validation
    if (!apiKey) {
        console.warn('Missing API key');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let validKey = false;
    for (const key of Object.values(VALID_API_KEYS)) {
        if (key && apiKey.length === key.length) {
            try {
                if (crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(key))) {
                    validKey = true;
                    break;
                }
            } catch {
                // Continue to next key if comparison fails
                continue;
            }
        }
    }

    if (!validKey) {
        console.warn('Invalid API key');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timestamp = request.headers.get('x-timestamp') || '';
    const signature = request.headers.get('x-signature') || '';
    const now = Date.now();
    const tsInt = parseInt(timestamp, 10);

    console.log('Timestamp:', timestamp);
    console.log('Signature:', signature ? '[REDACTED]' : 'None');

    if (!timestamp || !signature || isNaN(tsInt) || Math.abs(now - tsInt) > 5 * 60 * 1000) {
        console.warn('Invalid timestamp or signature window.');
        console.log('Debug - timestamp empty?', !timestamp, 'signature empty?', !signature, 'tsInt:', tsInt, 'time diff:', Math.abs(now - tsInt));
        return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);

    if (!verifySignature(rawBody, timestamp, signature)) {
        console.warn('Signature verification failed');
        return Response.json({ error: 'Invalid request' }, { status: 403 });
    }

    let data: string;
    try {
        const parsed = requestSchema.parse(JSON.parse(rawBody));
        data = parsed.data;
        console.log('Parsed data:', data);
    } catch (err) {
        console.error('Zod validation failed:', err);
        return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!data) {
        console.warn('data not present after parsing.');
        return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Parse the assignment data
    let assignmentData: z.infer<typeof assignmentSchema>;
    try {
        assignmentData = assignmentSchema.parse(JSON.parse(data));
        console.log('Parsed assignment data:', assignmentData);
    } catch (err) {
        console.error('Assignment data validation failed:', err);
        return Response.json({ error: 'Invalid assignment data' }, { status: 400 });
    }

    try {
        // Find the section - prefer sectionName for matching (more reliable since section names are synced from SIS)
        // If only sectionId is provided, try to find by HRMS ID (though SIS sectionId won't match HRMS ID)
        let section = null;
        
        // Priority 1: Match by sectionName (recommended - aligns with SIS)
        if (assignmentData.sectionName) {
            section = await prisma.classSection.findUnique({
                where: { name: assignmentData.sectionName },
            });
            console.log(`Looking for section by name: "${assignmentData.sectionName}" - ${section ? 'Found' : 'Not found'}`);
        }
        
        // Priority 2: Fallback to sectionId (HRMS internal ID, not SIS sectionId)
        if (!section && assignmentData.sectionId) {
            const sectionId = typeof assignmentData.sectionId === 'string' 
                ? parseInt(assignmentData.sectionId, 10) 
                : assignmentData.sectionId;
            
            section = await prisma.classSection.findUnique({
                where: { id: sectionId },
            });
            console.log(`Looking for section by ID: ${sectionId} - ${section ? 'Found' : 'Not found'}`);
        }

        if (!section) {
            console.warn('Section not found:', { sectionId: assignmentData.sectionId, sectionName: assignmentData.sectionName });
            return Response.json({ 
                error: 'Section not found',
                message: 'Please provide sectionName for reliable matching. Section names are synced from SIS.',
                sectionId: assignmentData.sectionId,
                sectionName: assignmentData.sectionName,
            }, { status: 404 });
        }

        console.log(`Found section: ${section.name} (ID: ${section.id})`);

        // If adviser is null, unassign the adviser
        if (!assignmentData.adviser) {
            console.log('Unassigning adviser from section:', section.name);
            const updatedSection = await prisma.classSection.update({
                where: { id: section.id },
                data: {
                    adviserFacultyId: null,
                    adviser: null, // Also clear legacy field
                },
            });

            return Response.json({
                success: true,
                message: 'Adviser unassigned successfully',
                data: {
                    sectionId: updatedSection.id,
                    sectionName: updatedSection.name,
                    adviser: null,
                },
            }, { status: 200 });
        }

        // Find faculty by employeeId
        const employeeId = assignmentData.adviser.employeeId;
        console.log('Looking for faculty with employeeId:', employeeId);

        const faculty = await prisma.faculty.findFirst({
            where: {
                EmployeeID: employeeId,
                isDeleted: false,
            },
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
        });

        if (!faculty) {
            console.warn('Faculty not found with employeeId:', employeeId);
            return Response.json({
                error: 'Faculty not found',
                employeeId: employeeId,
            }, { status: 404 });
        }

        console.log(`Found faculty: ${faculty.User.FirstName} ${faculty.User.LastName} (FacultyID: ${faculty.FacultyID})`);

        // Get the adviser's full name for legacy field
        const adviserName = `${faculty.User.FirstName} ${faculty.User.LastName}`.trim();

        // Update the section with the adviser
        const updatedSection = await prisma.classSection.update({
            where: { id: section.id },
            data: {
                adviserFacultyId: faculty.FacultyID,
                adviser: adviserName, // Also update legacy field for backward compatibility
            },
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
            },
        });

        console.log(`Successfully assigned adviser to section: ${updatedSection.name}`);

        const response = {
            success: true,
            message: 'Adviser assigned successfully',
            data: {
                sectionId: updatedSection.id,
                sectionName: updatedSection.name,
                adviser: updatedSection.adviserFaculty ? {
                    facultyId: updatedSection.adviserFaculty.FacultyID,
                    employeeId: updatedSection.adviserFaculty.Employee?.EmployeeID,
                    firstName: updatedSection.adviserFaculty.User.FirstName,
                    lastName: updatedSection.adviserFaculty.User.LastName,
                    email: updatedSection.adviserFaculty.User.Email,
                    fullName: `${updatedSection.adviserFaculty.User.FirstName} ${updatedSection.adviserFaculty.User.LastName}`.trim(),
                } : null,
            },
        };

        return Response.json(response, { status: 200 });

    } catch (err) {
        console.error('Database error:', err);
        return Response.json({ error: 'Server error' }, { status: 500 });
    }
}
