import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Dynamic import to avoid build-time issues with pdf-parse
let pdfParse: any = null;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('Received file:', file);
    if (file) {
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      // @ts-ignore
      console.log('File name:', file.name);
    } else {
      console.error('No file received in formData');
    }
    console.log('Received userId:', userId);

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    // Fallback for file.name if not present
    const originalName = (file as any).name || 'uploaded.pdf';
    const fileName = `training-doc-${userId}-${timestamp}.pdf`;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'training-docs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // For now, we'll store the file path
    const filePath = `/uploads/training-docs/${fileName}`;
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('Buffer length:', buffer.length);
    
    // Save file to public/uploads/training-docs directory
    const fullPath = join(process.cwd(), 'public', 'uploads', 'training-docs', fileName);
    console.log('Saving file to:', fullPath);
    await writeFile(fullPath, buffer);

    // Extract text from PDF using pdf-parse
    let extractedText = '';
    try {
      // Dynamically import pdf-parse to avoid build-time issues
      if (!pdfParse) {
        pdfParse = (await import('pdf-parse')).default;
      }
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } catch (err) {
      console.error('Failed to extract text from PDF:', err);
      extractedText = '';
    }

    return NextResponse.json({
      success: true,
      fileUrl: filePath,
      fileName: fileName,
      fileSize: file.size,
      fileType: file.type,
      originalName,
      extractedText,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error?.toString() },
      { status: 500 }
    );
  }
} 