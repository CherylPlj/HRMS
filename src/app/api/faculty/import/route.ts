import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Papa from 'papaparse';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the uploaded file
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a CSV file.' 
      }, { status: 400 });
    }

    // Read and parse CSV
    const text = await file.text();
    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim()
    });

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Failed to parse CSV file',
        details: errors 
      }, { status: 400 });
    }

    // Validate required fields
    const requiredFields = ['FirstName', 'LastName', 'Email', 'Position', 'DepartmentId'];
    const missingFields = requiredFields.filter(field => 
      !data[0] || !Object.keys(data[0]).includes(field)
    );

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields in CSV',
        details: missingFields
      }, { status: 400 });
    }

    // Process each row
    const results = await Promise.all(data.map(async (row: any) => {
      try {
        // Create user in database
        const response = await fetch(`${req.nextUrl.origin}/api/createUser`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: row.FirstName,
            lastName: row.LastName,
            Email: row.Email,
            role: 'Faculty',
            facultyData: {
              Position: row.Position,
              DepartmentId: parseInt(row.DepartmentId),
              EmploymentStatus: row.EmploymentStatus || 'Regular',
              HireDate: row.HireDate || new Date().toISOString().split('T')[0],
              DateOfBirth: row.DateOfBirth || null,
              Phone: row.Phone || null,
              Address: row.Address || null
            }
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create user');
        }

        return {
          email: row.Email,
          status: 'success'
        };
      } catch (error) {
        return {
          email: row.Email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }));

    // Count successes and failures
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Imported ${successful} faculty members successfully. ${failed} failed.`,
      details: results
    });

  } catch (error) {
    console.error('Error importing faculty:', error);
    return NextResponse.json({ 
      error: 'Failed to import faculty data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 