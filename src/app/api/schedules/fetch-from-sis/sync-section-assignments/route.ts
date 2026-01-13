import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Helper function to fetch section assignments from SIS
 */
async function fetchSectionAssignmentsFromSIS() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    if (!SHARED_SECRET) {
        throw new Error('Missing required environment variable: SJSFI_SHARED_SECRET');
    }
    
    if (!API_KEY) {
        throw new Error('Missing required environment variable: SJSFI_HRMS_API_KEY');
    }

    // For GET requests, body is empty string
    const body = '';
    const timestamp = Date.now().toString();
    const message = body + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    // Try to fetch from SIS endpoint (assuming SIS provides this endpoint)
    // SIS should have an endpoint similar to HRMS's /api/xr/section-assignments
    // The endpoint might be at /api/hrms/section-assignments or /api/xr/section-assignments
    let response;
    let data;
    
    // Try /api/hrms/section-assignments first (HRMS calling SIS pattern)
    try {
        response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/section-assignments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
        });

        if (response.ok) {
            data = await response.json();
            const assignments = data.assignments || data.data?.assignments || data.data?.data?.assignments || [];
            if (assignments.length > 0) {
                return assignments;
            }
        }
    } catch (error) {
        console.log('[Sync Section Assignments] /api/hrms/section-assignments not available, trying alternative...');
    }

    // If that doesn't work, return null to try alternative method
    return null;
}

/**
 * Extract section assignments from SIS schedules data
 * This is a fallback method if SIS doesn't have a dedicated section assignments endpoint
 */
async function extractSectionAssignmentsFromSchedules() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    if (!SHARED_SECRET || !API_KEY) {
        throw new Error('Missing required environment variables');
    }

    // Prepare body for schedules request
    const requestBody = { data: "fetch-all-schedules" };
    const rawBody = JSON.stringify(requestBody);
    const timestamp = Date.now().toString();
    const message = rawBody + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

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

    const sisData = await response.json();
    const sisSchedules = sisData.data || sisData.schedules || [];

    // Extract unique sections with their assignment data from schedules
    const sectionsMap = new Map<string, {
        sectionName: string;
        sectionData: any;
        adviser?: { employeeId: string; name: string } | null;
        homeroomTeacher?: { employeeId: string; name: string } | null;
        sectionHead?: { employeeId: string; name: string } | null;
    }>();

    for (const schedule of sisSchedules) {
        const sectionData = schedule.section || {};
        const sectionName = sectionData.name;
        
        if (!sectionName) continue;

        if (!sectionsMap.has(sectionName)) {
            sectionsMap.set(sectionName, {
                sectionName,
                sectionData,
            });
        }

        // Check if schedule has section assignment data
        // Note: This assumes SIS includes section assignment info in schedule data
        // If not available, we'll need to rely on a dedicated endpoint
        const sectionInfo = sectionsMap.get(sectionName)!;
        
        // Extract adviser, homeroom teacher, section head from section data if available
        if (sectionData.adviser && !sectionInfo.adviser) {
            sectionInfo.adviser = {
                employeeId: sectionData.adviser.employeeId || sectionData.adviser.teacherId || '',
                name: sectionData.adviser.name || sectionData.adviser.fullName || '',
            };
        }
        
        if (sectionData.homeroomTeacher && !sectionInfo.homeroomTeacher) {
            sectionInfo.homeroomTeacher = {
                employeeId: sectionData.homeroomTeacher.employeeId || sectionData.homeroomTeacher.teacherId || '',
                name: sectionData.homeroomTeacher.name || sectionData.homeroomTeacher.fullName || '',
            };
        }
        
        if (sectionData.sectionHead && !sectionInfo.sectionHead) {
            sectionInfo.sectionHead = {
                employeeId: sectionData.sectionHead.employeeId || sectionData.sectionHead.teacherId || '',
                name: sectionData.sectionHead.name || sectionData.sectionHead.fullName || '',
            };
        }
    }

    return Array.from(sectionsMap.values());
}

/**
 * POST /api/schedules/fetch-from-sis/sync-section-assignments
 * Fetches section assignments from SIS and updates missing faculty assignments in HRMS
 */
