import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timeRangesOverlap } from '@/lib/timeUtils';

/**
 * GET /api/schedules/fetch-from-sis/available-teachers
 * Get available (vacant) teachers for a specific schedule time slot
 * Query params: day, time, excludeFacultyId (optional)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const day = searchParams.get('day');
        const time = searchParams.get('time');
        const excludeFacultyId = searchParams.get('excludeFacultyId');

        if (!day || !time) {
            return NextResponse.json(
                { error: 'Missing required parameters: day and time' },
                { status: 400 }
            );
        }

        // Get all active faculties
        const allFaculties = await prisma.faculty.findMany({
            where: {
                isDeleted: false,
                User: {
                    Status: 'Active',
                },
                EmploymentStatus: {
                    notIn: ['Resigned', 'Retired'],
                },
            },
            include: {
                User: {
                    select: {
                        FirstName: true,
                        LastName: true,
                        Email: true,
                        Status: true,
                    },
                },
                Employee: {
                    select: {
                        EmployeeID: true,
                        employmentDetails: {
                            select: {
                                Designation: true,
                            },
                        },
                    },
                },
                Schedules: {
                    where: {
                        day: day,
                    },
                    select: {
                        time: true,
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
                    },
                },
                _count: {
                    select: {
                        Schedules: true,
                    },
                },
            },
        });

        // Filter faculties that are available (no schedule conflict, not on leave)
        const availableFaculties = allFaculties
            .filter((faculty) => {
                // Exclude if specified
                if (excludeFacultyId && faculty.FacultyID === parseInt(excludeFacultyId)) {
                    return false;
                }

                // Exclude if on approved leave
                if (faculty.Leaves.length > 0) {
                    return false;
                }

                // Check for schedule conflicts on the same day
                const hasConflict = faculty.Schedules.some((schedule) => 
                    timeRangesOverlap(schedule.time, time)
                );

                return !hasConflict;
            })
            .map((faculty) => ({
                FacultyID: faculty.FacultyID,
                EmployeeID: faculty.EmployeeID,
                Position: faculty.Position,
                User: faculty.User,
                Employee: faculty.Employee,
                currentLoad: faculty._count.Schedules,
            }));

        return NextResponse.json({
            success: true,
            availableTeachers: availableFaculties,
            total: availableFaculties.length,
        });
    } catch (error) {
        console.error('Error fetching available teachers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch available teachers' },
            { status: 500 }
        );
    }
}
