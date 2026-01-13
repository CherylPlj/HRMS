import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper function to fetch schedules from enrollment system
async function fetchSchedulesFromEnrollmentSystem() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    if (!SHARED_SECRET) {
        throw new Error('Missing required environment variable: SJSFI_SHARED_SECRET');
    }
    
    if (!API_KEY) {
        throw new Error('Missing required environment variable: SJSFI_HRMS_API_KEY');
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
 * GET /api/sync/subjects-sections-from-sis
 * Extracts unique subjects and sections from SIS schedules (preview only, no changes)
 */
export async function GET() {
    try {
        const sisData = await fetchSchedulesFromEnrollmentSystem();
        
        if (!sisData || !sisData.data) {
            return NextResponse.json({
                success: false,
                error: 'No schedule data received from SIS',
            }, { status: 404 });
        }

        const sisSchedules = sisData.data || [];
        
        // Extract unique subjects
        const subjectsMap = new Map();
        const sectionsMap = new Map();

        for (const schedule of sisSchedules) {
            const subjectData = schedule.subject || {};
            const sectionData = schedule.section || {};
            const yearLevelData = schedule.yearLevel || {};

            // Collect unique subjects
            if (subjectData.id && subjectData.name) {
                const subjectKey = subjectData.id;
                if (!subjectsMap.has(subjectKey)) {
                    subjectsMap.set(subjectKey, {
                        sisId: subjectData.id,
                        name: subjectData.name,
                        code: subjectData.code || null,
                    });
                }
            }

            // Collect unique sections
            if (sectionData.id && sectionData.name) {
                const sectionKey = sectionData.id;
                if (!sectionsMap.has(sectionKey)) {
                    sectionsMap.set(sectionKey, {
                        sisId: sectionData.id,
                        name: sectionData.name,
                        capacity: sectionData.capacity || null,
                        gradeLevel: yearLevelData?.name || null,
                    });
                }
            }
        }

        const uniqueSubjects = Array.from(subjectsMap.values());
        const uniqueSections = Array.from(sectionsMap.values());

        return NextResponse.json({
            success: true,
            preview: true,
            subjects: {
                count: uniqueSubjects.length,
                data: uniqueSubjects,
            },
            sections: {
                count: uniqueSections.length,
                data: uniqueSections,
            },
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching subjects/sections from SIS:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch data from SIS',
        }, { status: 500 });
    }
}

/**
 * POST /api/sync/subjects-sections-from-sis
 * Syncs subjects and sections from SIS to HRMS
 * Body: { clearExisting: boolean } - if true, clears all existing subjects/sections before importing
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clearExisting = false } = body;

        // Fetch data from SIS
        const sisData = await fetchSchedulesFromEnrollmentSystem();
        
        if (!sisData || !sisData.data) {
            return NextResponse.json({
                success: false,
                error: 'No schedule data received from SIS',
            }, { status: 404 });
        }

        const sisSchedules = sisData.data || [];
        
        // Extract unique subjects and sections
        const subjectsMap = new Map();
        const sectionsMap = new Map();

        for (const schedule of sisSchedules) {
            const subjectData = schedule.subject || {};
            const sectionData = schedule.section || {};
            const yearLevelData = schedule.yearLevel || {};

            // Collect unique subjects
            if (subjectData.id && subjectData.name) {
                const subjectKey = subjectData.id;
                if (!subjectsMap.has(subjectKey)) {
                    subjectsMap.set(subjectKey, {
                        sisId: subjectData.id,
                        name: subjectData.name,
                        code: subjectData.code || null,
                    });
                }
            }

            // Collect unique sections
            if (sectionData.id && sectionData.name) {
                const sectionKey = sectionData.id;
                if (!sectionsMap.has(sectionKey)) {
                    sectionsMap.set(sectionKey, {
                        sisId: sectionData.id,
                        name: sectionData.name,
                        capacity: sectionData.capacity || null,
                        gradeLevel: yearLevelData?.name || null,
                    });
                }
            }
        }

        const uniqueSubjects = Array.from(subjectsMap.values());
        const uniqueSections = Array.from(sectionsMap.values());

        const results = {
            subjects: { created: 0, updated: 0, deleted: 0, errors: [] as any[] },
            sections: { created: 0, updated: 0, deleted: 0, errors: [] as any[] },
        };

        // Clear unused subjects and sections if requested
        if (clearExisting) {
            try {
                // Get all subjects and sections that exist in HRMS
                const existingSubjects = await prisma.subject.findMany({
                    include: {
                        schedules: true,
                    },
                });

                const existingSections = await prisma.classSection.findMany({
                    include: {
                        schedules: true,
                    },
                });

                // Collect SIS subject names and section names
                const sisSubjectNames = new Set(uniqueSubjects.map(s => s.name));
                const sisSectionNames = new Set(uniqueSections.map(s => s.name));

                // Delete subjects that are not in SIS and not used by any schedules
                for (const subject of existingSubjects) {
                    if (!sisSubjectNames.has(subject.name) && subject.schedules.length === 0) {
                        try {
                            await prisma.subject.delete({
                                where: { id: subject.id },
                            });
                            results.subjects.deleted++;
                        } catch (error) {
                            results.subjects.errors.push({
                                subject: subject.name,
                                error: error instanceof Error ? error.message : 'Failed to delete',
                            });
                        }
                    }
                }

                // Delete sections that are not in SIS and not used by any schedules
                for (const section of existingSections) {
                    if (!sisSectionNames.has(section.name) && section.schedules.length === 0) {
                        try {
                            await prisma.classSection.delete({
                                where: { id: section.id },
                            });
                            results.sections.deleted++;
                        } catch (error) {
                            results.sections.errors.push({
                                section: section.name,
                                error: error instanceof Error ? error.message : 'Failed to delete',
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error clearing existing data:', error);
                // Continue with import even if clearing fails
            }
        }

        // Import/Update Subjects
        for (const subject of uniqueSubjects) {
            try {
                // Check if subject exists
                const existing = await prisma.subject.findUnique({
                    where: { name: subject.name },
                });

                await prisma.subject.upsert({
                    where: { name: subject.name },
                    update: {
                        code: subject.code || undefined,
                        isActive: true,
                    },
                    create: {
                        name: subject.name,
                        code: subject.code || undefined,
                        isActive: true,
                    },
                });

                if (existing) {
                    results.subjects.updated++;
                } else {
                    results.subjects.created++;
                }
            } catch (error: any) {
                // If it's a unique constraint error on code, try updating by code
                if (error.code === 'P2002' && subject.code) {
                    try {
                        await prisma.subject.update({
                            where: { code: subject.code },
                            data: {
                                name: subject.name,
                                isActive: true,
                            },
                        });
                        results.subjects.updated++;
                    } catch (updateError) {
                        results.subjects.errors.push({
                            subject,
                            error: updateError instanceof Error ? updateError.message : 'Unknown error',
                        });
                    }
                } else {
                    results.subjects.errors.push({
                        subject,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }

        // Import/Update Sections
        for (const section of uniqueSections) {
            try {
                // Check if section exists
                const existing = await prisma.classSection.findUnique({
                    where: { name: section.name },
                });

                await prisma.classSection.upsert({
                    where: { name: section.name },
                    update: {
                        capacity: section.capacity || undefined,
                        gradeLevel: section.gradeLevel || undefined,
                        isActive: true,
                    },
                    create: {
                        name: section.name,
                        capacity: section.capacity || undefined,
                        gradeLevel: section.gradeLevel || undefined,
                        isActive: true,
                    },
                });

                if (existing) {
                    results.sections.updated++;
                } else {
                    results.sections.created++;
                }
            } catch (error: any) {
                results.sections.errors.push({
                    section,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Subjects and sections synced from SIS',
            results: {
                subjects: {
                    total: uniqueSubjects.length,
                    created: results.subjects.created,
                    updated: results.subjects.updated,
                    errors: results.subjects.errors.length,
                },
                sections: {
                    total: uniqueSections.length,
                    created: results.sections.created,
                    updated: results.sections.updated,
                    errors: results.sections.errors.length,
                },
            },
            errors: {
                subjects: results.subjects.errors,
                sections: results.sections.errors,
            },
        }, { status: 200 });

    } catch (error) {
        console.error('Error syncing subjects/sections from SIS:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to sync data from SIS',
        }, { status: 500 });
    }
}
