import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { parse } from 'csv-parse/sync';
import { disciplinaryActionService } from '@/services/disciplinaryActionService';
import { disciplinaryService } from '@/services/disciplinaryService';
import { DisciplinaryActionType, DisciplinaryActionStatus } from '@prisma/client';
import { sanitizeString } from '@/lib/formValidation';
import { validateCSVFile, FILE_SIZE_LIMITS } from '@/lib/fileValidation';

// Valid action types from enum
const VALID_ACTION_TYPES: DisciplinaryActionType[] = [
  'VerbalWarning',
  'WrittenWarning',
  'FinalWarning',
  'Suspension',
  'Demotion',
  'SalaryReduction',
  'Termination',
  'Probation',
  'Training',
  'Counseling',
  'Other',
];

// Valid action statuses from enum
const VALID_STATUSES: DisciplinaryActionStatus[] = [
  'Pending',
  'Active',
  'Completed',
  'Cancelled',
  'Appealed',
];

interface ActionRow {
  [key: string]: string | undefined;
}

/**
 * Sanitize and validate action type
 */
function sanitizeAndValidateActionType(input: string | undefined): {
  valid: boolean;
  value?: DisciplinaryActionType;
  error?: string;
} {
  if (!input || !input.trim()) {
    return { valid: false, error: 'Action type is required' };
  }

  const sanitized = sanitizeString(input, 50).trim();
  
  // Try to match case-insensitively with flexible matching
  // Handle variations like "Verbal Warning", "verbal_warning", "VerbalWarning", etc.
  const normalized = sanitized.replace(/[\s_-]/g, '').toLowerCase();
  
  // Build a mapping of normalized variations to enum values
  const typeVariations: Record<string, DisciplinaryActionType> = {};
  VALID_ACTION_TYPES.forEach((type) => {
    // Add camelCase version
    const camelCase = type;
    typeVariations[camelCase.toLowerCase()] = type;
    
    // Add spaced version (e.g., "Verbal Warning")
    const spaced = type.replace(/([A-Z])/g, ' $1').trim();
    typeVariations[spaced.replace(/[\s_-]/g, '').toLowerCase()] = type;
    
    // Add underscore version (e.g., "verbal_warning")
    const underscored = type.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    typeVariations[underscored.replace(/[\s_-]/g, '').toLowerCase()] = type;
  });
  
  const matched = typeVariations[normalized] || VALID_ACTION_TYPES.find(
    (type) => type.toLowerCase() === normalized
  );

  if (!matched) {
    return {
      valid: false,
      error: `Invalid action type: "${sanitized}". Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
    };
  }

  return { valid: true, value: matched };
}

/**
 * Sanitize and validate status
 */
function sanitizeAndValidateStatus(input: string | undefined): {
  valid: boolean;
  value?: DisciplinaryActionStatus;
  error?: string;
} {
  if (!input || !input.trim()) {
    // Status is optional, default to Pending
    return { valid: true, value: 'Pending' };
  }

  const sanitized = sanitizeString(input, 20).trim();
  const normalized = sanitized.replace(/\s+/g, '');
  const matched = VALID_STATUSES.find(
    (status) => status.toLowerCase() === normalized.toLowerCase()
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
function parseDate(input: string | undefined, fieldName: string): {
  valid: boolean;
  value?: Date;
  error?: string;
} {
  if (!input || !input.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }

  const sanitized = sanitizeString(input, 50).trim();
  const date = new Date(sanitized);

  if (isNaN(date.getTime())) {
    return { valid: false, error: `Invalid ${fieldName}: "${sanitized}". Expected date format (YYYY-MM-DD or ISO format)` };
  }

  // Check if date is too far in the past (more than 10 years)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  if (date < tenYearsAgo) {
    return { valid: false, error: `${fieldName} cannot be more than 10 years in the past` };
  }

  // Check if date is too far in the future (more than 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (date > oneYearFromNow) {
    return { valid: false, error: `${fieldName} cannot be more than 1 year in the future` };
  }

  return { valid: true, value: date };
}

/**
 * Find disciplinary record by case number or ID
 */
async function findDisciplinaryRecord(identifier: string): Promise<{
  found: boolean;
  recordId?: string;
  error?: string;
}> {
  if (!identifier || !identifier.trim()) {
    return { found: false, error: 'Disciplinary record identifier is required' };
  }

  const sanitized = sanitizeString(identifier, 50).trim();

  try {
    // Try by case number first
    const recordByCaseNo = await disciplinaryService.getDisciplinaryRecordByCaseNo(sanitized);
    if (recordByCaseNo) {
      return { found: true, recordId: recordByCaseNo.id };
    }

    // Try by ID
    const recordById = await disciplinaryService.getDisciplinaryRecordById(sanitized);
    if (recordById) {
      return { found: true, recordId: recordById.id };
    }

    return { found: false, error: `Disciplinary record not found: "${sanitized}"` };
  } catch (error) {
    return {
      found: false,
      error: `Error looking up disciplinary record: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract field value from CSV row with flexible column mapping
 */
function getField(row: ActionRow, keys: string[]): string | undefined {
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

    // Read and parse CSV
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileContent = fileBuffer.toString('utf-8');

    let records: ActionRow[];
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

    // Validate required columns exist (flexible matching)
    const firstRow = records[0];
    const hasCaseNo = Object.keys(firstRow).some((key) =>
      /case/i.test(key) && /no|number|id/i.test(key)
    );
    const hasActionType = Object.keys(firstRow).some((key) =>
      /action/i.test(key) && /type/i.test(key)
    );
    const hasEffectiveDate = Object.keys(firstRow).some((key) =>
      /effective/i.test(key) && /date/i.test(key)
    );
    const hasDescription = Object.keys(firstRow).some((key) =>
      /description|desc|details/i.test(key)
    );

    if (!hasCaseNo || !hasActionType || !hasEffectiveDate || !hasDescription) {
      return NextResponse.json(
        {
          error: 'Missing required columns in CSV',
          details: {
            required: [
              'Case No. or Case Number or Disciplinary Record ID',
              'Action Type',
              'Effective Date',
              'Description',
            ],
            optional: ['End Date', 'Status', 'Notes'],
          },
        },
        { status: 400 }
      );
    }

    // Process each row
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      created: [] as string[], // IDs of created actions
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 because row 1 is header, rows start at 2

      try {
        // Extract and validate fields with flexible column mapping
        const caseNoOrId = getField(row, [
          'caseno',
          'caseno.',
          'casenumber',
          'case_no',
          'disciplinaryrecordid',
          'disciplinary_record_id',
          'recordid',
          'record_id',
        ]);

        const actionTypeStr = getField(row, [
          'actiontype',
          'action_type',
          'type',
          'action',
        ]);

        const effectiveDateStr = getField(row, [
          'effectivedate',
          'effective_date',
          'startdate',
          'start_date',
        ]);

        const descriptionStr = getField(row, [
          'description',
          'desc',
          'details',
        ]);

        const endDateStr = getField(row, [
          'enddate',
          'end_date',
          'expirationdate',
          'expiration_date',
        ]);

        const statusStr = getField(row, ['status', 'actionstatus', 'action_status']);

        const notesStr = getField(row, ['notes', 'note', 'additionalnotes', 'additional_notes']);

        // Validate required fields
        if (!caseNoOrId) {
          throw new Error('Missing Case No. or Disciplinary Record ID');
        }

        if (!actionTypeStr) {
          throw new Error('Missing Action Type');
        }

        if (!effectiveDateStr) {
          throw new Error('Missing Effective Date');
        }

        if (!descriptionStr) {
          throw new Error('Missing Description');
        }

        // Sanitize and validate action type
        const actionTypeValidation = sanitizeAndValidateActionType(actionTypeStr);
        if (!actionTypeValidation.valid || !actionTypeValidation.value) {
          throw new Error(actionTypeValidation.error || 'Invalid action type');
        }

        // Validate and parse dates
        const effectiveDateValidation = parseDate(effectiveDateStr, 'Effective Date');
        if (!effectiveDateValidation.valid || !effectiveDateValidation.value) {
          throw new Error(effectiveDateValidation.error || 'Invalid effective date');
        }

        let endDate: Date | undefined;
        if (endDateStr) {
          const endDateValidation = parseDate(endDateStr, 'End Date');
          if (!endDateValidation.valid || !endDateValidation.value) {
            throw new Error(endDateValidation.error || 'Invalid end date');
          }
          endDate = endDateValidation.value;

          // Validate end date is after effective date
          if (endDate < effectiveDateValidation.value) {
            throw new Error('End Date must be after Effective Date');
          }
        }

        // Sanitize and validate status
        const statusValidation = sanitizeAndValidateStatus(statusStr);
        if (!statusValidation.valid || !statusValidation.value) {
          throw new Error(statusValidation.error || 'Invalid status');
        }

        // Sanitize description (required, max 5000 chars)
        const description = sanitizeString(descriptionStr, 5000);
        if (!description || description.length === 0) {
          throw new Error('Description is required and cannot be empty');
        }

        // Sanitize notes (optional, max 2000 chars)
        const notes = notesStr ? sanitizeString(notesStr, 2000) : undefined;

        // Find disciplinary record
        const recordLookup = await findDisciplinaryRecord(caseNoOrId);
        if (!recordLookup.found || !recordLookup.recordId) {
          throw new Error(recordLookup.error || 'Disciplinary record not found');
        }

        // Create the disciplinary action
        const action = await disciplinaryActionService.createAction({
          disciplinaryRecordId: recordLookup.recordId,
          actionType: actionTypeValidation.value,
          effectiveDate: effectiveDateValidation.value,
          endDate: endDate,
          description: description,
          status: statusValidation.value,
          notes: notes,
          createdBy: user.id,
        });

        results.success++;
        results.created.push(action.id);
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
      createdActionIds: results.created,
    });
  } catch (error) {
    console.error('Error importing disciplinary actions:', error);
    return NextResponse.json(
      {
        error: 'Failed to import disciplinary actions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
