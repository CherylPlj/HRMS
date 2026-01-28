import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Helper function to fetch schedules from enrollment system
async function fetchSchedulesFromEnrollmentSystem() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    // Note: When HRMS calls SIS, we use HRMS's API key (SJSFI_HRMS_API_KEY)
    // This is the key that SIS recognizes as coming from HRMS
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    if (!SHARED_SECRET) {
        throw new Error('Missing required environment variable: SJSFI_SHARED_SECRET');
    }
    
    if (!API_KEY) {
        throw new Error('Missing required environment variable: SJSFI_HRMS_API_KEY. This is the API key that SIS recognizes for HRMS requests.');
    }

    // Prepare body
    const requestBody = { data: "fetch-all-schedules" };
    const rawBody = JSON.stringify(requestBody);

    // Generate timestamp and signature
    const timestamp = Date.now().toString();
    const message = rawBody + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    // Make request
    const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
        body: rawBody,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch schedules: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * GET /api/schedules/fetch-from-sis
 * Fetches schedules from SIS enrollment system and returns them
 * for display and teacher assignment
 */
export async function GET() {
    try {
        // Fetch schedules from SIS
        const sisData = await fetchSchedulesFromEnrollmentSystem();
        
        if (!sisData || !sisData.data) {
            return NextResponse.json({
                success: false,
                error: 'No schedule data received from SIS',
            }, { status: 404 });
        }

        const sisSchedules = sisData.data || [];
        
        // Helper function to calculate duration in hours from start and end times
        const calculateDuration = (startTime: string, endTime: string): number => {
            try {
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                const durationMinutes = endMinutes - startMinutes;
                // Convert to hours (rounded to nearest 0.5)
                return Math.round((durationMinutes / 30)) * 0.5;
            } catch {
                return 1; // Default to 1 hour
            }
        };

        // Map SIS schedules to a format suitable for display and assignment
        // IMPORTANT: Do this sequentially to avoid exhausting the Prisma connection pool
        // (especially on serverless deployments where the connection limit can be very low).
        const mappedSchedules = [];

        for (const sisSchedule of sisSchedules as any[]) {
                // Extract data from SIS structure
                const scheduleData = sisSchedule.schedule || {};
                const subjectData = sisSchedule.subject || {};
                const sectionData = sisSchedule.section || {};
                const teacherData = sisSchedule.teacher || {};

                // Try to find matching subject in HRMS by code or name
                let subjectId: number | null = null;
                let subjectName = subjectData.name || 'Unknown';
                
                if (subjectData.code || subjectData.name) {
                    const subject = await prisma.subject.findFirst({
                        where: {
                            OR: [
                                { name: { contains: subjectName, mode: 'insensitive' } },
                                { code: subjectData.code || '' },
                            ],
                        },
                    });
                    if (subject) {
                        subjectId = subject.id;
                        subjectName = subject.name;
                    }
                }

                // Try to find matching section
                let classSectionId: number | null = null;
                let sectionName = sectionData.name || 'Unknown';
                
                if (sectionName && sectionName !== 'Unknown') {
                    const section = await prisma.classSection.findFirst({
                        where: {
                            name: { contains: sectionName, mode: 'insensitive' },
                        },
                    });
                    if (section) {
                        classSectionId = section.id;
                        sectionName = section.name;
                    }
                }

                // Format time range (HRMS expects "HH:MM-HH:MM" format) - Calculate early for use in HRMS lookup
                const startTime = scheduleData.startTime || '';
                const endTime = scheduleData.endTime || '';
                const timeRange = startTime && endTime ? `${startTime}-${endTime}` : '';

                // Check if teacher is assigned in SIS
                const isAssignedInSIS = teacherData.assigned === true;
                const teacherId = teacherData.teacherId || null;
                
                // Also check if this schedule exists in HRMS (meaning teacher was assigned via HRMS)
                let hrmsSchedule = null;
                if (subjectId && classSectionId && timeRange) {
                    // Try to find matching schedule in HRMS
                    hrmsSchedule = await prisma.schedules.findFirst({
                        where: {
                            subjectId: subjectId,
                            classSectionId: classSectionId,
                            day: scheduleData.day || '',
                            time: timeRange,
                        },
                        include: {
                            faculty: {
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
                                        select: {
                                            LeaveID: true,
                                            LeaveType: true,
                                            StartDate: true,
                                            EndDate: true,
                                            Reason: true,
                                        },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    });
                }
                
                // Teacher is assigned if assigned in SIS OR if schedule exists in HRMS
                const isAssigned = isAssignedInSIS || !!hrmsSchedule;
                
                // Try to find faculty by teacherId if assigned
                let facultyId: number | null = null;
                let facultyName = 'Unassigned';
                let facultyLeaveStatus: {
                    isOnLeave: boolean;
                    leave: {
                        LeaveID: number;
                        LeaveType: string | null;
                        StartDate: Date | null;
                        EndDate: Date | null;
                        Reason: string;
                    } | null;
                } | null = null;
                
                // Track original teacher from SIS
                let originalFacultyId: number | null = null;
                let originalFacultyName: string | null = null;
                let originalFacultyLeaveStatus: {
                    isOnLeave: boolean;
                    leave: {
                        LeaveID: number;
                        LeaveType: string | null;
                        StartDate: Date | null;
                        EndDate: Date | null;
                        Reason: string;
                    } | null;
                } | null = null;
                
                // Get original teacher from SIS if assigned
                if (isAssignedInSIS && teacherId) {
                    const originalFaculty = await prisma.faculty.findFirst({
                        where: {
                            EmployeeID: teacherId.toString(),
                        },
                        include: {
                            User: {
                                select: {
                                    FirstName: true,
                                    LastName: true,
                                    Email: true,
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
                                select: {
                                    LeaveID: true,
                                    LeaveType: true,
                                    StartDate: true,
                                    EndDate: true,
                                    Reason: true,
                                },
                                take: 1,
                            },
                        },
                    });
                    
                    if (originalFaculty) {
                        originalFacultyId = originalFaculty.FacultyID;
                        originalFacultyName = `${originalFaculty.User.FirstName} ${originalFaculty.User.LastName}`;
                        originalFacultyLeaveStatus = {
                            isOnLeave: originalFaculty.Leaves.length > 0,
                            leave: originalFaculty.Leaves.length > 0 ? originalFaculty.Leaves[0] : null,
                        };
                    }
                }

                // Prefer HRMS schedule faculty if it exists
                if (hrmsSchedule && hrmsSchedule.faculty) {
                    facultyId = hrmsSchedule.faculty.FacultyID;
                    facultyName = `${hrmsSchedule.faculty.User.FirstName} ${hrmsSchedule.faculty.User.LastName}`;
                    facultyLeaveStatus = {
                        isOnLeave: hrmsSchedule.faculty.Leaves.length > 0,
                        leave: hrmsSchedule.faculty.Leaves.length > 0 ? hrmsSchedule.faculty.Leaves[0] : null,
                    };
                } else if (isAssignedInSIS && teacherId) {
                    // Try to find by employee ID from SIS
                    const faculty = await prisma.faculty.findFirst({
                        where: {
                            EmployeeID: teacherId.toString(),
                        },
                        include: {
                            User: {
                                select: {
                                    FirstName: true,
                                    LastName: true,
                                    Email: true,
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
                                select: {
                                    LeaveID: true,
                                    LeaveType: true,
                                    StartDate: true,
                                    EndDate: true,
                                    Reason: true,
                                },
                                take: 1,
                            },
                        },
                    });
                    
                    if (faculty) {
                        facultyId = faculty.FacultyID;
                        facultyName = `${faculty.User.FirstName} ${faculty.User.LastName}`;
                        facultyLeaveStatus = {
                            isOnLeave: faculty.Leaves.length > 0,
                            leave: faculty.Leaves.length > 0 ? faculty.Leaves[0] : null,
                        };
                    } else if (teacherData.teacherName) {
                        // If faculty not found but name is provided, use the name
                        facultyName = teacherData.teacherName;
                    }
                }

                // Check if there's a substitute and original teacher's leave has ended
                let shouldRestoreOriginal = false;
                if (
                    hrmsSchedule && 
                    originalFacultyId && 
                    hrmsSchedule.faculty.FacultyID !== originalFacultyId &&
                    originalFacultyLeaveStatus &&
                    !originalFacultyLeaveStatus.isOnLeave // Leave has ended
                ) {
                    shouldRestoreOriginal = true;
                }

                // Calculate duration
                const duration = startTime && endTime 
                    ? calculateDuration(startTime, endTime)
                    : 1;
                
                // Use HRMS schedule duration if it exists and differs
                const finalDuration = hrmsSchedule?.duration || duration;

                // Determine sync status
                const existsInHRMS = !!hrmsSchedule;
                const syncStatus: 'synced' | 'hrms-only' | 'sis-only' | 'unassigned' = 
                    !isAssigned ? 'unassigned' :
                    isAssignedInSIS && existsInHRMS ? 'synced' :
                    existsInHRMS && !isAssignedInSIS ? 'hrms-only' :
                    isAssignedInSIS && !existsInHRMS ? 'sis-only' :
                    'unassigned';

                mappedSchedules.push({
                    sisId: sisSchedule.scheduleId,
                    subjectId,
                    subjectName,
                    subjectCode: subjectData.code,
                    classSectionId,
                    sectionName,
                    day: scheduleData.day || 'Unknown',
                    time: timeRange,
                    room: scheduleData.room || '',
                    instructor: facultyName,
                    facultyId,
                    facultyName,
                    isAssigned,
                    duration: finalDuration,
                    hrmsScheduleId: hrmsSchedule?.id || null, // Include HRMS schedule ID if exists
                    syncStatus, // 'synced' | 'hrms-only' | 'sis-only' | 'unassigned'
                    isAssignedInSIS, // Whether assigned in SIS
                    existsInHRMS, // Whether exists in HRMS
                    facultyLeaveStatus, // Leave status for assigned faculty
                    originalFacultyId, // Original teacher from SIS (for restoration)
                    originalFacultyName, // Original teacher name
                    shouldRestoreOriginal, // Whether to show restore button (leave ended, substitute assigned)
                    // Additional data from SIS
                    yearLevel: sisSchedule.yearLevel?.name,
                    termId: sisSchedule.term?.id,
                    // Raw SIS data for reference
                    rawData: sisSchedule,
                });
        }

        return NextResponse.json({
            success: true,
            total: mappedSchedules.length,
            assigned: mappedSchedules.filter(s => s.isAssigned).length,
            unassigned: mappedSchedules.filter(s => !s.isAssigned).length,
            schedules: mappedSchedules,
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching schedules from SIS:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch schedules from SIS',
        }, { status: 500 });
    }
}