export async function POST(request: Request) {
    try {
        console.log('[Sync Section Assignments] Starting sync from SIS...');

        // Try to fetch from dedicated endpoint first
        let sisAssignments = await fetchSectionAssignmentsFromSIS();
        
        // If dedicated endpoint doesn't exist, try extracting from schedules
        if (!sisAssignments || sisAssignments.length === 0) {
            console.log('[Sync Section Assignments] Dedicated endpoint not available, extracting from schedules...');
            const extractedData = await extractSectionAssignmentsFromSchedules();
            if (extractedData && extractedData.length > 0) {
                // Convert extracted data to expected format
                sisAssignments = extractedData.map((item: any) => ({
                    sectionName: item.sectionName,
                    section: item.sectionData,
                    adviser: item.adviser ? {
                        employeeId: item.adviser.employeeId,
                        fullName: item.adviser.name,
                    } : null,
                    homeroomTeacher: item.homeroomTeacher ? {
                        employeeId: item.homeroomTeacher.employeeId,
                        fullName: item.homeroomTeacher.name,
                    } : null,
                    sectionHead: item.sectionHead ? {
                        employeeId: item.sectionHead.employeeId,
                        fullName: item.sectionHead.name,
                    } : null,
                }));
            }
        }

        if (!sisAssignments || sisAssignments.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No section assignment data found in SIS',
            }, { status: 404 });
        }

        console.log(`[Sync Section Assignments] Found ${sisAssignments.length} sections in SIS`);

        // Get all HRMS sections
        const hrmsSections = await prisma.classSection.findMany({
            include: {
                adviserFaculty: {
                    include: {
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
                homeroomTeacher: {
                    include: {
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
                sectionHead: {
                    include: {
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
            },
        });

        const results = [];
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const sisAssignment of sisAssignments) {
            const sectionName = sisAssignment.sectionName || sisAssignment.section?.name;
            if (!sectionName) {
                skippedCount++;
                continue;
            }

            // Find matching HRMS section by name (case-insensitive)
            const hrmsSection = hrmsSections.find(section => 
                section.name.toLowerCase() === sectionName.toLowerCase()
            );

            if (!hrmsSection) {
                results.push({
                    sectionName,
                    status: 'skipped',
                    reason: 'Section not found in HRMS',
                });
                skippedCount++;
                continue;
            }

            // Prepare update data
            const updateData: {
                adviserFacultyId?: number | null;
                homeroomTeacherId?: number | null;
                sectionHeadId?: number | null;
            } = {};

            // Helper function to find faculty by employee ID
            const findFacultyByEmployeeId = async (employeeId: string): Promise<number | null> => {
                if (!employeeId) return null;
                
                const faculty = await prisma.faculty.findFirst({
                    where: {
                        EmployeeID: employeeId,
                    },
                });
                
                return faculty ? faculty.FacultyID : null;
            };

            // Update adviser if missing in HRMS but present in SIS
            const adviserData = sisAssignment.adviser || sisAssignment.section?.adviser;
            if (adviserData && adviserData !== null) {
                // Handle both formats: {employeeId, fullName} or {employeeId, firstName, lastName}
                const employeeId = adviserData.employeeId || adviserData.teacherId;
                if (employeeId) {
                    const facultyId = await findFacultyByEmployeeId(employeeId);
                    if (facultyId && !hrmsSection.adviserFacultyId) {
                        updateData.adviserFacultyId = facultyId;
                    } else if (facultyId && hrmsSection.adviserFacultyId !== facultyId) {
                        // Log if there's a mismatch but don't overwrite existing assignments
                        console.log(`[Sync Section Assignments] Section ${sectionName} has different adviser in HRMS (${hrmsSection.adviserFacultyId}) vs SIS (${facultyId})`);
                    }
                }
            }

            // Update homeroom teacher if missing in HRMS but present in SIS
            const homeroomData = sisAssignment.homeroomTeacher || sisAssignment.section?.homeroomTeacher;
            if (homeroomData && homeroomData !== null) {
                const employeeId = homeroomData.employeeId || homeroomData.teacherId;
                if (employeeId) {
                    const facultyId = await findFacultyByEmployeeId(employeeId);
                    if (facultyId && !hrmsSection.homeroomTeacherId) {
                        updateData.homeroomTeacherId = facultyId;
                    } else if (facultyId && hrmsSection.homeroomTeacherId !== facultyId) {
                        console.log(`[Sync Section Assignments] Section ${sectionName} has different homeroom teacher in HRMS (${hrmsSection.homeroomTeacherId}) vs SIS (${facultyId})`);
                    }
                }
            }

            // Update section head if missing in HRMS but present in SIS
            const sectionHeadData = sisAssignment.sectionHead || sisAssignment.section?.sectionHead;
            if (sectionHeadData && sectionHeadData !== null) {
                const employeeId = sectionHeadData.employeeId || sectionHeadData.teacherId;
                if (employeeId) {
                    const facultyId = await findFacultyByEmployeeId(employeeId);
                    if (facultyId && !hrmsSection.sectionHeadId) {
                        updateData.sectionHeadId = facultyId;
                    } else if (facultyId && hrmsSection.sectionHeadId !== facultyId) {
                        console.log(`[Sync Section Assignments] Section ${sectionName} has different section head in HRMS (${hrmsSection.sectionHeadId}) vs SIS (${facultyId})`);
                    }
                }
            }

            // Update section if there are changes
            if (Object.keys(updateData).length > 0) {
                try {
                    await prisma.classSection.update({
                        where: { id: hrmsSection.id },
                        data: updateData,
                    });

                    updatedCount++;
                    results.push({
                        sectionId: hrmsSection.id,
                        sectionName: hrmsSection.name,
                        status: 'updated',
                        updates: updateData,
                    });
                } catch (error: any) {
                    errorCount++;
                    results.push({
                        sectionId: hrmsSection.id,
                        sectionName: hrmsSection.name,
                        status: 'error',
                        reason: error.message || 'Failed to update section',
                    });
                }
            } else {
                skippedCount++;
                results.push({
                    sectionId: hrmsSection.id,
                    sectionName: hrmsSection.name,
                    status: 'skipped',
                    reason: 'No missing assignments to update',
                });
            }
        }

        console.log(`[Sync Section Assignments] Sync complete: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`);

        return NextResponse.json({
            success: true,
            message: `Sync complete: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`,
            summary: {
                total: sisAssignments.length,
                updated: updatedCount,
                skipped: skippedCount,
                errors: errorCount,
            },
            results,
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Sync Section Assignments] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to sync section assignments from SIS',
        }, { status: 500 });
    }
}
