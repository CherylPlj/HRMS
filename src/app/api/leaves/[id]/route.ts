import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { LeaveStatus, LeaveType } from '@prisma/client';

// Define CORS headers
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function PATCH(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { id } = context.params;
        const leaveId = parseInt(id);

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400, headers: corsHeaders });
        }

        // Get the existing leave request
        const existingLeave = await prisma.leave.findUnique({
            where: { LeaveID: leaveId }
        });

        if (!existingLeave) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404, headers: corsHeaders });
        }

        const body = await request.json();
        const { status } = body;

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be either Approved or Rejected' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (existingLeave.Status !== 'Pending') {
            return NextResponse.json(
                { error: 'Only pending requests can be updated' },
                { status: 400, headers: corsHeaders }
            );
        }

        const start = new Date(body.StartDate);
        const end = new Date(body.EndDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Calculate days for this request
        const requestDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Get all approved leaves for this faculty in the current year (excluding this one)
        const currentYear = new Date().getFullYear();
        const approvedLeaves = await prisma.leave.findMany({
            where: {
                FacultyID: existingLeave.FacultyID,
                Status: 'Approved',
                RequestType: 'Leave',
                LeaveID: {
                    not: leaveId
                },
                StartDate: {
                    gte: new Date(currentYear, 0, 1)
                },
                EndDate: {
                    lte: new Date(currentYear, 11, 31)
                }
            }
        });

        // Calculate total approved days
        const approvedDays = approvedLeaves.reduce((total, leave) => {
            const leaveStart = new Date(leave.StartDate!);
            const leaveEnd = new Date(leave.EndDate!);
            const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
        }, 0);

        // Check if editing this request would exceed 10 days
        if (approvedDays + requestDays > 10) {
            return NextResponse.json(
                { error: `This edit would exceed the annual leave limit of 10 days. You have used ${approvedDays} days and are requesting ${requestDays} more days.` },
                { status: 400, headers: corsHeaders }
            );
        }

        const updatedLeave = await prisma.leave.update({
            where: { LeaveID: leaveId },
            data: {
                Status: status as LeaveStatus,
                UpdatedAt: new Date()
            }
        });

        return NextResponse.json(updatedLeave, { headers: corsHeaders });
    } catch (error) {
        console.error('Error updating leave status:', error);
        return NextResponse.json(
            { error: 'Failed to update leave status', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { id } = context.params;
        const leaveId = parseInt(id);

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400, headers: corsHeaders });
        }

        // Get the existing leave request
        const existingLeave = await prisma.leave.findUnique({
            where: { LeaveID: leaveId }
        });

        if (!existingLeave) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404, headers: corsHeaders });
        }

        if (existingLeave.Status !== 'Pending') {
            return NextResponse.json(
                { error: 'Only pending requests can be updated' },
                { status: 400, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const start = new Date(body.StartDate);
        const end = new Date(body.EndDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Calculate days for this request
        const requestDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Special validation for maternity leave
        if (body.LeaveType === LeaveType.Maternity) {
            // Check if the request is at least 60 days (minimum maternity leave)
            if (requestDays < 60) {
                return NextResponse.json(
                    { error: 'Maternity leave must be at least 60 days' },
                    { status: 400, headers: corsHeaders }
                );
            }
            // Check if there's already a maternity leave request in the current year (excluding this one)
            const currentYear = new Date().getFullYear();
            const existingMaternityLeave = await prisma.leave.findFirst({
                where: {
                    FacultyID: existingLeave.FacultyID,
                    LeaveType: LeaveType.Maternity,
                    LeaveID: {
                        not: leaveId
                    },
                    StartDate: {
                        gte: new Date(currentYear, 0, 1)
                    },
                    EndDate: {
                        lte: new Date(currentYear, 11, 31)
                    }
                }
            });
            if (existingMaternityLeave) {
                return NextResponse.json(
                    { error: 'Only one maternity leave is allowed per year' },
                    { status: 400, headers: corsHeaders }
                );
            }
        } else {
            // For non-maternity leaves, check against the monthly limit
            let currentDate = new Date(start);
            while (currentDate <= end) {
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();

                // Get all approved leaves for this faculty in the current month (excluding this one)
                const approvedLeaves = await prisma.leave.findMany({
                    where: {
                        FacultyID: existingLeave.FacultyID,
                        Status: 'Approved',
                        RequestType: 'Leave',
                        LeaveType: {
                            not: LeaveType.Maternity // Exclude maternity leaves from the count
                        },
                        LeaveID: {
                            not: leaveId
                        },
                        AND: [
                            {
                                StartDate: {
                                    lte: new Date(currentYear, currentMonth + 1, 0) // Last day of current month
                                }
                            },
                            {
                                EndDate: {
                                    gte: new Date(currentYear, currentMonth, 1) // First day of current month
                                }
                            }
                        ]
                    }
                });

                // Calculate days used in this month
                const daysUsedInMonth = approvedLeaves.reduce((total, leave) => {
                    const leaveStart = new Date(Math.max(
                        new Date(leave.StartDate!).getTime(),
                        new Date(currentYear, currentMonth, 1).getTime()
                    ));
                    const leaveEnd = new Date(Math.min(
                        new Date(leave.EndDate!).getTime(),
                        new Date(currentYear, currentMonth + 1, 0).getTime()
                    ));
                    const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return total + days;
                }, 0);

                // Calculate days requested for this month
                const monthStart = new Date(currentYear, currentMonth, 1);
                const monthEnd = new Date(currentYear, currentMonth + 1, 0);
                const requestStart = new Date(Math.max(start.getTime(), monthStart.getTime()));
                const requestEnd = new Date(Math.min(end.getTime(), monthEnd.getTime()));
                const daysRequestedInMonth = Math.ceil((requestEnd.getTime() - requestStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                // Check if editing this request would exceed 10 days for this month
                if (daysUsedInMonth + daysRequestedInMonth > 10) {
                    const monthName = monthStart.toLocaleString('default', { month: 'long' });
                    return NextResponse.json(
                        { error: `This edit would exceed the monthly leave limit of 10 days for ${monthName}. You have used ${daysUsedInMonth} days and are requesting ${daysRequestedInMonth} more days.` },
                        { status: 400, headers: corsHeaders }
                    );
                }

                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1);
            }
        }

        const updatedLeave = await prisma.leave.update({
            where: { LeaveID: leaveId },
            data: {
                RequestType: body.RequestType,
                LeaveType: body.LeaveType,
                StartDate: new Date(body.StartDate),
                EndDate: new Date(body.EndDate),
                TimeIn: body.TimeIn ? new Date(body.TimeIn) : null,
                TimeOut: body.TimeOut ? new Date(body.TimeOut) : null,
                Reason: body.Reason,
                UpdatedAt: new Date()
            }
        });

        return NextResponse.json(updatedLeave, { headers: corsHeaders });
    } catch (error) {
        console.error('Error updating leave request:', error);
        return NextResponse.json(
            { error: 'Failed to update leave request', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { id } = context.params;
        const leaveId = parseInt(id);

        if (isNaN(leaveId)) {
            return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400, headers: corsHeaders });
        }

        // Get the existing leave request
        const existingLeave = await prisma.leave.findUnique({
            where: { LeaveID: leaveId }
        });

        if (!existingLeave) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404, headers: corsHeaders });
        }

        if (existingLeave.Status !== 'Pending') {
            return NextResponse.json(
                { error: 'Only pending requests can be deleted' },
                { status: 400, headers: corsHeaders }
            );
        }

        await prisma.leave.delete({
            where: { LeaveID: leaveId }
        });

        return NextResponse.json({ message: 'Leave request deleted successfully' }, { headers: corsHeaders });
    } catch (error) {
        console.error('Error deleting leave request:', error);
        return NextResponse.json(
            { error: 'Failed to delete leave request', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500, headers: corsHeaders }
        );
    }
} 