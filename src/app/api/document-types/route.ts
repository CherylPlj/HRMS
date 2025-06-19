import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('Fetching document types from Supabase...');
    
    const { data: documentTypes, error } = await supabaseAdmin
      .from('DocumentType')
      .select('*')
      .order('DocumentTypeName');

    if (error) {
      console.error('Supabase error fetching document types:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!documentTypes || documentTypes.length === 0) {
      console.log('No document types found');
      return NextResponse.json([]);
    }

    console.log('Successfully fetched document types:', documentTypes);
    return NextResponse.json(documentTypes);
  } catch (error) {
    console.error('Unexpected error in document-types GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { DocumentTypeName, AllowedFileTypes, Template } = await request.json();

    if (!DocumentTypeName) {
      return NextResponse.json(
        { error: 'Document type name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('DocumentType')
      .insert([{ 
        DocumentTypeName,
        AllowedFileTypes: AllowedFileTypes || ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'],
        Template: Template || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating document type:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in document-types POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 