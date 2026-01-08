/**
 * Migration Script: Backfill Faculty Records
 * 
 * This script creates Faculty records for all existing employees who have:
 * - Designation = 'Faculty' in their EmploymentDetail
 * - But no corresponding record in the Faculty table
 * 
 * Run this script ONCE to migrate existing data.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface EmployeeWithDetails {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  DateOfBirth: string;
  UserID: string | null;
  DepartmentID: number | null;
  Photo: string | null;
  EmploymentDetail: {
    Position: string | null;
    HireDate: string | null;
    EmploymentStatus: string;
    Designation: string | null;
  }[];
  ContactInfo: {
    Phone: string | null;
    Email: string | null;
    PresentAddress: string | null;
    PermanentAddress: string | null;
    EmergencyContactName: string | null;
    EmergencyContactNumber: string | null;
  }[];
}

// Helper function to generate a unique Faculty ID (sequential integer)
async function generateUniqueFacultyId(): Promise<number> {
  // Get all existing Faculty IDs
  const { data: existingFaculty } = await supabase
    .from('Faculty')
    .select('FacultyID')
    .order('FacultyID', { ascending: false })
    .limit(1);

  // Start from 1 if no faculty exists, otherwise increment from the highest ID
  let nextFacultyId = 1;
  if (existingFaculty && existingFaculty.length > 0) {
    nextFacultyId = existingFaculty[0].FacultyID + 1;
  }

  // Ensure we don't have conflicts by checking if the ID already exists
  let attempts = 0;
  const maxAttempts = 1000;
  
  while (attempts < maxAttempts) {
    const { data: conflictCheck } = await supabase
      .from('Faculty')
      .select('FacultyID')
      .eq('FacultyID', nextFacultyId)
      .single();

    if (!conflictCheck) {
      return nextFacultyId;
    }

    nextFacultyId++;
    attempts++;
  }

  throw new Error('Unable to generate unique FacultyID after multiple attempts');
}

// Helper function to generate UserID
async function generateUserId(hireDate: Date): Promise<string> {
  const year = hireDate.getFullYear();
  
  // Get all UserIDs for this year
  const { data: existingUsers } = await supabase
    .from('User')
    .select('UserID')
    .like('UserID', `${year}%`);

  const usedNumbers = new Set<number>();
  
  if (existingUsers) {
    existingUsers.forEach((user: { UserID: string }) => {
      const userId = user.UserID;
      // Pattern 1: YYYY-NNNN
      const match1 = userId.match(new RegExp(`^${year}-(\\d{4})$`));
      if (match1) {
        usedNumbers.add(parseInt(match1[1], 10));
      }
      // Pattern 2: YYYYNNNN
      const match2 = userId.match(new RegExp(`^${year}(\\d{4})$`));
      if (match2) {
        usedNumbers.add(parseInt(match2[1], 10));
      }
    });
  }

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${year}${nextNumber.toString().padStart(4, '0')}`;
}

async function backfillFacultyRecords() {
  console.log('\n🔍 Starting Faculty Records Backfill Migration...\n');

  try {
    // Step 1: Get all employees with Designation = 'Faculty'
    const { data: employees, error: employeeError } = await supabase
      .from('Employee')
      .select(`
        EmployeeID,
        FirstName,
        LastName,
        DateOfBirth,
        UserID,
        DepartmentID,
        Photo,
        EmploymentDetail!inner(
          Position,
          HireDate,
          EmploymentStatus,
          Designation
        ),
        ContactInfo(
          Phone,
          Email,
          PresentAddress,
          PermanentAddress,
          EmergencyContactName,
          EmergencyContactNumber
        )
      `)
      .eq('EmploymentDetail.Designation', 'Faculty')
      .eq('isDeleted', false);

    if (employeeError) {
      throw new Error(`Failed to fetch employees: ${employeeError.message}`);
    }

    console.log(`📊 Found ${employees?.length || 0} employees with Designation = 'Faculty'\n`);

    if (!employees || employees.length === 0) {
      console.log('✅ No faculty employees found. Migration complete.\n');
      return;
    }

    const results = {
      total: employees.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as { employeeId: string; error: string }[]
    };

    // Step 2: Process each employee
    for (const employee of employees as EmployeeWithDetails[]) {
      try {
        // Check if Faculty record already exists
        const { data: existingFaculty } = await supabase
          .from('Faculty')
          .select('FacultyID')
          .eq('EmployeeID', employee.EmployeeID)
          .single();

        if (existingFaculty) {
          console.log(`⏭️  Skipping ${employee.FirstName} ${employee.LastName} (${employee.EmployeeID}) - Faculty record already exists`);
          results.skipped++;
          continue;
        }

        // Get employment details
        const employmentDetail = employee.EmploymentDetail?.[0];
        const contactInfo = employee.ContactInfo?.[0];

        if (!employmentDetail) {
          console.log(`⚠️  Warning: ${employee.FirstName} ${employee.LastName} (${employee.EmployeeID}) - No employment details found`);
          results.failed++;
          results.errors.push({
            employeeId: employee.EmployeeID,
            error: 'No employment details found'
          });
          continue;
        }

        // Get or create UserID
        let userId = employee.UserID;
        
        if (!userId) {
          const email = contactInfo?.Email || 
            `${employee.FirstName.toLowerCase()}.${employee.LastName.toLowerCase()}@sjf.edu.ph`;
          
          // Check if user with this email already exists
          const { data: existingUser } = await supabase
            .from('User')
            .select('UserID, Status, isDeleted')
            .eq('Email', email)
            .eq('isDeleted', false)
            .single();

          if (existingUser) {
            userId = existingUser.UserID;
          } else {
            // Create a new User record
            const hireDate = employmentDetail.HireDate 
              ? new Date(employmentDetail.HireDate) 
              : new Date();
            userId = await generateUserId(hireDate);

            const { error: userError } = await supabase
              .from('User')
              .insert({
                UserID: userId,
                FirstName: employee.FirstName,
                LastName: employee.LastName,
                Email: email,
                Status: 'Inactive',
                Photo: employee.Photo || '',
                PasswordHash: 'PENDING',
                DateCreated: new Date().toISOString(),
                DateModified: new Date().toISOString()
              });

            if (userError) {
              throw new Error(`Failed to create user: ${userError.message}`);
            }

            // Update Employee with UserID
            await supabase
              .from('Employee')
              .update({ UserID: userId })
              .eq('EmployeeID', employee.EmployeeID);
          }
        }

        // Generate unique FacultyID
        const facultyId = await generateUniqueFacultyId();

        // Format dates
        const dateOfBirth = new Date(employee.DateOfBirth);
        const formattedDateOfBirth = dateOfBirth.toISOString().split('T')[0];
        
        const hireDate = employmentDetail.HireDate 
          ? new Date(employmentDetail.HireDate) 
          : new Date();
        const formattedHireDate = hireDate.toISOString().split('T')[0];

        // Prepare emergency contact
        const emergencyContact = contactInfo?.EmergencyContactName 
          ? `${contactInfo.EmergencyContactName}${contactInfo.EmergencyContactNumber ? ` - ${contactInfo.EmergencyContactNumber}` : ''}`
          : null;

        // Create Faculty record
        const { error: facultyError } = await supabase
          .from('Faculty')
          .insert({
            FacultyID: facultyId,
            UserID: userId,
            EmployeeID: employee.EmployeeID,
            DateOfBirth: formattedDateOfBirth,
            Phone: contactInfo?.Phone || null,
            Address: contactInfo?.PresentAddress || contactInfo?.PermanentAddress || null,
            EmploymentStatus: employmentDetail.EmploymentStatus === 'Regular' ? 'Regular' : 'Regular',
            HireDate: formattedHireDate,
            Position: employmentDetail.Position || 'Faculty',
            DepartmentID: employee.DepartmentID,
            EmergencyContact: emergencyContact,
            EmployeeType: 'Regular'
          });

        if (facultyError) {
          throw new Error(`Failed to create faculty record: ${facultyError.message}`);
        }

        console.log(`✅ Created Faculty record for ${employee.FirstName} ${employee.LastName} (${employee.EmployeeID}) - FacultyID: ${facultyId}`);
        results.created++;

      } catch (error) {
        console.error(`❌ Error processing ${employee.FirstName} ${employee.LastName} (${employee.EmployeeID}):`, error);
        results.failed++;
        results.errors.push({
          employeeId: employee.EmployeeID,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total Employees Processed: ${results.total}`);
    console.log(`✅ Faculty Records Created: ${results.created}`);
    console.log(`⏭️  Skipped (Already Exists): ${results.skipped}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log('='.repeat(60) + '\n');

    if (results.errors.length > 0) {
      console.log('❌ Errors:\n');
      results.errors.forEach(({ employeeId, error }) => {
        console.log(`  - ${employeeId}: ${error}`);
      });
      console.log('');
    }

    console.log('✅ Migration completed!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
backfillFacultyRecords()
  .then(() => {
    console.log('🎉 Script execution completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
