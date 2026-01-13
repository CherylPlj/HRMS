import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncAssignmentToSIS } from '@/lib/sisSync';

/**
 * POST /api/schedules/fetch-from-sis/restore-original-teacher
 * Restores the original teacher to a schedule when their leave has ended
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hrmsScheduleId, originalFacultyId, sisScheduleId } = body;

        if (!hrmsScheduleId || !originalFacultyId) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: hrmsScheduleId, originalFacultyId',
            }, { status: 400 });
        }

        // Verify the original faculty exists
        const originalFaculty = await prisma.faculty.findUnique({
            where: { FacultyID: originalFacultyId },
            include: {
                User: {
                    select: {
                        FirstName: true,
                        LastName: true,
                    },
                },
            },
        });

        if (!originalFaculty) {
            return NextResponse.json({
                success: false,
                error: 'Original faculty not found',
            }, { status: 404 });
        }

        // Get the current schedule
        const currentSchedule = await prisma.schedules.findUnique({
            where: { id: hrmsScheduleId },
            include: {
                faculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!currentSchedule) {
            return NextResponse.json({
                success: false,
                error: 'Schedule not found',
            }, { status: 404 });
        }

        // Update the schedule to use the original faculty
        const updatedSchedule = await prisma.schedules.update({
            where: { id: hrmsScheduleId },
            data: {
                facultyId: originalFacultyId,
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
        const employeeId = originalFaculty.EmployeeID;
        let syncResult = null;
        
        if (employeeId && sisScheduleId) {
            try {
                syncResult = await syncAssignmentToSIS({
                    scheduleId: sisScheduleId,
                    employeeId: employeeId,
                    assigned: true,
                });
            } catch (syncError) {
                console.warn('Failed to sync restoration to SIS:', syncError);
                // Continue even if sync fails
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Original teacher restored successfully',
            schedule: updatedSchedule,
            sync: syncResult || undefined,
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error restoring original teacher:', error);
        
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to restore original teacher',
        }, { status: 500 });
    }
}
