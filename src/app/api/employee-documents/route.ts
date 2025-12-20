import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

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

// Helper function to parse required integer (throws error if invalid)
function parseRequiredInteger(value: any, fieldName: string): number {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  if (typeof value === 'string' && (value === 'undefined' || value === 'null')) {
    throw new Error(`Invalid value for ${fieldName}: cannot be undefined`);
  }
  if (typeof value === 'number') {
    if (isNaN(value)) {
      throw new Error(`Invalid value for ${fieldName}: not a valid number`);
    }
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid value for ${fieldName}: not a valid integer`);
    }
    return parsed;
  }
  throw new Error(`Invalid value for ${fieldName}: must be a number`);
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const all = searchParams.get('all') === 'true';

    // If all=true, fetch all employee documents
    if (all) {
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
        .not('EmployeeID', 'is', null)
        .order('UploadDate', { ascending: false });

      if (error) {
        throw error;
      }

      // Map the data to include employeeName and documentTypeName directly
      const mappedDocuments = documents.map((doc: any) => ({
        DocumentID: doc.DocumentID,
        EmployeeID: doc.EmployeeID,
        DocumentTypeID: doc.DocumentTypeID,
        UploadDate: doc.UploadDate,
        SubmissionStatus: doc.SubmissionStatus,
        FilePath: doc.FilePath,
        FileUrl: doc.FileUrl,
        DownloadUrl: doc.DownloadUrl,
        Title: doc.Title || doc.DocumentType?.DocumentTypeName || 'Untitled',
        employeeName: doc.Employee?.User 
          ? `${doc.Employee.User.FirstName} ${doc.Employee.User.LastName}`
          : 'Unknown Employee',
        documentTypeName: doc.DocumentType?.DocumentTypeName || 'Unknown Type'
      }));

      return NextResponse.json(mappedDocuments);
    }

    // Otherwise, require employeeId
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
          DocumentTypeID: parseRequiredInteger(data.DocumentTypeID, 'DocumentTypeID'),
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