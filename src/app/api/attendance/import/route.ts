import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Papa from 'papaparse';
import { DateTime } from 'luxon';

// Helper function to validate and format date
function validateAndFormatDate(date: string): { isValid: boolean; formattedDate?: string; error?: string } {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }

  // Remove any hash symbols and whitespace
  date = date.replace(/#/g, '').trim();

  // If it's a number, it might be an Excel serial date
  if (!isNaN(Number(date))) {
    try {
      // Excel dates are number of days since 1900-01-01 (minus 2 for Excel's leap year bug)
      const excelEpoch = new Date(1900, 0, -1); // Start from Dec 30, 1899 to account for Excel's system
      const milliseconds = (Number(date) - 1) * 24 * 60 * 60 * 1000;
      const dateObj = new Date(excelEpoch.getTime() + milliseconds);
      
      // Format as YYYY-MM-DD
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      
      return {
        isValid: true,
        formattedDate: `${year}-${month}-${day}`
      };
    } catch (error) {
      console.error('Error converting Excel date:', error);
      return { isValid: false, error: 'Invalid Excel date number' };
    }
  }

  // Try parsing as ISO date
  const dateObj = DateTime.fromISO(date);
  if (dateObj.isValid) {
    return {
      isValid: true,
      formattedDate: dateObj.toFormat('yyyy-MM-dd')
    };
  }

  // Try other common date formats
  const formats = [
    'M/d/yyyy',
    'MM/dd/yyyy',
    'yyyy/MM/dd',
    'dd/MM/yyyy',
    'MM-dd-yyyy',
    'yyyy-MM-dd'
  ];

  for (const format of formats) {
    const parsed = DateTime.fromFormat(date, format);
    if (parsed.isValid) {
      return {
        isValid: true,
        formattedDate: parsed.toFormat('yyyy-MM-dd')
      };
    }
  }

  return {
    isValid: false,
    error: 'Invalid date format. Please use YYYY-MM-DD or a standard date format'
  };
}

// Helper function to validate time format (HH:mm)
function isValidTime(time: string): boolean {
  if (!time) return true; // Allow empty time
  
  // Remove any hash symbols and whitespace
  time = time.replace(/#/g, '').trim();
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) return false;
  
  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 6 && hours <= 18; // Between 6 AM and 6 PM
}

