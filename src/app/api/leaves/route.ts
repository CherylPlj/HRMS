import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLeaveRequestNotification } from '@/lib/notifications';

const prisma = new PrismaClient();

// Define a type for the leave record with related data
interface LeaveWithRelations {
    LeaveID: number;
    LeaveType: string;
    StartDate: Date;
    EndDate: Date;
    Reason: string;
    Status: string;
    DocumentUrl: string | null;
    CreatedAt: Date;
    UpdatedAt: Date;
    Faculty: {
        User: {
            FirstName: string;
            LastName: string;
            Photo: string | null;
        };
    };
}

// GET /api/leaves - Get all leave requests
export async function GET() {
    try {
        const leaves = await prisma.leave.findMany({
            include: {
                Faculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Photo: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                CreatedAt: 'desc',
            },
        });

        // Transform the data to match the frontend structure
        const transformedLeaves = leaves.map((leave: LeaveWithRelations) => ({
            leaveId: leave.LeaveID,
            employeeName: `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}`,
            leaveType: leave.LeaveType,
            startDate: leave.StartDate,
            endDate: leave.EndDate,
            reason: leave.Reason,
            status: leave.Status,
            documentUrl: leave.DocumentUrl,
            createdAt: leave.CreatedAt,
            updatedAt: leave.UpdatedAt,
            photo: leave.Faculty.User.Photo,
        }));

        return NextResponse.json(transformedLeaves);
    } catch (error) {
        console.error('Error in leave API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// POST /api/leaves - Create a new leave request
export async function POST(request: Request) {
    try {
        const { facultyId, leaveType, startDate, endDate, reason, documentUrl } = await request.json();

        // Create the leave request
        const leave = await prisma.leave.create({
            data: {
                FacultyID: facultyId,
                LeaveType: leaveType,
                StartDate: new Date(startDate),
                EndDate: new Date(endDate),
                Reason: reason,
                DocumentUrl: documentUrl,
                Status: 'Pending',
            },
            include: {
                Faculty: {
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

        // Find admin user to send notification to
        const adminUser = await prisma.user.findFirst({
            where: {
                Role: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });

        if (adminUser) {
            try {
                await createLeaveRequestNotification({
                    facultyId,
                    adminId: adminUser.UserID,
                    status: 'REQUESTED'
                });
            } catch (notificationError) {
                console.error('Error creating notification:', notificationError);
                // Don't fail the request if notification fails
            }
        }

        return NextResponse.json(leave, { status: 201 });
    } catch (error) {
        console.error('Error creating leave request:', error);
        return NextResponse.json(
            { error: 'Failed to create leave request' },
            { status: 500 }
        );
    }
}

// PATCH /api/leaves/[id] - Update leave request status
export async function PATCH(request: Request) {
    try {
        const { id, status } = await request.json();

        const leave = await prisma.leave.update({
            where: {
                LeaveID: id,
            },
            data: {
                Status: status,
            },
            include: {
                Faculty: {
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

        // Send notification to faculty member
        try {
            await createLeaveRequestNotification({
                facultyId: leave.FacultyID,
                adminId: '', // Not needed for status updates
                status: status === 'Approved' ? 'APPROVED' : 'REJECTED'
            });
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json(leave);
    } catch (error) {
        console.error('Error updating leave request:', error);
        return NextResponse.json(
            { error: 'Failed to update leave request' },
            { status: 500 }
        );
    }
}