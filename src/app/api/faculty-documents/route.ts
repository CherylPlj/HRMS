import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { googleDriveService } from '@/services/googleDriveService';

interface User {
  FirstName: string;
  LastName: string;
  Email: string;
}

interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
}

interface Faculty {
  FacultyID: number;
  User: User;
}

interface Document {
  DocumentID: number;
  FacultyID: number;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  Faculty: Faculty;
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

    // Get facultyId from query parameters
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('facultyId');

    if (!facultyId) {
      console.log('No facultyId provided in query parameters');
      return NextResponse.json({ error: 'Faculty ID is required' }, { status: 400 });
    }

    console.log('Fetching documents for faculty:', facultyId);

    // First verify the faculty exists
    const { data: facultyData, error: facultyError } = await supabaseAdmin
      .from('Faculty')
      .select('FacultyID')
      .eq('FacultyID', facultyId)
      .single();

    if (facultyError) {
      console.error('Error verifying faculty:', facultyError);
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    console.log('Verified faculty exists:', facultyData);

    // Fetch documents from Supabase
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('Document')
      .select(`
        DocumentID,
        FacultyID,
        DocumentTypeID,
        UploadDate,
        SubmissionStatus,
        FilePath,
        FileUrl,
        DownloadUrl,
        DocumentType (
          DocumentTypeID,
          DocumentTypeName
        )
      `)
      .eq('FacultyID', facultyId)
      .order('UploadDate', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    console.log('Successfully fetched documents:', documents);
    return NextResponse.json(documents || []);
  } catch (error) {
    console.error('Error in faculty-documents GET:', error);
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

    // Then find the faculty record
    const { data: facultyData, error: facultyError } = await supabaseAdmin
      .from('Faculty')
      .select('FacultyID, UserID')
      .eq('UserID', userData.UserID)
      .single();

    if (facultyError) {
      console.error('Error finding faculty record:', facultyError);
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    if (!facultyData) {
      console.log('No faculty record found for user:', userData.UserID);
      return NextResponse.json({ error: 'Faculty record not found' }, { status: 404 });
    }

    console.log('Found faculty record:', facultyData);

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

    const uploadResult = await googleDriveService.uploadFile(
      file,
      fileName,
      file.type,
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );

    console.log('Google Drive upload successful:', uploadResult);

    // Create document record in Supabase
    const { data: document, error: documentError } = await supabaseAdmin
      .from('Document')
      .insert([{
        FacultyID: facultyData.FacultyID,
        DocumentTypeID: parseInt(DocumentTypeID as string),
        UploadDate: new Date().toISOString(),
        SubmissionStatus: 'Pending',
        FilePath: uploadResult.fileId,
        FileUrl: uploadResult.webViewLink,
        DownloadUrl: uploadResult.downloadLink
      }])
      .select()
      .single();

    if (documentError) {
      console.error('Error creating document record:', documentError);
      // If document record creation fails, delete the uploaded file from Google Drive
      await googleDriveService.deleteFile(uploadResult.fileId);
      return NextResponse.json(
        { error: 'Failed to create document record: ' + documentError.message },
        { status: 500 }
      );
    }

    console.log('Document record created successfully:', document);
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error in faculty-documents POST:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 