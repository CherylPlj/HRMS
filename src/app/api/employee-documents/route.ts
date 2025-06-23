import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get all documents for the employee from Supabase
    const { data: documents, error } = await supabaseAdmin
      .from('Document')
      .select(`
        *,
        Employee:EmployeeID (
          EmployeeID,
          User:UserID (
            FirstName,
            LastName
          )
        ),
        DocumentType:DocumentTypeID (
          DocumentTypeName,
          Description
        )
      `)
      .eq('EmployeeID', employeeId)
      .order('UploadDate', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['EmployeeID', 'DocumentTypeID', 'FileURL', 'FileName'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create document in Supabase
    const { data: newDocument, error } = await supabaseAdmin
      .from('Document')
      .insert([
        {
          EmployeeID: data.EmployeeID,
          DocumentTypeID: data.DocumentTypeID,
          FileURL: data.FileURL,
          FileName: data.FileName,
          FileSize: data.FileSize,
          FileType: data.FileType,
          UploadDate: new Date().toISOString(),
          Status: data.Status || 'Pending',
          Notes: data.Notes,
          UploadedBy: user.id
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
} 