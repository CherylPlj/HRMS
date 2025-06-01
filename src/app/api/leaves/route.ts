import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Define a type for the leave record
type LeaveRecord = {
    LeaveID: number;
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
                    UserID,
                    User (
                        FirstName,
                        LastName,
                        Photo
                    )
                )
            `)
            .order('CreatedAt', { ascending: false });

        if (error) {
            console.error('Error fetching leaves:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('Raw leaves data:', leaves); // Debug log

        if (!leaves || leaves.length === 0) {
            return NextResponse.json([]);
        }

        // Transform the data to match the frontend structure
        const transformedLeaves = (leaves as LeaveRecord[]).map((leave) => {
            // Check if Faculty and User data exists
            if (!leave.Faculty || !leave.Faculty.User) {
                console.warn('Missing Faculty or User data for leave:', leave);
                return {
                    leaveId: leave.LeaveID,
                    employeeName: 'Unknown Employee',
                    leaveType: leave.LeaveType,
                    startDate: leave.StartDate,
                    endDate: leave.EndDate,
                    reason: leave.Reason,
                    status: leave.Status,
                    documentUrl: leave.DocumentUrl,
                    createdAt: leave.CreatedAt,
                    updatedAt: leave.UpdatedAt,
                    photo: null
                };
            }

            return {
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
                photo: leave.Faculty.User.Photo
            };
        });

        console.log('Transformed leaves:', transformedLeaves); // Debug log
        return NextResponse.json(transformedLeaves);
    } catch (error) {
        console.error('Error in leave API:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}