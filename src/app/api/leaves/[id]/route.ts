import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        console.log('Attempting to delete leave with ID:', id);
        
        const leave = await prisma.leave.delete({
            where: {
                LeaveID: parseInt(id)
            }
        });

        console.log('Successfully deleted leave:', leave);
        return NextResponse.json({ message: 'Leave deleted successfully' });
    } catch (error) {
        console.error('Error in delete leave API:', error);
        // Handle Prisma-specific errors
        if (error instanceof Error) {
            if (error.message.includes('Record to delete does not exist')) {
                return NextResponse.json(
                    { error: 'Leave record not found' },
                    { status: 404 }
                );
            }
            if (error.message.includes('prisma')) {
                return NextResponse.json(
                    { error: 'Database error', details: error.message },
                    { status: 500 }
                );
            }
        }
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    } finally {
        // Ensure connection cleanup in development
        if (process.env.NODE_ENV === 'development') {
            await prisma.$disconnect();
        }
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { status } = await request.json();
        console.log('Received status update request:', { id, status });

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        const leave = await prisma.leave.update({
            where: {
                LeaveID: parseInt(id)
            },
            data: {
                Status: status,
                UpdatedAt: new Date()
            }
        });

        console.log('Successfully updated leave status:', leave);
        return NextResponse.json({ message: 'Leave status updated successfully' });
    } catch (error) {
        console.error('Error in update leave status API:', error);
        // Handle Prisma-specific errors
        if (error instanceof Error) {
            if (error.message.includes('Record to update does not exist')) {
                return NextResponse.json(
                    { error: 'Leave record not found' },
                    { status: 404 }
                );
            }
            if (error.message.includes('prisma')) {
                return NextResponse.json(
                    { error: 'Database error', details: error.message },
                    { status: 500 }
                );
            }
        }
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    } finally {
        // Ensure connection cleanup in development
        if (process.env.NODE_ENV === 'development') {
            await prisma.$disconnect();
        }
    }
} 