import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const { data: documentTypes, error } = await supabaseAdmin
      .from('DocumentType')
      .select('*')
      .order('DocumentTypeName');

    if (error) {
      console.error('Error fetching document types:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(documentTypes);
  } catch (error) {
    console.error('Error in document-types GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
        AllowedFileTypes: AllowedFileTypes || ['.pdf', '.doc', '.docx'],
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