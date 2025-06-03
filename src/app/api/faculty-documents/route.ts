import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

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

export async function GET() {
  try {
    console.log('Fetching faculty documents from API route...');
    
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('Document')
      .select(`
        DocumentID,
        FacultyID,
        DocumentTypeID,
        UploadDate,
        SubmissionStatus,
        DocumentType!inner (
          DocumentTypeID,
          DocumentTypeName
        ),
        Faculty!inner (
          FacultyID,
          User!inner (
            FirstName,
            LastName,
            Email
          )
        )
      `);

    if (documentsError) {
      console.error('Error fetching documents:', {
        message: documentsError.message,
        details: documentsError.details,
        hint: documentsError.hint,
        code: documentsError.code
      });
      return NextResponse.json(
        { error: documentsError.message || 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    if (!documents) {
      return NextResponse.json(
        { error: 'No documents found' },
        { status: 404 }
      );
    }

    console.log('Raw documents data:', JSON.stringify(documents, null, 2));

    // Transform the data to include faculty name and document type name
    const transformedDocuments = (documents as unknown as Document[]).map(doc => {
      const facultyName = `${doc.Faculty.User.FirstName} ${doc.Faculty.User.LastName}`;
      const documentTypeName = doc.DocumentType.DocumentTypeName;
      
      return {
        ...doc,
        facultyName,
        documentTypeName
      };
    });

    console.log('Transformed documents:', JSON.stringify(transformedDocuments, null, 2));
    return NextResponse.json(transformedDocuments);
  } catch (error: unknown) {
    console.error('Unexpected error in faculty-documents:', error);
    return NextResponse.json(
      { error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const DocumentTypeID = formData.get('DocumentTypeID');
    const file = formData.get('file') as File;
    const acceptedFileTypes = JSON.parse(formData.get('acceptedFileTypes') as string);

    if (!DocumentTypeID || !file) {
      return NextResponse.json(
        { error: 'Document type and file are required' },
        { status: 400 }
      );
    }

    // Get faculty ID for the current user
    const { data: facultyData, error: facultyError } = await supabaseAdmin
      .from('Faculty')
      .select('FacultyID')
      .eq('UserID', user.id)
      .single();

    if (facultyError || !facultyData) {
      console.error('Error fetching faculty:', facultyError);
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `documents/${facultyData.FacultyID}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: documentError } = await supabaseAdmin
      .from('Document')
      .insert([{
        FacultyID: facultyData.FacultyID,
        DocumentTypeID: parseInt(DocumentTypeID as string),
        UploadDate: new Date().toISOString(),
        SubmissionStatus: 'Pending',
        FilePath: filePath
      }])
      .select()
      .single();

    if (documentError) {
      console.error('Error creating document record:', documentError);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error in faculty-documents POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 