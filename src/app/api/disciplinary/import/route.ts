import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { parse } from 'csv-parse/sync';
import { disciplinaryService } from '@/services/disciplinaryService';
import { DisciplinarySeverity, DisciplinaryStatus } from '@prisma/client';
import { sanitizeString } from '@/lib/formValidation';
import { prisma } from '@/lib/prisma';

// Valid severity levels
const VALID_SEVERITIES: DisciplinarySeverity[] = ['Minor', 'Moderate', 'Major'];

// Valid statuses
const VALID_STATUSES: DisciplinaryStatus[] = ['Ongoing', 'For_Review', 'Resolved', 'Closed'];

interface RecordRow {
  [key: string]: string | undefined;
}

/**
 * Sanitize and validate severity
 */
function sanitizeAndValidateSeverity(input: string | undefined): {
  valid: boolean;
  value?: DisciplinarySeverity;
  error?: string;
} {
  if (!input || !input.trim()) {
    return { valid: true, value: 'Minor' }; // Default to Minor
  }

  const sanitized = sanitizeString(input, 20).trim();
  const normalized = sanitized.toLowerCase();
  const matched = VALID_SEVERITIES.find((severity) => severity.toLowerCase() === normalized);

  if (!matched) {
    return {
      valid: false,
      error: `Invalid severity: "${sanitized}". Must be one of: ${VALID_SEVERITIES.join(', ')}`,
    };
  }

  return { valid: true, value: matched };
}

/**
 * Sanitize and validate status
 */
function sanitizeAndValidateStatus(input: string | undefined): {
  valid: boolean;
  value?: DisciplinaryStatus;
  error?: string;
} {
  if (!input || !input.trim()) {
    return { valid: true, value: 'Ongoing' }; // Default to Ongoing
  }

  const sanitized = sanitizeString(input, 20).trim();
  const normalized = sanitized.replace(/[\s_-]/g, '').toLowerCase();
  
  // Handle "For Review" variations
  if (normalized.includes('forreview') || normalized.includes('for_review')) {
    return { valid: true, value: 'For_Review' };
  }

  const matched = VALID_STATUSES.find(
    (status) => status.replace(/[_-]/g, '').toLowerCase() === normalized
  );

  if (!matched) {
    return {
      valid: false,
      error: `Invalid status: "${sanitized}". Must be one of: ${VALID_STATUSES.join(', ')}`,
    };
  }

  return { valid: true, value: matched };
}

/**
 * Parse and validate date
 */
function parseDate(input: string | undefined, fieldName: string, allowPast: boolean = true): {
  valid: boolean;
  value?: Date;
  error?: string;
} {
  if (!input || !input.trim()) {
    if (fieldName === 'Date Time') {
      return { valid: true, value: new Date() }; // Default to now
    }
    return { valid: false, error: `${fieldName} is required` };
  }

  const sanitized = sanitizeString(input, 50).trim();
  const date = new Date(sanitized);

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: `Invalid ${fieldName}: "${sanitized}". Expected date format (YYYY-MM-DD or ISO format)`,
    };
  }

  // Check if date is too far in the past (more than 20 years)
  if (allowPast) {
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    if (date < twentyYearsAgo) {
      return { valid: false, error: `${fieldName} cannot be more than 20 years in the past` };
    }
  }

  // Check if date is in the future (only allow up to today)
  const now = new Date();
  if (date > now) {
    return { valid: false, error: `${fieldName} cannot be in the future` };
  }

  return { valid: true, value: date };
}

/**
 * Find employee by ID or name
 */
