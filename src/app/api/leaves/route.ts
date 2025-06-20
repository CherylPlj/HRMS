import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import type { Leave, Faculty, User, Department } from '@/generated/prisma';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

type LeaveWithRelations = Leave & {
    Faculty: (Faculty & {
        User: Pick<User, 'FirstName' | 'LastName' | 'UserID'> | null;
        Department: Pick<Department, 'DepartmentName'> | null;
    }) | null;
};

const validLeaveTypes = ['Sick', 'Vacation', 'Emergency'];
const validEmploymentTypes = ['Regular', 'Under Probation'];
const validRequestTypes = ['Leave', 'Undertime'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('Leave')
      .select(`
        *,
        Faculty!inner (
          FacultyID,
          UserID,
          User!inner (
            FirstName,
            LastName,
            UserID
          ),
          Department!inner (
            DepartmentName
          )
        )
      `, { count: 'exact' })
      .order('CreatedAt', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute query
    const { data: leaves, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform the data
    const transformedLeaves = leaves?.map(leave => ({
      ...leave,
      Faculty: {
        Name: `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}`,
        Department: leave.Faculty.Department.DepartmentName,
        UserID: leave.Faculty.User.UserID
      }
    })) || [];

    return NextResponse.json({
      leaves: transformedLeaves,
      total: count || 0,
      page,
      pageSize
    });

  } catch (error) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves data' },
      { status: 500 }
    );
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
        console.log('Received request body:', JSON.stringify(body, null, 2));

        const { 
            FacultyID,
            requestType,
            Reason,
            employeeSignature,
            departmentHeadSignature
        } = body;

        // Validate common required fields
        if (!FacultyID || !requestType || !Reason || !employeeSignature || !departmentHeadSignature) {
            const missingFields = [];
            if (!FacultyID) missingFields.push('FacultyID');
            if (!requestType) missingFields.push('requestType');
            if (!Reason) missingFields.push('Reason');
            if (!employeeSignature) missingFields.push('Employee Signature');
            if (!departmentHeadSignature) missingFields.push('Department Head Signature');
            
            console.error('Missing required fields:', missingFields);
            return NextResponse.json(
                { error: `Missing required fields: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate request type
        if (!validRequestTypes.includes(requestType)) {
            console.error('Invalid request type:', requestType);
            return NextResponse.json(
                { error: `Invalid request type. Must be one of: ${validRequestTypes.join(', ')}` },
                { status: 400 }
            );
        }

        if (requestType === 'Leave') {
            const { LeaveType, StartDate, EndDate, EmploymentType } = body;

            // Validate leave-specific fields
            if (!LeaveType || !StartDate || !EndDate || !EmploymentType) {
                const missingFields = [];
                if (!LeaveType) missingFields.push('LeaveType');
                if (!StartDate) missingFields.push('StartDate');
                if (!EndDate) missingFields.push('EndDate');
                if (!EmploymentType) missingFields.push('EmploymentType');
                
                console.error('Missing leave-specific fields:', missingFields);
                return NextResponse.json(
                    { error: `Missing required fields: ${missingFields.join(', ')}` },
                    { status: 400 }
                );
            }

            // Validate employment type
            if (!validEmploymentTypes.includes(EmploymentType)) {
                console.error('Invalid employment type:', EmploymentType);
                return NextResponse.json(
                    { error: `Invalid employment type. Must be one of: ${validEmploymentTypes.join(', ')}` },
                    { status: 400 }
                );
            }

            // Validate leave type
            if (!validLeaveTypes.includes(LeaveType)) {
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

            // Create leave request
            const leaveRequest = await prisma.leave.create({
                data: {
                    FacultyID,
                    LeaveType,
                    StartDate: new Date(StartDate),
                    EndDate: new Date(EndDate),
                    Reason,
                    Status: LeaveStatus.Pending,
                    EmploymentType,
                    employeeSignature: employeeSignature,
                    departmentHeadSignature: departmentHeadSignature,
                }
            });

            return NextResponse.json(leaveRequest);
        } else if (requestType === 'Undertime') {
            const { TimeIn, TimeOut } = body;

            // Validate undertime-specific fields
            if (!TimeIn || !TimeOut) {
                const missingFields = [];
                if (!TimeIn) missingFields.push('TimeIn');
                if (!TimeOut) missingFields.push('TimeOut');
                
                console.error('Missing undertime-specific fields:', missingFields);
                return NextResponse.json(
                    { error: `Missing required fields: ${missingFields.join(', ')}` },
                    { status: 400 }
                );
            }

            // Validate times
            const timeIn = new Date(TimeIn);
            const timeOut = new Date(TimeOut);
            if (isNaN(timeIn.getTime()) || isNaN(timeOut.getTime())) {
                console.error('Invalid time format:', { TimeIn, TimeOut });
                return NextResponse.json(
                    { error: 'Invalid time format' },
                    { status: 400 }
                );
            }

            // Create undertime request
            const undertimeRequest = await prisma.leave.create({
                data: {
                    FacultyID,
                    LeaveType: null,
                    StartDate: timeIn,
                    EndDate: timeOut,
                    TimeIn: timeIn.toISOString(),
                    TimeOut: timeOut.toISOString(),
                    Reason,
                    Status: LeaveStatus.Pending,
                    EmploymentType: 'Regular',  // Default for undertime
                    employeeSignature: employeeSignature,
                    departmentHeadSignature: departmentHeadSignature,
                    requestType: 'Undertime'  // Explicitly set to "Undertime"
                }
            });

            return NextResponse.json(undertimeRequest);
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                error: 'Failed to process request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}