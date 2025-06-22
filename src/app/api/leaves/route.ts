import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { LeaveStatus, LeaveType, RequestType } from '@prisma/client';
import type { Leave, Faculty, User, Department } from '@/generated/prisma';

// Define a type for the transformed leave record
type TransformedLeave = Leave & {
    Faculty: {
        Name: string;
        Department: string;
        UserID: string | null;
    };
};

interface UserRole {
    role: {
        name: string;
    };
}

// Define CORS headers
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        // Fetch all leaves with faculty and department information
        const leaves = await prisma.leave.findMany({
            include: {
                Faculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                UserID: true,
                            }
                        },
                        Department: {
                            select: {
                                DepartmentName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                CreatedAt: 'desc'
            }
        });

        // Transform the data to match the frontend structure
        const transformedLeaves = leaves.map(leave => ({
            ...leave,
            Faculty: {
                Name: leave.Faculty?.User ? 
                    `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}` : 
                    'Unknown',
                Department: leave.Faculty?.Department?.DepartmentName || 'Unknown',
                UserID: leave.Faculty?.User?.UserID || null
            }
        }));

        return NextResponse.json(transformedLeaves, { headers: corsHeaders });
    } catch (error) {
        console.error('Error fetching leaves:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leaves', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500, headers: corsHeaders }
        );
    } finally {
        await prisma.$disconnect();
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            console.error('Unauthorized request - no userId');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Ensure the request has a JSON content type
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Invalid content type:', contentType);
            return NextResponse.json(
                { error: 'Content-Type must be application/json' },
                { status: 400 }
            );
        }

        const body = await request.json();
        console.log('Received leave request body:', JSON.stringify(body, null, 2));

        const { 
            FacultyID, 
            RequestType, 
            LeaveType, 
            StartDate, 
            EndDate, 
            TimeIn,
            TimeOut,
            Reason, 
            employeeSignature,
            departmentHeadSignature 
        } = body;

        // Validate required fields
        if (!FacultyID || !LeaveType || !StartDate || !EndDate || !Reason) {
            const missingFields = [];
            if (!FacultyID) missingFields.push('FacultyID');
            if (!LeaveType) missingFields.push('LeaveType');
            if (!StartDate) missingFields.push('StartDate');
            if (!EndDate) missingFields.push('EndDate');
            if (!Reason) missingFields.push('Reason');
            
            console.error('Missing required fields:', missingFields);
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate leave type
        const validLeaveTypes = ['Sick', 'Vacation', 'Emergency'];
        if (LeaveType && !validLeaveTypes.includes(LeaveType)) {
            console.error('Invalid leave type:', LeaveType);
            return NextResponse.json(
                { error: `Invalid leave type. Must be one of: ${validLeaveTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate dates
        const start = new Date(StartDate);
        const end = new Date(EndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.error('Invalid date format:', { StartDate, EndDate });
            return NextResponse.json(
                { error: 'Invalid date format' },
                { status: 400 }
            );
        }

        if (start > end) {
            console.error('Invalid date range:', { start, end });
            return NextResponse.json(
                { error: 'Start date must be before end date' },
                { status: 400 }
            );
        }

        // Log the data we're about to insert
        const leaveData = {
            FacultyID: Number(FacultyID),
            RequestType: RequestType as RequestType,
            LeaveType: LeaveType as LeaveType,
            StartDate: start,
            EndDate: end,
            TimeIn: TimeIn ? new Date(TimeIn) : null,
            TimeOut: TimeOut ? new Date(TimeOut) : null,
            Reason,
            Status: 'Pending' as LeaveStatus,
            employeeSignature,
            departmentHeadSignature,
            CreatedAt: new Date(),
            UpdatedAt: new Date()
        };
        console.log('Attempting to create leave with data:', JSON.stringify(leaveData, null, 2));

        // Create leave request using Prisma
        const leave = await prisma.leave.create({
            data: leaveData
        });

        // Log the activity
        // await prisma.activityLog.create({
        //     data: {
        //         UserID: userId,
        //         ActionType: 'leave_request_created',
        //         EntityAffected: 'Leave',
        //         ActionDetails: `Created leave request for faculty ID ${FacultyID}`,
        //         Timestamp: new Date(),
        //         IPAddress: request.headers.get('x-forwarded-for') || 'unknown'
        //     }
        // });

        console.log('Successfully created leave request:', JSON.stringify(leave, null, 2));
        return NextResponse.json(leave);
    } catch (error) {
        console.error('Detailed error in create leave API:', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        
        // Check for specific Prisma errors
        if (error instanceof Error) {
            if (error.message.includes('foreign key constraint')) {
                return NextResponse.json(
                    { error: 'Invalid faculty information', details: error.message },
                    { status: 400 }
                );
            }
            if (error.message.includes('unique constraint')) {
                return NextResponse.json(
                    { error: 'A leave request already exists for this period', details: error.message },
                    { status: 400 }
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
            { error: 'Failed to submit leave request', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}