import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { LeaveStatus, LeaveType } from '@prisma/client';
import { sendEmail, generateLeaveStatusUpdateEmail, generateLeaveUpdateAdminNotificationEmail } from '@/lib/email';

// Helper function to sanitize integer values (handles undefined, null, empty strings, and string "undefined")
function sanitizeInteger(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'string' && (value === 'undefined' || value === 'null')) {
    return null;
  }
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

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
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { id } = await context.params;
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
        
        // Sanitize any integer fields that might be in the body to prevent "undefined" string errors
        if (body.FacultyID !== undefined) {
            const sanitized = sanitizeInteger(body.FacultyID);
            if (sanitized === null && body.FacultyID !== null && body.FacultyID !== undefined) {
                return NextResponse.json(
                    { error: 'Invalid FacultyID: must be a valid integer' },
                    { status: 400, headers: corsHeaders }
                );
            }
        }
        
        const { status } = body;

        if (!status || !['Approved', 'Returned'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be either Approved or Returned' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Map string to enum value
        const statusEnum = status === 'Approved' ? LeaveStatus.Approved : LeaveStatus.Returned;

        if (existingLeave.Status !== LeaveStatus.Pending) {
            return NextResponse.json(
                { error: 'Only pending requests can be updated' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Only validate leave limits when APPROVING, not when returning
        if (statusEnum === LeaveStatus.Approved) {
            // Use existing leave dates if body dates are not provided
            const startDate = body.StartDate ? new Date(body.StartDate) : existingLeave.StartDate;
            const endDate = body.EndDate ? new Date(body.EndDate) : existingLeave.EndDate;

            if (!startDate || !endDate) {
                return NextResponse.json(
                    { error: 'Leave dates are required' },
                    { status: 400, headers: corsHeaders }
                );
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            // Calculate days for this request
            const requestDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Get all approved leaves for this faculty in the current year (excluding this one)
            const currentYear = new Date().getFullYear();
            try {
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
                    if (!leave.StartDate || !leave.EndDate) return total;
                    const leaveStart = new Date(leave.StartDate);
                    const leaveEnd = new Date(leave.EndDate);
                    const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return total + days;
                }, 0);

                // Note: Unpaid leaves are allowed - days exceeding the annual limit will be considered unpaid
                // All approved leaves (including unpaid ones) are still counted for future requests
            } catch (dbError) {
                console.error('Database error during leave validation:', dbError);
                // If it's a connection error, retry once
                if (dbError instanceof Error && dbError.message.includes('prepared statement')) {
                    try {
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

                        const approvedDays = approvedLeaves.reduce((total, leave) => {
                            if (!leave.StartDate || !leave.EndDate) return total;
                            const leaveStart = new Date(leave.StartDate);
                            const leaveEnd = new Date(leave.EndDate);
                            const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            return total + days;
                        }, 0);

                        // Note: Unpaid leaves are allowed - days exceeding the annual limit will be considered unpaid
                        // All approved leaves (including unpaid ones) are still counted for future requests
                    } catch (retryError) {
                        console.error('Database error on retry:', retryError);
                        throw retryError;
                    }
                } else {
                    throw dbError;
                }
            }
        }

        // Ensure we're using the enum value, not a string
        const updatedLeave = await prisma.leave.update({
            where: { LeaveID: leaveId },
            data: {
                Status: statusEnum, // This is now LeaveStatus.Approved or LeaveStatus.Returned
                UpdatedAt: new Date()
            },
            include: {
                Faculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Email: true
                            }
                        }
                    }
                }
            }
        });

        // Send email notification to user when status changes
        try {
            const userEmail = updatedLeave.Faculty?.User?.Email;
            if (userEmail) {
                const employeeName = updatedLeave.Faculty.User
                    ? `${updatedLeave.Faculty.User.FirstName} ${updatedLeave.Faculty.User.LastName}`
                    : 'Employee';
                
                const leaveTypeDisplay = existingLeave.RequestType === 'Undertime'
                    ? 'Undertime'
                    : existingLeave.LeaveType
                        ? `${existingLeave.LeaveType} Leave`
                        : 'Leave';
                
                const emailContent = generateLeaveStatusUpdateEmail(
                    employeeName,
                    leaveTypeDisplay,
                    existingLeave.StartDate?.toISOString() || '',
                    existingLeave.EndDate?.toISOString() || '',
                    status // Use string for email template
                );

                const emailResult = await sendEmail({
                    to: userEmail,
                    subject: `Leave Request ${status} - ${leaveTypeDisplay}`,
                    html: emailContent
                });

                if (emailResult.success) {
                    console.log('User notification email sent successfully');
                } else {
                    console.error('Failed to send user notification email:', emailResult.error);
                }
            } else {
                console.warn('User email not found for leave request:', leaveId);
            }
        } catch (emailError) {
            console.error('Error sending user notification email:', emailError);
            // Don't fail the request if email fails, just log it
        }

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
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { id } = await context.params;
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

        // Allow updating of both Pending and Returned requests (frontend allows editing Returned requests)
        if (existingLeave.Status !== 'Pending' && existingLeave.Status !== 'Returned') {
            return NextResponse.json(
                { error: 'Only pending or returned requests can be updated' },
                { status: 400, headers: corsHeaders }
            );
        }

        const body = await request.json();
        
        // Sanitize any integer fields that might be in the body to prevent "undefined" string errors
        if (body.FacultyID !== undefined) {
            const sanitized = sanitizeInteger(body.FacultyID);
            if (sanitized === null && body.FacultyID !== null && body.FacultyID !== undefined) {
                return NextResponse.json(
                    { error: 'Invalid FacultyID: must be a valid integer' },
                    { status: 400, headers: corsHeaders }
                );
            }
        }
        
        // Use provided dates or fall back to existing leave dates
        const startDateStr = body.StartDate || existingLeave.StartDate?.toISOString();
        const endDateStr = body.EndDate || existingLeave.EndDate?.toISOString();
        
        if (!startDateStr || !endDateStr) {
            return NextResponse.json(
                { error: 'StartDate and EndDate are required' },
                { status: 400, headers: corsHeaders }
            );
        }
        
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        // Validate that dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Invalid date format for StartDate or EndDate' },
                { status: 400, headers: corsHeaders }
            );
        }
        
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        // Calculate days for this request
        const requestDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Get the LeaveType from body or existing leave (for validation purposes)
        const leaveTypeForValidation = body.LeaveType !== undefined ? body.LeaveType : existingLeave.LeaveType;
        const requestTypeForValidation = body.RequestType !== undefined ? body.RequestType : existingLeave.RequestType;
        
        // Only validate leave types if this is a Leave request (not Undertime)
        if (requestTypeForValidation === 'Leave' && leaveTypeForValidation) {
            // Validate gender-specific leave types
            const leaveTypeLower = leaveTypeForValidation.toLowerCase() || '';
            // Check if it's a gender-neutral leave type (available to both genders)
            const isTransferredMaternity = leaveTypeLower.includes('transferred') && leaveTypeLower.includes('maternity');
            const isSoloParent = leaveTypeLower.includes('solo') && leaveTypeLower.includes('parent');
            const isGenderNeutral = isTransferredMaternity || isSoloParent;
            
            if ((leaveTypeLower.includes('maternity') || leaveTypeLower.includes('paternity')) && !isGenderNeutral) {
            try {
                // Fetch faculty and employee data to get gender
                const faculty = await prisma.faculty.findUnique({
                    where: { FacultyID: existingLeave.FacultyID },
                    include: {
                        Employee: {
                            select: {
                                Sex: true
                            }
                        }
                    }
                });

                if (faculty) {
                    const employeeGender = faculty.Employee?.Sex?.toLowerCase() || '';
                    
                    // Regular Maternity leave only for females (excludes transferred maternity)
                    if (leaveTypeLower.includes('maternity') && !isTransferredMaternity) {
                        if (employeeGender !== 'female' && employeeGender !== 'f') {
                            return NextResponse.json(
                                { error: 'Maternity leave is only available for female employees' },
                                { status: 400, headers: corsHeaders }
                            );
                        }
                    }
                    
                    // Paternity Leave (RA 8187) only for males
                    // Strictly for legally married fathers (up to the first four deliveries)
                    if (leaveTypeLower.includes('paternity')) {
                        if (employeeGender !== 'male' && employeeGender !== 'm') {
                            return NextResponse.json(
                                { error: 'Paternity leave is only available for male employees' },
                                { status: 400, headers: corsHeaders }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('Error validating gender for leave type:', error);
                // If we can't verify gender, reject gender-specific leave types for safety
                // But allow gender-neutral leave types (transferred maternity, solo parent)
                if ((leaveTypeLower.includes('maternity') || leaveTypeLower.includes('paternity')) && !isGenderNeutral) {
                    return NextResponse.json(
                        { error: 'Unable to verify eligibility for this leave type. Please contact administrator.' },
                        { status: 400, headers: corsHeaders }
                    );
                }
            }
        }

        // Special validation for maternity leave (only if this is a Leave request)
        if (requestTypeForValidation === 'Leave' && leaveTypeForValidation === LeaveType.Maternity) {
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
        } else if (requestTypeForValidation === 'Leave') {
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

                // Note: Unpaid leaves are allowed - days exceeding the 10-day limit will be considered unpaid
                // All approved leaves (including unpaid ones) are still counted for future requests

                // Move to next month
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1);
            }
        }

        // Build update data object, only including fields that are provided and valid
        const updateData: any = {
            UpdatedAt: new Date()
        };
        
        // Only update fields that are provided
        if (body.RequestType !== undefined) {
            updateData.RequestType = body.RequestType;
        }
        
        // Handle LeaveType - if it's undefined, set it to null (for Undertime requests)
        if (body.LeaveType !== undefined) {
            updateData.LeaveType = body.LeaveType || null;
        }
        
        if (body.StartDate !== undefined) {
            updateData.StartDate = new Date(body.StartDate);
        }
        
        if (body.EndDate !== undefined) {
            updateData.EndDate = new Date(body.EndDate);
        }
        
        if (body.TimeIn !== undefined) {
            updateData.TimeIn = body.TimeIn ? new Date(body.TimeIn) : null;
        }
        
        if (body.TimeOut !== undefined) {
            updateData.TimeOut = body.TimeOut ? new Date(body.TimeOut) : null;
        }
        
        if (body.Reason !== undefined) {
            updateData.Reason = body.Reason;
        }
        
        const updatedLeave = await prisma.leave.update({
            where: { LeaveID: leaveId },
            data: updateData,
            include: {
                Faculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Email: true
                            }
                        }
                    }
                }
            }
        });

        // Send email notification to HR admin when leave request is updated
        try {
            const employeeName = updatedLeave.Faculty?.User
                ? `${updatedLeave.Faculty.User.FirstName} ${updatedLeave.Faculty.User.LastName}`
                : 'Employee';
            
            const leaveTypeDisplay = updatedLeave.RequestType === 'Undertime'
                ? 'Undertime'
                : updatedLeave.LeaveType
                    ? `${updatedLeave.LeaveType} Leave`
                    : 'Leave';
            
            const emailContent = generateLeaveUpdateAdminNotificationEmail(
                employeeName,
                leaveTypeDisplay,
                updatedLeave.StartDate?.toISOString() || '',
                updatedLeave.EndDate?.toISOString() || '',
                updatedLeave.TimeIn?.toISOString() || null,
                updatedLeave.TimeOut?.toISOString() || null,
                updatedLeave.Reason || '',
                !!updatedLeave.employeeSignature,
                !!updatedLeave.departmentHeadSignature
            );

            const emailResult = await sendEmail({
                to: 'sjsfihrms@gmail.com',
                subject: `Leave Request Updated - ${leaveTypeDisplay} - ${employeeName}`,
                html: emailContent
            });

            if (emailResult.success) {
                console.log('HR admin notification email sent successfully');
            } else {
                console.error('Failed to send HR admin notification email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('Error sending HR admin notification email:', emailError);
            // Don't fail the request if email fails, just log it
        }

        return NextResponse.json(updatedLeave, { headers: corsHeaders });
    } catch (error) {
        console.error('Error updating leave request:', error);
        
        // Log more details for debugging
        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        
        // Check for specific Prisma errors
        if (error instanceof Error) {
            if (error.message.includes('foreign key constraint')) {
                return NextResponse.json(
                    { error: 'Invalid faculty information', details: error.message },
                    { status: 400, headers: corsHeaders }
                );
            }
            if (error.message.includes('unique constraint')) {
                return NextResponse.json(
                    { error: 'A leave request already exists for this period', details: error.message },
                    { status: 400, headers: corsHeaders }
                );
            }
        }
        
        return NextResponse.json(
            { error: 'Failed to update leave request', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { id } = await context.params;
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

        // Allow deletion of both Pending and Returned requests (frontend checks for Returned, but we allow both for safety)
        if (existingLeave.Status !== 'Pending' && existingLeave.Status !== 'Returned') {
            return NextResponse.json(
                { error: 'Only pending or returned requests can be deleted' },
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