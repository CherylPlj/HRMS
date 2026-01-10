import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import { JobTitle, VacancyStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { validateCSVFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';

type VacancyRow = {
  JobTitle: string;
  VacancyName: string;
  Description?: string;
  HiringManager: string;
  Status: string;
  NumberOfPositions: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate CSV file
    const fileValidation = validateCSVFile(file, true);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    // Additional security check: verify file size
    if (file.size > FILE_SIZE_LIMITS.CSV) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${FILE_SIZE_LIMITS.CSV / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString();

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        const row = record as VacancyRow;

        // Validate required fields
        if (!row.JobTitle || !row.VacancyName || !row.HiringManager || !row.Status || !row.NumberOfPositions) {
          throw new Error('Missing required fields');
        }

        // Validate JobTitle
        if (!Object.values(JobTitle).includes(row.JobTitle as JobTitle)) {
          throw new Error(`Invalid JobTitle: ${row.JobTitle}`);
        }

        // Validate Status
        if (!Object.values(VacancyStatus).includes(row.Status as VacancyStatus)) {
          throw new Error(`Invalid Status: ${row.Status}`);
        }

        // Validate NumberOfPositions
        const numberOfPositions = parseInt(row.NumberOfPositions);
        if (isNaN(numberOfPositions) || numberOfPositions < 1) {
          throw new Error(`Invalid NumberOfPositions: ${row.NumberOfPositions}`);
        }

        // Set DatePosted based on Status
        const datePosted = row.Status === 'Active' 
          ? DateTime.now().setZone('Asia/Manila').toJSDate()
          : null;

        await prisma.vacancy.create({
          data: {
            JobTitle: row.JobTitle as JobTitle,
            VacancyName: row.VacancyName,
            Description: row.Description,
            HiringManager: row.HiringManager,
            Status: row.Status as VacancyStatus,
            DatePosted: datePosted,
            NumberOfPositions: numberOfPositions
          }
        });

        success++;
      } catch (error) {
        failed++;
        errors.push(`Row ${failed + success}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({ success, failed, errors });
  } catch (error) {
    console.error('Error importing vacancies:', error);
    return NextResponse.json(
      { error: 'Failed to import vacancies' },
      { status: 500 }
    );
  }
} 