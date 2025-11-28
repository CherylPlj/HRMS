import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Define CORS headers
const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
    return Response.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest, context: { params: Promise<{ facultyId: string }> }) {
    try {
        // Properly await params (required in Next.js 15+)
        const { facultyId: facultyIdParam } = await context.params;
        const facultyId = parseInt(facultyIdParam);
        
        if (isNaN(facultyId)) {
            return Response.json({ error: 'Invalid faculty ID' }, { status: 400, headers: corsHeaders });
        }

        // Optimize query by selecting only needed fields and limiting results
        const { data: leaves, error } = await supabase
            .from('Leave')
            .select(`
                LeaveID,
                FacultyID,
                RequestType,
                LeaveType,
                StartDate,
                EndDate,
                TimeIn,
                TimeOut,
                Reason,
                Status,
                CreatedAt,
                UpdatedAt,
                Faculty:FacultyID (
                    User:UserID (
                        FirstName,
                        LastName
                    ),
                    Department:DepartmentID (
                        DepartmentName
                    )
                )
            `)
            .eq('FacultyID', facultyId)
            .order('CreatedAt', { ascending: false })
            .limit(1000); // Limit results to prevent huge queries

        if (error) {
            console.error('Error fetching leaves:', error);
            return Response.json({ error: 'Failed to fetch leaves' }, { status: 500, headers: corsHeaders });
        }

        // Transform the data - handle Supabase nested structure (can be array or object)
        const formattedLeaves = (leaves || []).map((leave: any) => {
            // Handle nested structure - Supabase may return arrays or objects
            const facultyDataRaw: any = Array.isArray(leave.Faculty) ? leave.Faculty[0] : leave.Faculty;
            const facultyData = facultyDataRaw || {};
            
            const userDataRaw: any = Array.isArray(facultyData.User) ? facultyData.User[0] : facultyData.User;
            const userData = userDataRaw || {};
            
            const deptDataRaw: any = Array.isArray(facultyData.Department) ? facultyData.Department[0] : facultyData.Department;
            const deptData = deptDataRaw || {};
            
            return {
                ...leave,
                Faculty: {
                    Name: userData?.FirstName && userData?.LastName
                        ? `${userData.FirstName} ${userData.LastName}`
                        : 'Unknown',
                    Department: deptData?.DepartmentName || 'Unknown Department'
                }
            };
        });

        return Response.json(formattedLeaves, { headers: corsHeaders });
    } catch (error) {
        console.error('Error in leave request handler:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
    }
}