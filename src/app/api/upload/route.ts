import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { validateImageFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file (assuming this is for image uploads, adjust as needed)
        const validation = validateImageFile(file, true);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        // Additional security check: verify file size
        if (file.size > FILE_SIZE_LIMITS.IMAGE) {
            return NextResponse.json(
                { error: `File size exceeds maximum limit of ${FILE_SIZE_LIMITS.IMAGE / (1024 * 1024)}MB` },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a unique filename with sanitized extension
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        const fileName = `${timestamp}.${fileExt}`;

        // Save the file
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        // Return the public URL
        const url = `/uploads/${fileName}`;
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Error in upload API:', error);
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 