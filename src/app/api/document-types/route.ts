import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all document types from Supabase
    const { data: documentTypes, error } = await supabaseAdmin
      .from('DocumentType')
      .select('*')
      .order('DocumentTypeName', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(documentTypes);
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document types' },
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
    if (!data.DocumentTypeName) {
      return NextResponse.json(
        { error: 'Document type name is required' },
        { status: 400 }
      );
    }

    // Create document type in Supabase
    const { data: newDocumentType, error } = await supabaseAdmin
      .from('DocumentType')
      .insert([
        {
          DocumentTypeName: data.DocumentTypeName,
          Description: data.Description,
          IsRequired: data.IsRequired || false,
          CreatedBy: user.id,
          CreatedDate: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(newDocumentType);
  } catch (error) {
    console.error('Error creating document type:', error);
    return NextResponse.json(
      { error: 'Failed to create document type' },
      { status: 500 }
    );
  }
} 