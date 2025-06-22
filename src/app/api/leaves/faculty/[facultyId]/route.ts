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

export async function GET(request: NextRequest, context: { params: { facultyId: string } }) {
    try {
        // Properly await and destructure params
        const facultyId = parseInt(context.params.facultyId);
        
        if (isNaN(facultyId)) {
            return Response.json({ error: 'Invalid faculty ID' }, { status: 400 });
        }

        const { data: leaves, error } = await supabase
            .from('Leave')
            .select(`
                *,
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
            .order('CreatedAt', { ascending: false });

        if (error) {
            console.error('Error fetching leaves:', error);
            return Response.json({ error: 'Failed to fetch leaves' }, { status: 500 });
        }

        // Transform the data
        const formattedLeaves = leaves.map(leave => ({
            ...leave,
            Faculty: {
                Name: leave.Faculty?.User 
                    ? `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}`
                    : 'Unknown',
                Department: leave.Faculty?.Department?.DepartmentName || 'Unknown Department'
            }
        }));

        return Response.json(formattedLeaves);
    } catch (error) {
        console.error('Error in leave request handler:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
} 