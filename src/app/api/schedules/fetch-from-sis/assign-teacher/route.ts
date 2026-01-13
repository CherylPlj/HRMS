import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncAssignmentToSIS } from '@/lib/sisSync';

/**
 * POST /api/schedules/fetch-from-sis/assign-teacher
 * Assigns a teacher to a SIS schedule and creates/updates it in HRMS
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sisScheduleId, facultyId, subjectId, classSectionId, day, time, duration } = body;

        if (!facultyId || !subjectId || !classSectionId || !day || !time) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: facultyId, subjectId, classSectionId, day, time',
            }, { status: 400 });
        }

        // Validate time format (should be "HH:MM-HH:MM")
        if (!time.match(/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid time format. Expected format: "HH:MM-HH:MM"',
            }, { status: 400 });
        }

        // Verify faculty exists and get Employee ID
        const faculty = await prisma.faculty.findUnique({
            where: { FacultyID: facultyId },
            include: {
                User: {
                    select: {
                        FirstName: true,
                        LastName: true,
                    },
                },
            },
        });

        if (!faculty) {
            return NextResponse.json({
                success: false,
                error: 'Faculty not found',
            }, { status: 404 });
        }

        // Verify subject exists
        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
        });

        if (!subject) {
            return NextResponse.json({
                success: false,
                error: 'Subject not found',
            }, { status: 404 });
        }

        // Verify section exists
        const classSection = await prisma.classSection.findUnique({
            where: { id: classSectionId },
        });

        if (!classSection) {
            return NextResponse.json({
                success: false,
                error: 'Class section not found',
            }, { status: 404 });
        }

        // Create schedule in HRMS
        const schedule = await prisma.schedules.create({
            data: {
                facultyId,
                subjectId,
                classSectionId,
                day,
                time,
                duration: duration || 1,
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
                    },
                },
                subject: true,
                classSection: true,
            },
        });

        // Sync to SIS (if enabled and endpoint available)
        const employeeId = faculty.EmployeeID;
        let syncResult = null;
        
        if (employeeId && sisScheduleId) {
            syncResult = await syncAssignmentToSIS({
                scheduleId: sisScheduleId,
                employeeId: employeeId,
                assigned: true,
            });
        }

        // Build response message
        let message = 'Teacher assigned successfully';
        if (syncResult) {
            if (syncResult.synced) {
                message += ' and synced to SIS';
            } else if (syncResult.message) {
                // Include sync status in response but don't fail the request
                message += ` (${syncResult.message})`;
            }
        }

        return NextResponse.json({
            success: true,
            message,
            schedule,
            sync: syncResult || undefined, // Include sync result if available
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error assigning teacher to schedule:', error);
        
        // Handle unique constraint violations (duplicate schedules)
        if (error.code === 'P2002') {
            return NextResponse.json({
                success: false,
                error: 'Schedule already exists. This schedule may have already been assigned.',
            }, { status: 409 });
        }

        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to assign teacher',
        }, { status: 500 });
    }
}
