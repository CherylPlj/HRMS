import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { facultyDocumentService } from '@/services/facultyDocumentService';

interface User {
  FirstName: string;
  LastName: string;
  Email: string;
}

interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
}

interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  ContactInfo?: {
    Email: string | null;
  }[];
}

interface Document {
  DocumentID: number;
  EmployeeID: string;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  Employee: Employee;
  DocumentType: DocumentType;
}

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    console.log('Current user from Clerk:', {
      id: user?.id,
      email: user?.emailAddresses?.[0]?.emailAddress
    });

    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employeeId from query parameters
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const documentTypeId = searchParams.get('documentTypeId');

    console.log('Fetching documents for employee:', employeeId);

    // If employeeId is provided, verify the employee exists
    if (employeeId && employeeId !== 'all') {
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('Employee')
        .select('EmployeeID')
        .eq('EmployeeID', employeeId)
        .single();

      if (employeeError) {
        console.error('Error verifying employee:', employeeError);
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      console.log('Verified employee exists:', employeeData);
    } else {
      console.log('Fetching all documents (employeeId not provided or is "all")');
    }

    // Fetch documents from Supabase - using Employee table instead of Faculty
    let query = supabaseAdmin
      .from('Document')
      .select(`
        DocumentID,
        EmployeeID,
        DocumentTypeID,
        UploadDate,
        SubmissionStatus,
        FilePath,
        FileUrl,
        DownloadUrl,
        Employee (
          EmployeeID,
          FirstName,
          LastName,
          ContactInfo (
            Email
          )
        ),
        DocumentType (
          DocumentTypeID,
          DocumentTypeName
        )
      `);

    if (employeeId && employeeId !== 'all') {
      query = query.eq('EmployeeID', employeeId);
    }
    
    if (documentTypeId) {
      query = query.eq('DocumentTypeID', documentTypeId);
    }
    
    const { data: documents, error: documentsError } = await query.order('UploadDate', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Map the data to include employeeName and documentTypeName directly
    const mappedDocuments = documents.map((doc: Document) => ({
      ...doc,
      employeeName: `${doc.Employee.FirstName} ${doc.Employee.LastName}`,
      documentTypeName: doc.DocumentType.DocumentTypeName,
    }));

    console.log('Successfully fetched documents:', mappedDocuments);
    return NextResponse.json(mappedDocuments || []);
  } catch (error) {
    console.error('Error in employee-documents GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    console.log('Current user from Clerk:', {
      id: user?.id,
      email: user?.emailAddresses?.[0]?.emailAddress
    });

    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's email from Clerk
    const userEmail = user.emailAddresses[0]?.emailAddress;
    console.log('Looking up user in Supabase with email:', userEmail);

    // First, find the user in Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('User')
      .select('UserID, FirstName, LastName, Email')
      .eq('Email', userEmail)
      .single();

    if (userError) {
      console.error('Error finding user in Supabase:', userError);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    console.log('Found user in Supabase:', userData);

    // Then find the employee record
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('Employee')
      .select('EmployeeID, UserID')
      .eq('UserID', userData.UserID)
      .single();

    if (employeeError) {
      console.error('Error finding employee record:', employeeError);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!employeeData) {
      console.log('No employee record found for user:', userData.UserID);
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    console.log('Found employee record:', employeeData);

    const formData = await request.formData();
    const DocumentTypeID = formData.get('DocumentTypeID');
    const file = formData.get('file') as File;

    if (!DocumentTypeID || !file) {
      return NextResponse.json(
        { error: 'Document type and file are required' },
        { status: 400 }
      );
    }

    console.log('Processing document upload:', {
      DocumentTypeID,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // Upload file to Google Drive
    const fileName = `${Date.now()}_${file.name}`;
    console.log('Uploading to Google Drive:', {
      fileName,
      fileType: file.type,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    });

    const uploadResult = await facultyDocumentService.uploadFile(
      file,
      fileName,
      file.type,
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );

    console.log('File upload successful:', uploadResult);

    // Check if document already exists
    const { data: existingDoc, error: checkError } = await supabaseAdmin
      .from('Document')
      .select('DocumentID, FilePath')
      .eq('EmployeeID', employeeData.EmployeeID)
      .eq('DocumentTypeID', parseInt(DocumentTypeID as string))
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking existing document:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing document: ' + checkError.message },
        { status: 500 }
      );
    }

    // If document exists, delete old file
    if (existingDoc?.FilePath) {
      try {
        await facultyDocumentService.deleteFile(existingDoc.FilePath, existingDoc.FilePath.includes('supabase') ? 'supabase' : 'google-drive');
        console.log('Deleted old file:', existingDoc.FilePath);
      } catch (deleteError) {
        console.error('Error deleting old file:', deleteError);
        // Continue with update even if delete fails
      }
    }

    // Update or insert document record
    const { data: document, error: documentError } = await supabaseAdmin
      .from('Document')
      .upsert([{
        ...(existingDoc?.DocumentID ? { DocumentID: existingDoc.DocumentID } : {}), // Only include DocumentID if it exists
        EmployeeID: employeeData.EmployeeID,
        DocumentTypeID: parseInt(DocumentTypeID as string),
        UploadDate: new Date().toISOString(),
        SubmissionStatus: 'Submitted',
        FilePath: uploadResult.fileId,
        FileUrl: uploadResult.webViewLink,
        DownloadUrl: uploadResult.downloadLink
      }])
      .select()
      .single();

    if (documentError) {
      console.error('Error saving document record:', documentError);
      return NextResponse.json(
        { error: 'Failed to save document record: ' + documentError.message },
        { status: 500 }
      );
    }

    console.log('Document record saved successfully:', document);

    return NextResponse.json({
      success: true,
      document: {
        DocumentID: document.DocumentID,
        EmployeeID: document.EmployeeID,
        DocumentTypeID: document.DocumentTypeID,
        UploadDate: document.UploadDate,
        SubmissionStatus: document.SubmissionStatus,
        FileUrl: document.FileUrl,
        DownloadUrl: document.DownloadUrl
      }
    });
  } catch (error) {
    console.error('Error in employee-documents POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 