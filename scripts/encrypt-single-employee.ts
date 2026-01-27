/**
 * Safe Script: Encrypt a Single Employee's Data
 * 
 * This script encrypts data for ONE employee at a time.
 * Much safer than bulk migration - you can test on one record first.
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/encrypt-single-employee.ts <employeeId>
 * 
 * Example:
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/encrypt-single-employee.ts 2026-0001
 */

import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, isEncrypted } from '../src/lib/encryption';

const prisma = new PrismaClient();

const SALARY_ENCRYPTED_FIELDS = ['SalaryAmount', 'SalaryGrade'] as const;
const GOVERNMENT_ID_ENCRYPTED_FIELDS = [
  'SSSNumber',
  'TINNumber',
  'PhilHealthNumber',
  'PagIbigNumber',
  'GSISNumber',
  'PRCLicenseNumber',
  'BIRNumber',
  'PassportNumber',
] as const;
const MEDICAL_ENCRYPTED_FIELDS = [
  'medicalNotes',
  'allergies',
  'disabilityDetails',
  'pwdIdNumber',
  'healthInsuranceNumber',
  'physicianContact',
  'emergencyProcedures',
  'bloodType',
  'accommodationsNeeded',
  'emergencyProtocol',
  'disabilityCertification',
  'assistiveTechnology',
  'mobilityAids',
  'communicationNeeds',
  'workplaceModifications',
] as const;

async function encryptSingleEmployee(employeeId: string) {
  console.log(`\n🔐 Encrypting data for employee: ${employeeId}\n`);

  try {
    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: employeeId },
    });

    if (!employee) {
      console.error(`❌ Employee ${employeeId} not found`);
      process.exit(1);
    }

    console.log(`✅ Found employee: ${employee.FirstName} ${employee.LastName}\n`);

    let totalEncrypted = 0;
    let totalSkipped = 0;

    // Encrypt EmploymentDetail (Salary)
    try {
      const empDetail = await prisma.employmentDetail.findFirst({
        where: { employeeId },
      });

      if (empDetail) {
        const updates: any = {};
        let needsUpdate = false;

        for (const field of SALARY_ENCRYPTED_FIELDS) {
          const value = (empDetail as any)[field];
          if (value != null) {
            const stringValue = String(value);
            if (!isEncrypted(stringValue)) {
              const encryptedValue = encrypt(stringValue, 'salary');
              if (encryptedValue) {
                updates[field] = encryptedValue;
                needsUpdate = true;
                console.log(`  🔒 Encrypting ${field}...`);
              }
            } else {
              console.log(`  ⏭️  ${field} already encrypted`);
              totalSkipped++;
            }
          }
        }

        if (needsUpdate) {
          // Verify encryption works before saving
          const testDecrypt = Object.keys(updates).every(key => {
            try {
              const encrypted = updates[key];
              if (encrypted && isEncrypted(encrypted)) {
                const decrypted = decrypt(encrypted, 'salary');
                return decrypted !== null;
              }
              return true;
            } catch {
              return false;
            }
          });

          if (!testDecrypt) {
            console.error(`  ⚠️  Warning: Could not verify encryption, skipping update`);
            return;
          }

          await prisma.employmentDetail.update({
            where: { id: empDetail.id },
            data: updates,
          });
          totalEncrypted += Object.keys(updates).length;
          console.log(`  ✅ Encrypted ${Object.keys(updates).length} salary field(s)\n`);
        } else {
          console.log(`  ℹ️  No salary fields need encryption\n`);
        }
      } else {
        console.log(`  ℹ️  No employment detail found\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error encrypting employment detail:`, error);
    }

    // Encrypt GovernmentID
    try {
      const govId = await prisma.governmentID.findFirst({
        where: { employeeId },
      });

      if (govId) {
        const updates: any = {};
        let needsUpdate = false;

        for (const field of GOVERNMENT_ID_ENCRYPTED_FIELDS) {
          const value = (govId as any)[field];
          if (value && !isEncrypted(value)) {
            const encryptedValue = encrypt(value, 'government');
            if (encryptedValue) {
              updates[field] = encryptedValue;
              needsUpdate = true;
              console.log(`  🔒 Encrypting ${field}...`);
            }
          }
        }

        if (needsUpdate) {
          await prisma.governmentID.update({
            where: { id: govId.id },
            data: updates,
          });
          totalEncrypted += Object.keys(updates).length;
          console.log(`  ✅ Encrypted ${Object.keys(updates).length} government ID field(s)\n`);
        } else {
          console.log(`  ℹ️  No government ID fields need encryption\n`);
        }
      } else {
        console.log(`  ℹ️  No government ID found\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error encrypting government ID:`, error);
    }

    // Encrypt MedicalInfo
    try {
      const medical = await prisma.medicalInfo.findFirst({
        where: { employeeId },
      });

      if (medical) {
        const updates: any = {};
        let needsUpdate = false;

        for (const field of MEDICAL_ENCRYPTED_FIELDS) {
          const value = (medical as any)[field];
          if (value && !isEncrypted(value)) {
            const encryptedValue = encrypt(value, 'medical');
            if (encryptedValue) {
              updates[field] = encryptedValue;
              needsUpdate = true;
              console.log(`  🔒 Encrypting ${field}...`);
            }
          }
        }

        if (needsUpdate) {
          await prisma.medicalInfo.update({
            where: { id: medical.id },
            data: updates,
          });
          totalEncrypted += Object.keys(updates).length;
          console.log(`  ✅ Encrypted ${Object.keys(updates).length} medical field(s)\n`);
        } else {
          console.log(`  ℹ️  No medical fields need encryption\n`);
        }
      } else {
        console.log(`  ℹ️  No medical info found\n`);
      }
    } catch (error) {
      console.error(`  ❌ Error encrypting medical info:`, error);
    }

    console.log(`\n✅ Summary:`);
    console.log(`   - Encrypted: ${totalEncrypted} field(s)`);
    console.log(`   - Skipped (already encrypted): ${totalSkipped} field(s)`);
    console.log(`\n✅ Employee ${employeeId} encryption completed!\n`);

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get employee ID from command line
const employeeId = process.argv[2];

if (!employeeId) {
  console.error('❌ Error: Employee ID required');
  console.error('Usage: npx ts-node scripts/encrypt-single-employee.ts <employeeId>');
  console.error('Example: npx ts-node scripts/encrypt-single-employee.ts 2026-0001');
  process.exit(1);
}

encryptSingleEmployee(employeeId);
