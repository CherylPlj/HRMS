import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { LeaveStatus } from '@prisma/client';

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