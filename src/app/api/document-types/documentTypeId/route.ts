// import { NextResponse } from 'next/server';
// import { supabaseAdmin } from '@/lib/supabaseAdmin';
// import { currentUser } from '@clerk/nextjs/server';

// export async function GET(
//   request: Request,
//   context: { params: { documentTypeId: string } }
// ) {
//   try {
//     const user = await currentUser();
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { params } = context;
//     const documentTypeId = parseInt((await params).documentTypeId);

//     // Get document type from Supabase
//     const { data: documentType, error } = await supabaseAdmin
//       .from('DocumentType')
//       .select('*')
//       .eq('DocumentTypeID', documentTypeId)
//       .single();

//     if (error || !documentType) {
//       return NextResponse.json(
//         { error: 'Document type not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(documentType);
//   } catch (error) {
//     console.error('Error fetching document type:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch document type details' },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(
//   request: Request,
//   context: { params: { documentTypeId: string } }
// ) {
//   try {
//     const user = await currentUser();
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { params } = context;
//     const documentTypeId = parseInt((await params).documentTypeId);
//     const data = await request.json();

//     // Validate required fields
//     if (!data.DocumentTypeName) {
//       return NextResponse.json(
//         { error: 'Document type name is required' },
//         { status: 400 }
//       );
//     }

//     // Update document type in Supabase
//     const { data: updatedDocumentType, error } = await supabaseAdmin
//       .from('DocumentType')
//       .update({
//         DocumentTypeName: data.DocumentTypeName,
//         Description: data.Description,
//         IsRequired: data.IsRequired,
//         LastModifiedBy: user.id,
//         LastModifiedDate: new Date().toISOString()
//       })
//       .eq('DocumentTypeID', documentTypeId)
//       .select()
//       .single();

//     if (error) {
//       throw error;
//     }

//     return NextResponse.json(updatedDocumentType);
//   } catch (error) {
//     console.error('Error updating document type:', error);
//     return NextResponse.json(
//       { error: 'Failed to update document type' },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(
//   request: Request,
//   context: { params: { documentTypeId: string } }
// ) {
//   try {
//     const user = await currentUser();
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { params } = context;
//     const documentTypeId = parseInt((await params).documentTypeId);

//     // Check if there are any documents using this type
//     const { data: documents, error: checkError } = await supabaseAdmin
//       .from('Document')
//       .select('DocumentID')
//       .eq('DocumentTypeID', documentTypeId);

//     if (checkError) {
//       throw checkError;
//     }

//     if (documents && documents.length > 0) {
//       return NextResponse.json(
//         { error: 'Cannot delete document type that is in use' },
//         { status: 400 }
//       );
//     }

//     // Delete document type from Supabase
//     const { error } = await supabaseAdmin
//       .from('DocumentType')
//       .delete()
//       .eq('DocumentTypeID', documentTypeId);

//     if (error) {
//       throw error;
//     }

//     return NextResponse.json({ message: 'Document type deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting document type:', error);
//     return NextResponse.json(
//       { error: 'Failed to delete document type' },
//       { status: 500 }
//     );
//   }
// } 