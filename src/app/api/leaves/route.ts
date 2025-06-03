import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Define a type for the leave record
type LeaveRecord = {
    LeaveID: number;
    FacultyID: number;
    LeaveType: string;
    StartDate: string;
    EndDate: string;
    Reason: string;
    Status: string;
    DocumentUrl: string | null;
    CreatedAt: string;
    UpdatedAt: string;
    Faculty?: {
        FacultyID: number;
        UserID: string;
        User?: {
            FirstName: string;
            LastName: string;
            Photo: string | null;
        };
        Department?: {
            DepartmentName: string;
        };
    };
};

export async function GET() {
    try {
        console.log('Fetching leaves from Supabase...'); // Debug log

        const { data: leaves, error } = await supabase
            .from('Leave')
            .select(`
                *,
                Faculty (
                    FacultyID,
                    DepartmentID,
                    Department (
                        DepartmentName
                    ),
                    User (
                        UserID,
                        FirstName,
                        LastName
                    )
                )
            `)
            .order('CreatedAt', { ascending: false });

        if (error) {
            console.error('Error fetching leaves:', error);
            return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
        }

        console.log('Raw leaves data:', JSON.stringify(leaves, null, 2)); // Detailed log
        console.log('Number of leaves found:', leaves?.length || 0); // Debug log

        if (!leaves || leaves.length === 0) {
            console.log('No leaves found in database'); // Debug log
            return NextResponse.json([]);
        }

        // Transform the data to match the frontend structure
        const transformedLeaves = leaves.map(leave => {
            // Clean the UserID by removing any whitespace or newlines
            const userId = leave.Faculty?.User?.UserID?.trim() || null;
            
            return {
                ...leave,
                Faculty: {
                    Name: leave.Faculty?.User ? 
                        `${leave.Faculty.User.FirstName} ${leave.Faculty.User.LastName}` : 
                        'Unknown',
                    Department: leave.Faculty?.Department?.DepartmentName || 'Unknown',
                    UserID: userId
                }
            };
        });

        console.log('Final transformed leaves:', JSON.stringify(transformedLeaves, null, 2)); // Debug final output
        return NextResponse.json(transformedLeaves);
    } catch (error) {
        console.error('Error in leaves API:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}