async function findEmployee(identifier: string): Promise<{
  found: boolean;
  employeeId?: string;
  error?: string;
}> {
  if (!identifier || !identifier.trim()) {
    return { found: false, error: 'Employee identifier is required' };
  }

  const sanitized = sanitizeString(identifier, 100).trim();

  try {
    // Try by EmployeeID first (exact match)
    const employeeById = await prisma.employee.findUnique({
      where: { EmployeeID: sanitized },
      select: { EmployeeID: true },
    });

    if (employeeById) {
      return { found: true, employeeId: employeeById.EmployeeID };
    }

    // Try by name - handle full name (e.g., "John Doe") or partial match
    const nameParts = sanitized.split(/\s+/).filter(part => part.length > 0);
    
    if (nameParts.length >= 2) {
      // Full name search - try FirstName + LastName
      const employeeByFullName = await prisma.employee.findFirst({
        where: {
          AND: [
            { FirstName: { contains: nameParts[0], mode: 'insensitive' } },
            { LastName: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' } },
          ],
        },
        select: { EmployeeID: true },
      });

      if (employeeByFullName) {
        return { found: true, employeeId: employeeByFullName.EmployeeID };
      }
    }

    // Try partial match on FirstName or LastName
    const employeeByName = await prisma.employee.findFirst({
      where: {
        OR: [
          { FirstName: { contains: sanitized, mode: 'insensitive' } },
          { LastName: { contains: sanitized, mode: 'insensitive' } },
        ],
      },
      select: { EmployeeID: true },
    });

    if (employeeByName) {
      return { found: true, employeeId: employeeByName.EmployeeID };
    }

    return { found: false, error: `Employee not found: "${sanitized}"` };
  } catch (error) {
    return {
      found: false,
      error: `Error looking up employee: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract field value from CSV row with flexible column mapping
 */
function getField(row: RecordRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[\s_\.-]/g, '');

    // Check exact match first
    if (row[key] !== undefined && row[key] !== '') {
      return row[key]?.trim();
    }

    // Check normalized keys
    for (const rowKey of Object.keys(row)) {
      const normalizedRowKey = rowKey.toLowerCase().replace(/[\s_\.-]/g, '');
      if (normalizedRowKey === normalizedKey && row[rowKey] && row[rowKey] !== '') {
        return row[rowKey]?.trim();
      }
    }
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 5MB' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString('utf-8');

    let records: RecordRow[];
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true, // Handle UTF-8 BOM
      });
    } catch (parseError) {
      return NextResponse.json(
        {
          error: 'Failed to parse CSV file',
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
        },
        { status: 400 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or has no valid rows' },
        { status: 400 }
      );
    }

    // Process each row
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      created: [] as string[], // IDs of created records
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 because row 1 is header, rows start at 2

      try {
        // Extract and validate fields with flexible column mapping
        const employeeIdOrName = getField(row, [
          'employee',
          'employeename',
          'employee_name',
          'employeeid',
          'employee_id',
        ]);

        const category = getField(row, ['category']);
        const violation = getField(row, ['violationtype', 'violation_type', 'violation']);
        const severityStr = getField(row, ['severity']);
        const statusStr = getField(row, ['status']);
        const dateTimeStr = getField(row, [
          'date&time',
          'datetime',
          'date_time',
          'date',
          'occurrencedate',
          'occurrence_date',
        ]);
        const resolution = getField(row, ['resolution']);
        const resolutionDateStr = getField(row, ['resolutiondate', 'resolution_date']);
        const remarks = getField(row, ['remarks']);
        const interviewNotes = getField(row, ['interviewnotes', 'interview_notes']);
        const hrRemarks = getField(row, ['hrremarks', 'hr_remarks']);
        const recommendedPenalty = getField(row, ['recommendedpenalty', 'recommended_penalty']);
        const supervisorId = getField(row, ['supervisorid', 'supervisor_id']);
        const offenseCountStr = getField(row, ['offensecount', 'offense_count']);

        // Validate required fields
        if (!employeeIdOrName) {
          throw new Error('Missing Employee ID or Name');
        }

        if (!category) {
          throw new Error('Missing Category');
        }

        if (!violation) {
          throw new Error('Missing Violation Type');
        }

        // Find employee
        const employeeLookup = await findEmployee(employeeIdOrName);
        if (!employeeLookup.found || !employeeLookup.employeeId) {
          throw new Error(employeeLookup.error || 'Employee not found');
        }

        // Sanitize category and violation
        const sanitizedCategory = sanitizeString(category, 200);
        if (!sanitizedCategory || sanitizedCategory.length === 0) {
          throw new Error('Category is required and cannot be empty');
        }

        const sanitizedViolation = sanitizeString(violation, 200);
        if (!sanitizedViolation || sanitizedViolation.length === 0) {
          throw new Error('Violation Type is required and cannot be empty');
        }

        // Validate and parse dates
        const dateTimeValidation = parseDate(dateTimeStr, 'Date Time', true);
        if (!dateTimeValidation.valid || !dateTimeValidation.value) {
          throw new Error(dateTimeValidation.error || 'Invalid date/time');
        }

        let resolutionDate: Date | undefined;
        if (resolutionDateStr) {
          const resolutionDateValidation = parseDate(resolutionDateStr, 'Resolution Date', true);
          if (!resolutionDateValidation.valid || !resolutionDateValidation.value) {
            throw new Error(resolutionDateValidation.error || 'Invalid resolution date');
          }
          resolutionDate = resolutionDateValidation.value;

          // Validate resolution date is after occurrence date
          if (resolutionDate < dateTimeValidation.value) {
            throw new Error('Resolution Date must be after Date & Time');
          }
        }

        // Sanitize and validate severity
        const severityValidation = sanitizeAndValidateSeverity(severityStr);
        if (!severityValidation.valid || !severityValidation.value) {
          throw new Error(severityValidation.error || 'Invalid severity');
        }

        // Sanitize and validate status
        const statusValidation = sanitizeAndValidateStatus(statusStr);
        if (!statusValidation.valid || !statusValidation.value) {
          throw new Error(statusValidation.error || 'Invalid status');
        }

        // Sanitize optional text fields
        const sanitizedResolution = resolution ? sanitizeString(resolution, 5000) : undefined;
        const sanitizedRemarks = remarks ? sanitizeString(remarks, 2000) : undefined;
        const sanitizedInterviewNotes = interviewNotes ? sanitizeString(interviewNotes, 5000) : undefined;
        const sanitizedHrRemarks = hrRemarks ? sanitizeString(hrRemarks, 2000) : undefined;
        const sanitizedRecommendedPenalty = recommendedPenalty
          ? sanitizeString(recommendedPenalty, 500)
          : undefined;

        // Parse offense count
        let offenseCount = 1; // Default to 1
        if (offenseCountStr) {
          const parsed = parseInt(offenseCountStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            offenseCount = parsed;
          }
        }

        // Create the disciplinary record
        const record = await disciplinaryService.createDisciplinaryRecord({
          employeeId: employeeLookup.employeeId,
          supervisorId: supervisorId || undefined,
          category: sanitizedCategory,
          violation: sanitizedViolation,
          severity: severityValidation.value,
          status: statusValidation.value,
          dateTime: dateTimeValidation.value,
          resolution: sanitizedResolution,
          resolutionDate: resolutionDate,
          remarks: sanitizedRemarks,
          interviewNotes: sanitizedInterviewNotes,
          hrRemarks: sanitizedHrRemarks,
          recommendedPenalty: sanitizedRecommendedPenalty,
          offenseCount: offenseCount,
          createdBy: user.id,
        });

        results.success++;
        results.created.push(record.id);
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        results.errors.push(`Row ${rowNumber}: ${errorMessage}`);
      }
    }

    // Return results
    return NextResponse.json({
      message: `Import completed: ${results.success} succeeded, ${results.failed} failed`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      createdRecordIds: results.created,
    });
  } catch (error) {
    console.error('Error importing disciplinary records:', error);
    return NextResponse.json(
      {
        error: 'Failed to import disciplinary records',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
