import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Define CORS headers
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
    request: NextRequest,
    context: { params: { facultyId: string } }
) {
    try {
        // Add CORS headers to all responses
        const response = (data: any, status = 200) => {
            return NextResponse.json(data, { 
                status,
                headers: corsHeaders
            });
        };

        const { userId } = await auth();
        if (!userId) {
            return response({ error: 'Unauthorized' }, 401);
        }

        // Properly await and destructure params
        const { params } = context;
        const facultyId = parseInt(params.facultyId);
        if (isNaN(facultyId)) {
            return response({ error: 'Invalid faculty ID' }, 400);
        }

        // Fix the query syntax and add proper error handling
        const leaves = await prisma.leave.findMany({
            where: {
                FacultyID: facultyId
            },
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
        }).finally(() => {
            // Ensure connection is properly handled
            prisma.$disconnect();
        });

        // Transform the data to match the frontend structure
        const transformedLeaves = leaves.map(leave => ({
            ...leave,
            Faculty: {
                Name: leave.Faculty?.User ? 
                    `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}` : 
                    'Unknown',
                Department: leave.Faculty?.Department?.DepartmentName || 'Unknown'
            }
        }));

        return response(transformedLeaves);
    } catch (error) {
        console.error('Error fetching leaves for faculty:', error);
        // Ensure connection is properly handled even in case of error
        await prisma.$disconnect();
        
        return NextResponse.json({ 
            error: 'Failed to fetch leaves',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { 
            status: 500,
            headers: corsHeaders
        });
    }
} 