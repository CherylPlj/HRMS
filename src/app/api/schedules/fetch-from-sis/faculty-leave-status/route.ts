import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/schedules/fetch-from-sis/faculty-leave-status
 * Get leave status for one or more faculties
 * Query params: facultyIds (comma-separated)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const facultyIdsParam = searchParams.get('facultyIds');

        if (!facultyIdsParam) {
            return NextResponse.json(
                { error: 'Missing required parameter: facultyIds' },
                { status: 400 }
            );
        }

        const facultyIds = facultyIdsParam
            .split(',')
            .map((id) => parseInt(id.trim()))
            .filter((id) => !isNaN(id));

        if (facultyIds.length === 0) {
            return NextResponse.json(
                { error: 'Invalid facultyIds parameter' },
                { status: 400 }
            );
        }

        // Get all faculties with their approved leaves
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const faculties = await prisma.faculty.findMany({
            where: {
                FacultyID: {
                    in: facultyIds,
                },
            },
            include: {
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
                },
            },
        });

        // Map to leave status per faculty
        const leaveStatusMap: Record<number, {
            isOnLeave: boolean;
            leave: {
                LeaveID: number;
                LeaveType: string | null;
                StartDate: Date | null;
                EndDate: Date | null;
                Reason: string;
            } | null;
        }> = {};

        faculties.forEach((faculty) => {
            leaveStatusMap[faculty.FacultyID] = {
                isOnLeave: faculty.Leaves.length > 0,
                leave: faculty.Leaves.length > 0 ? faculty.Leaves[0] : null,
            };
        });

        return NextResponse.json({
            success: true,
            leaveStatus: leaveStatusMap,
        });
    } catch (error) {
        console.error('Error fetching faculty leave status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch faculty leave status' },
            { status: 500 }
        );
    }
}
