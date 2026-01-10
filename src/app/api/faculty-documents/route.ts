import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';
import { facultyDocumentService } from '@/services/facultyDocumentService';
import { validateFacultyDocumentFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';

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
    const documentTypeId = searchParams.get('documentTypeId');

    console.log('Fetching documents for faculty:', facultyId);

    // If facultyId is provided, verify the faculty exists
    if (facultyId && facultyId !== 'all') { // Added 'all' check to allow fetching all documents
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
    } else {
      console.log('Fetching all documents (facultyId not provided or is "all")');
    }

    // Fetch documents from Supabase
    let query = supabaseAdmin
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
        Faculty (
          FacultyID,
          User (
            FirstName,
            LastName,
            Email
          )
        ),
        DocumentType (
          DocumentTypeID,
          DocumentTypeName
        )
      `);

    if (facultyId && facultyId !== 'all') {
      query = query.eq('FacultyID', facultyId);
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

    // Map the data to include facultyName and documentTypeName directly, similar to FacultyContent's structure
    const mappedDocuments = documents.map((doc: Document) => ({
      ...doc,
      facultyName: `${doc.Faculty.User.FirstName} ${doc.Faculty.User.LastName}`,
      documentTypeName: doc.DocumentType.DocumentTypeName,
    }));

    console.log('Successfully fetched documents:', mappedDocuments);
    return NextResponse.json(mappedDocuments || []);
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

    // Validate file
    const fileValidation = validateFacultyDocumentFile(file, true);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Additional security check: verify file size
    if (file.size > FILE_SIZE_LIMITS.DOCUMENT) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${FILE_SIZE_LIMITS.DOCUMENT / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Validate and parse DocumentTypeID
    const documentTypeIdStr = DocumentTypeID as string;
    if (documentTypeIdStr === 'undefined' || documentTypeIdStr === 'null' || documentTypeIdStr === '') {
      return NextResponse.json(
        { error: 'Invalid DocumentTypeID' },
        { status: 400 }
      );
    }
    const documentTypeId = parseInt(documentTypeIdStr, 10);
    if (isNaN(documentTypeId)) {
      return NextResponse.json(
        { error: 'DocumentTypeID must be a valid integer' },
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
      .eq('FacultyID', facultyData.FacultyID)
      .eq('DocumentTypeID', documentTypeId)
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
        FacultyID: facultyData.FacultyID,
        DocumentTypeID: documentTypeId,
        UploadDate: new Date().toISOString(),
        SubmissionStatus: 'Submitted',
        FilePath: uploadResult.fileId,
        FileUrl: uploadResult.webViewLink,
        DownloadUrl: uploadResult.downloadLink
      }])
      .select()
      .single();

    if (documentError) {
      console.error('Error updating document record:', documentError);
      // If document record update fails, delete the uploaded file
      await facultyDocumentService.deleteFile(uploadResult.fileId, uploadResult.fileId.includes('supabase') ? 'supabase' : 'google-drive');
      return NextResponse.json(
        { error: 'Failed to update document record: ' + documentError.message },
        { status: 500 }
      );
    }

    console.log('Document record updated successfully:', document);
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