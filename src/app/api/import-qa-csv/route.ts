import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

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
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to text
    const fileText = await file.text();

    // Parse CSV
    let records: any[];
    try {
      records = parse(fileText, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseError) {
      console.error('CSV parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid CSV format. Please check your file structure.' },
        { status: 400 }
      );
    }

    // Validate CSV structure
    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or has no valid data' },
        { status: 400 }
      );
    }

    const firstRecord = records[0];
    if (!firstRecord.question || !firstRecord.answer) {
      return NextResponse.json(
        { error: 'CSV must have "question" and "answer" columns' },
        { status: 400 }
      );
    }

    // Find the user by Clerk ID to get the actual UserID
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { ClerkID: userId },
          { UserID: userId }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Process and save Q&A pairs
    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because CSV has header and arrays are 0-indexed

      try {
        // Validate required fields
        if (!record.question || !record.answer) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing question or answer`);
          continue;
        }

        // Trim whitespace
        const question = record.question.trim();
        const answer = record.answer.trim();

        if (question.length === 0 || answer.length === 0) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Empty question or answer`);
          continue;
        }

        // Check if this Q&A pair already exists
        const existingQuery = await prisma.aIChat.findFirst({
          where: {
            Question: question,
            UserID: user.UserID
          }
        });

        if (existingQuery) {
          // Update existing record
          await prisma.aIChat.update({
            where: { ChatID: existingQuery.ChatID },
            data: {
              Answer: answer,
              Status: 'Active'
            }
          });
        } else {
          // Create new record
          await prisma.aIChat.create({
            data: {
              Question: question,
              Answer: answer,
              UserID: user.UserID,
              Status: 'Active'
            }
          });
        }

        results.successful++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${results.successful} records processed successfully, ${results.failed} failed.`,
      results
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 