import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { LeaveStatus, LeaveType, RequestType, Leave, User, Department, Faculty } from '@prisma/client';
import { sendEmail, generateLeaveRequestAdminNotificationEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

        // Validate leave type - fetch from database
        // Note: Using Supabase directly since LeaveTypes might have IsActive field in Supabase but not in Prisma schema
        try {
            const { data: leaveTypesFromDB, error: leaveTypesError } = await supabaseAdmin
                .from('LeaveTypes')
                .select('LeaveTypeName, IsActive')
                .order('LeaveTypeName', { ascending: true });

            if (leaveTypesError) {
                console.error('Error fetching leave types for validation:', leaveTypesError);
                // Fallback to enum validation if database fetch fails
                const validLeaveTypes = ['Sick', 'Vacation', 'Emergency', 'Maternity', 'Paternity'];
                if (LeaveType && !validLeaveTypes.includes(LeaveType)) {
                    return NextResponse.json(
                        { error: `Invalid leave type. Must be one of: ${validLeaveTypes.join(', ')}` },
                        { status: 400 }
                    );
                }
            } else {
                // Filter active leave types (IsActive is not false)
                const activeLeaveTypes = (leaveTypesFromDB || []).filter((lt: any) => lt.IsActive !== false);
                
                // Extract base names (remove " Leave" suffix if present) for validation
                const validLeaveTypeNames = activeLeaveTypes.map((lt: any) => {
                    const name = lt.LeaveTypeName.trim();
                    // Remove " Leave" suffix if present (case-insensitive)
                    if (name.toLowerCase().endsWith(' leave')) {
                        return name.slice(0, -6).trim(); // Remove " leave" (6 characters)
                    }
                    return name;
                });

                if (LeaveType && !validLeaveTypeNames.includes(LeaveType)) {
                    console.error('Invalid leave type:', LeaveType, 'Valid types:', validLeaveTypeNames);
                    return NextResponse.json(
                        { error: `Invalid leave type. Must be one of: ${validLeaveTypeNames.join(', ')}` },
                        { status: 400 }
                    );
                }
            }
        } catch (error) {
            console.error('Error validating leave type:', error);
            // Fallback to basic validation
            if (!LeaveType || LeaveType.trim() === '') {
                return NextResponse.json(
                    { error: 'Leave type is required' },
                    { status: 400 }
                );
            }
        }

        // Validate gender-specific leave types
        const leaveTypeLower = LeaveType.toLowerCase();
        // Check if it's a gender-neutral leave type (available to both genders)
        const isTransferredMaternity = leaveTypeLower.includes('transferred') && leaveTypeLower.includes('maternity');
        const isSoloParent = leaveTypeLower.includes('solo') && leaveTypeLower.includes('parent');
        const isGenderNeutral = isTransferredMaternity || isSoloParent;
        
        if ((leaveTypeLower.includes('maternity') || leaveTypeLower.includes('paternity')) && !isGenderNeutral) {
            try {
                // Fetch faculty and employee data to get gender
                const faculty = await prisma.faculty.findUnique({
                    where: { FacultyID: Number(FacultyID) },
                    include: {
                        Employee: {
                            select: {
                                Sex: true
                            }
                        }
                    }
                });

                if (!faculty) {
                    return NextResponse.json(
                        { error: 'Faculty record not found' },
                        { status: 404 }
                    );
                }

                const employeeGender = faculty.Employee?.Sex?.toLowerCase() || '';
                
                // Regular Maternity leave only for females (excludes transferred maternity)
                if (leaveTypeLower.includes('maternity') && !isTransferredMaternity) {
                    if (employeeGender !== 'female' && employeeGender !== 'f') {
                        return NextResponse.json(
                            { error: 'Maternity leave is only available for female employees' },
                            { status: 400 }
                        );
                    }
                }
                
                // Paternity Leave (RA 8187) only for males
                // Strictly for legally married fathers (up to the first four deliveries)
                if (leaveTypeLower.includes('paternity')) {
                    if (employeeGender !== 'male' && employeeGender !== 'm') {
                        return NextResponse.json(
                            { error: 'Paternity leave is only available for male employees' },
                            { status: 400 }
                        );
                    }
                }
            } catch (error) {
                console.error('Error validating gender for leave type:', error);
                // If we can't verify gender, reject gender-specific leave types for safety
                // But allow gender-neutral leave types (transferred maternity, solo parent)
                if ((leaveTypeLower.includes('maternity') || leaveTypeLower.includes('paternity')) && !isGenderNeutral) {
                    return NextResponse.json(
                        { error: 'Unable to verify eligibility for this leave type. Please contact administrator.' },
                        { status: 400 }
                    );
                }
            }
        }

        // Validate dates
        const start = new Date(StartDate);
        const end = new Date(EndDate);
        // Calculate days without modifying the original time
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const requestDays = Math.ceil((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

        // Special validation for maternity leave
        if (LeaveType === LeaveType.Maternity) {
            // Check if the request is at least 60 days (minimum maternity leave)
            if (requestDays < 60) {
                return NextResponse.json(
                    { error: 'Maternity leave must be at least 60 days' },
                    { status: 400 }
                );
            }
            // Check if there's already a maternity leave request in the current year
            const currentYear = new Date().getFullYear();
            const existingMaternityLeave = await prisma.leave.findFirst({
                where: {
                    FacultyID: Number(FacultyID),
                    LeaveType: LeaveType.Maternity,
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
                    { status: 400 }
                );
            }
        } else {
            // For non-maternity leaves, check against the monthly limit
            const startMonth = start.getMonth();
            const startYear = start.getFullYear();
            const endMonth = end.getMonth();
            const endYear = end.getFullYear();

            // If the leave request spans multiple months, check each month's limit
            let currentDate = new Date(start);
            while (currentDate <= end) {
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();

                // Get all approved leaves for this faculty in the current month
                const approvedLeaves = await prisma.leave.findMany({
                    where: {
                        FacultyID: Number(FacultyID),
                        Status: 'Approved',
                        RequestType: 'Leave',
                        LeaveType: {
                            not: LeaveType.Maternity // Exclude maternity leaves from the count
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

                // Note: Unpaid leaves are allowed - days exceeding the 10-day limit will be considered unpaid
                // All approved leaves (including unpaid ones) are still counted for future requests

                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1);
            }
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
            data: leaveData,
            include: {
                Faculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                            }
                        },
                        Department: {
                            select: {
                                DepartmentName: true
                            }
                        }
                    }
                }
            }
        });

        // Send email notification to admin
        try {
            const employeeName = leave.Faculty?.User 
                ? `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}`
                : 'Unknown Employee';
            
            const leaveTypeDisplay = RequestType === 'Undertime' 
                ? 'Undertime' 
                : `${LeaveType} Leave`;
            
            const emailContent = generateLeaveRequestAdminNotificationEmail(
                employeeName,
                leaveTypeDisplay,
                leave.StartDate?.toISOString() || StartDate,
                leave.EndDate?.toISOString() || EndDate,
                leave.TimeIn?.toISOString() || TimeIn,
                leave.TimeOut?.toISOString() || TimeOut,
                leave.Status,
                leave.Reason,
                !!leave.employeeSignature,
                !!leave.departmentHeadSignature
            );

            const emailResult = await sendEmail({
                to: 'sjsfihrms@gmail.com',
                subject: `New Leave Request - ${employeeName}`,
                html: emailContent
            });

            if (emailResult.success) {
                console.log('Admin notification email sent successfully');
            } else {
                console.error('Failed to send admin notification email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('Error sending admin notification email:', emailError);
            // Don't fail the request if email fails, just log it
        }

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