import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { parse } from 'csv-parse/sync';
import { prisma } from '@/lib/prisma';

type CandidateRow = {
  'Last Name': string;
  'First Name': string;
  'Middle Name'?: string;
  'Extension Name'?: string;
  'Email': string;
  'Contact Number'?: string;
  'Sex'?: string;
  'Date of Birth'?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req) || {};
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const vacancyId = formData.get('vacancyId') as string;

    if (!file || !vacancyId) {
      return NextResponse.json(
        { error: 'File and vacancy ID are required' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString();

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const record of records) {
      try {
        const row = record as CandidateRow;
        
        // Validate required fields
        if (!row['Last Name'] || !row['First Name'] || !row['Email']) {
          throw new Error(`Missing required fields for candidate: ${row['Last Name'] || ''} ${row['First Name'] || ''}`);
        }

        const candidate = {
          VacancyID: parseInt(vacancyId),
          LastName: row['Last Name'],
          FirstName: row['First Name'],
          MiddleName: row['Middle Name'] || null,
          ExtensionName: row['Extension Name'] || null,
          Email: row['Email'],
          ContactNumber: row['Contact Number'] || null,
          Sex: row['Sex'] || null,
          DateOfBirth: row['Date of Birth'] ? new Date(row['Date of Birth']) : null,
          Status: 'ApplicationInitiated',
          DateApplied: new Date(),
          FullName: `${row['Last Name']}, ${row['First Name']}${row['Middle Name'] ? ` ${row['Middle Name']}` : ''}${row['Extension Name'] ? ` ${row['Extension Name']}` : ''}`
        };

        // Validate email format
        if (!/\S+@\S+\.\S+/.test(candidate.Email)) {
          throw new Error('Invalid email format');
        }

        // Insert the candidate
        const { error } = await supabaseAdmin
          .from('Candidate')
          .insert([candidate]);

        if (error) throw error;
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error importing candidates:', error);
    return NextResponse.json(
      { error: 'Failed to import candidates' },
      { status: 500 }
    );
  }
} 