// Helper function to determine status based on time in
function determineStatus(timeIn: string | null): 'PRESENT' | 'LATE' | 'NOT_RECORDED' {
  if (!timeIn) return 'NOT_RECORDED';
  
  // Remove any hash symbols and whitespace
  timeIn = timeIn.replace(/#/g, '').trim();
  
  const [hours, minutes] = timeIn.split(':').map(Number);
  if (hours > 7 || (hours === 7 && minutes >= 15)) {
    return 'LATE';
  }
  return 'PRESENT';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type and extension
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCSV && !isExcel) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a .csv file.',
        details: `File name: ${fileName}`
      }, { status: 400 });
    }

    // Read file content
    const text = await file.text();
    console.log('File content preview:', text.substring(0, 200)); // Debug log

    // Parse CSV with detailed config
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy', // Skip empty lines and trim whitespace
      transformHeader: (header: string) => header.trim().toLowerCase(),
      transform: (value: string) => value.trim()
    });

    console.log('Parsing complete:', {
      rowCount: parseResult.data.length,
      fields: parseResult.meta.fields,
      errors: parseResult.errors
    });

    const { data, errors, meta } = parseResult;

    // Filter out comment rows and empty rows
    const validData = data.filter((row: any) => {
      // Skip rows where facultyId starts with #
      if (String(row.facultyid || '').startsWith('#')) return false;
      
      // Skip empty rows
      if (!row.facultyid && !row.date && !row.timein && !row.timeout && !row.status) return false;
      
      return true;
    });

    // Log parsing results
    console.log('Parse results:', {
      dataLength: validData.length,
      errorCount: errors.length,
      headers: meta.fields,
      firstRow: validData[0]
    });

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Failed to parse file', 
        details: errors,
        parsingMeta: {
          headers: meta.fields,
          delimiter: meta.delimiter,
          linebreak: meta.linebreak,
          firstRow: validData[0] || null
        }
      }, { status: 400 });
    }

    // Validate required headers
    const requiredHeaders = ['facultyid', 'date'];
    const missingHeaders = requiredHeaders.filter(
      header => !meta.fields?.includes(header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required columns', 
        details: `Missing columns: ${missingHeaders.join(', ')}`,
        foundColumns: meta.fields
      }, { status: 400 });
    }

    const records = [];
    const invalidRows = [];

    // Validate and transform data
    for (let i = 0; i < validData.length; i++) {
      const row = validData[i] as any;
      const rowNum = i + 2; // Add 2 to account for header row and 0-based index

      console.log(`Processing row ${rowNum}:`, row);

      // Skip empty rows
      if (!row.facultyid || !row.date) {
        invalidRows.push({ 
          row: rowNum, 
          error: `Missing required fields: ${!row.facultyid ? 'facultyId' : ''} ${!row.date ? 'date' : ''}`.trim(),
          data: row
        });
        continue;
      }

      // Validate facultyId is a number
      if (isNaN(row.facultyid)) {
        invalidRows.push({
          row: rowNum,
          error: 'Faculty ID must be a number',
          data: row
        });
        continue;
      }

      // Validate date
      const dateValidation = validateAndFormatDate(row.date);
      if (!dateValidation.isValid) {
        invalidRows.push({ 
          row: rowNum, 
          error: `Date error: ${dateValidation.error}`,
          data: row
        });
        continue;
      }

      // Clean and validate times
      const timeIn = row.timein?.trim() || null;
      const timeOut = row.timeout?.trim() || null;

      if (timeIn && !isValidTime(timeIn)) {
        invalidRows.push({ 
          row: rowNum, 
          error: 'Invalid time in format or outside allowed hours (6 AM - 6 PM)',
          data: row
        });
        continue;
      }
      if (timeOut && !isValidTime(timeOut)) {
        invalidRows.push({ 
          row: rowNum, 
          error: 'Invalid time out format or outside allowed hours (6 AM - 6 PM)',
          data: row
        });
        continue;
      }

      // Clean and validate status
      const status = (row.status?.trim()?.toUpperCase() || determineStatus(timeIn)) as 'PRESENT' | 'LATE' | 'ABSENT' | 'NOT_RECORDED';

      if (!['PRESENT', 'ABSENT', 'LATE', 'NOT_RECORDED'].includes(status)) {
        invalidRows.push({ 
          row: rowNum, 
          error: 'Invalid status. Must be PRESENT, ABSENT, LATE, or NOT_RECORDED',
          data: row
        });
        continue;
      }

      records.push({
        facultyId: parseInt(row.facultyid),
        date: dateValidation.formattedDate,
        timeIn,
        timeOut,
        status,
        remarks: row.remarks?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (records.length === 0) {
      return NextResponse.json({ 
        error: 'No valid records found in file', 
        invalidRows,
        receivedData: data.slice(0, 3), // Include first few rows in error response
        parsingMeta: {
          headers: meta.fields,
          delimiter: meta.delimiter,
          linebreak: meta.linebreak
        }
      }, { status: 400 });
    }

    // Insert records
    for (const record of records) {
      try {
        // First check if a record already exists for this faculty and date
        const { data: existingRecord } = await supabaseAdmin
          .from('Attendance')
          .select('id')
          .eq('facultyId', record.facultyId)
          .eq('date', record.date)
          .single();

        if (existingRecord) {
          // Update existing record
          const { error: updateError } = await supabaseAdmin
            .from('Attendance')
            .update({
              timeIn: record.timeIn,
              timeOut: record.timeOut,
              status: record.status,
              remarks: record.remarks,
              updatedAt: new Date().toISOString()
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({ 
              error: 'Failed to update existing record', 
              details: updateError.message,
              record: record
            }, { status: 500 });
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabaseAdmin
            .from('Attendance')
            .insert([record]);

          if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json({ 
              error: 'Failed to insert new record', 
              details: insertError.message,
              record: record
            }, { status: 500 });
          }
        }
      } catch (error) {
        console.error('Error processing record:', error);
        return NextResponse.json({ 
          error: 'Failed to process record', 
          details: String(error),
          record: record
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: 'Import successful',
      totalRows: data.length,
      importedRows: records.length,
      invalidRows,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process import', 
        details: String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 