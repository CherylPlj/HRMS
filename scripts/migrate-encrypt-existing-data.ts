/**
 * Migration Script: Encrypt Existing Sensitive Data
 * 
 * This script encrypts existing plaintext data in the database.
 * Run this ONCE after deploying the encryption feature.
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/migrate-encrypt-existing-data.ts
 * 
 * IMPORTANT:
 * - Backup your database before running this script
 * - Ensure ENCRYPTION_KEY is set in your environment
 * - This script is idempotent - safe to run multiple times
 */

import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt, isEncrypted } from '../src/lib/encryption';

const prisma = new PrismaClient();

// Fields to encrypt
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

const SALARY_ENCRYPTED_FIELDS = [
  'SalaryAmount',
  'SalaryGrade',
] as const;

async function encryptMedicalInfo() {
  console.log('\n🔐 Encrypting MedicalInfo records...');
  
  const medicalRecords = await prisma.medicalInfo.findMany();
  console.log(`Found ${medicalRecords.length} medical records`);

  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of medicalRecords) {
    try {
      const updates: any = {};
      let needsUpdate = false;

      for (const field of MEDICAL_ENCRYPTED_FIELDS) {
        const value = (record as any)[field];
        if (value && !isEncrypted(value)) {
          const encryptedValue = encrypt(value, 'medical');
          if (encryptedValue) {
            updates[field] = encryptedValue;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        await prisma.medicalInfo.update({
          where: { id: record.id },
          data: updates
        });
        encrypted++;
        if (encrypted % 10 === 0) {
          console.log(`  Encrypted ${encrypted} records...`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error encrypting medical record ${record.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ MedicalInfo: ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
}

async function encryptGovernmentIDs() {
  console.log('\n🔐 Encrypting GovernmentID records...');
  
  const govIdRecords = await prisma.governmentID.findMany();
  console.log(`Found ${govIdRecords.length} government ID records`);

  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of govIdRecords) {
    try {
      const updates: any = {};
      let needsUpdate = false;

      for (const field of GOVERNMENT_ID_ENCRYPTED_FIELDS) {
        const value = (record as any)[field];
        if (value && !isEncrypted(value)) {
          const encryptedValue = encrypt(value, 'government');
          if (encryptedValue) {
            updates[field] = encryptedValue;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        await prisma.governmentID.update({
          where: { id: record.id },
          data: updates
        });
        encrypted++;
        if (encrypted % 10 === 0) {
          console.log(`  Encrypted ${encrypted} records...`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error encrypting government ID record ${record.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ GovernmentID: ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
}

async function encryptSalaryData() {
  console.log('\n🔐 Encrypting EmploymentDetail salary data...');
  
  const employmentRecords = await prisma.employmentDetail.findMany({
    where: {
      OR: [
        { SalaryAmount: { not: null } },
        { SalaryGrade: { not: null } }
      ]
    }
  });
  console.log(`Found ${employmentRecords.length} employment records with salary data`);

  let encrypted = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of employmentRecords) {
    try {
      const updates: any = {};
      let needsUpdate = false;

      for (const field of SALARY_ENCRYPTED_FIELDS) {
        const value = (record as any)[field];
        if (value != null) {
          // Convert Decimal to string for encryption
          const stringValue = value.toString();
          if (!isEncrypted(stringValue)) {
            const encryptedValue = encrypt(stringValue, 'salary');
            if (encryptedValue) {
              updates[field] = encryptedValue;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        // Verify we can decrypt before saving (safety check)
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
          console.error(`⚠️  Warning: Could not verify encryption for record ${record.id}, skipping...`);
          errors++;
          continue;
        }

        await prisma.employmentDetail.update({
          where: { id: record.id },
          data: updates
        });
        encrypted++;
        if (encrypted % 10 === 0) {
          console.log(`  Encrypted ${encrypted} records...`);
        }
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error encrypting employment record ${record.id}:`, error);
      errors++;
    }
  }

  console.log(`✅ EmploymentDetail: ${encrypted} encrypted, ${skipped} skipped, ${errors} errors`);
}

async function main() {
  console.log('🚀 Starting encryption migration...');
  console.log('⚠️  Make sure you have backed up your database!');
  console.log('⚠️  Ensure ENCRYPTION_KEY is set in your environment\n');

  // Check for encryption key
  const isProduction = process.env.NODE_ENV === 'production';
  const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;

  if (!hasEncryptionKey) {
    if (isProduction) {
      console.error('❌ ERROR: ENCRYPTION_KEY environment variable is required in production!');
      console.error('   Set ENCRYPTION_KEY in your production environment variables.');
      process.exit(1);
    } else {
      console.warn('⚠️  WARNING: ENCRYPTION_KEY not set. Using default development key.');
      console.warn('⚠️  This is NOT secure for production! Set ENCRYPTION_KEY in .env.local');
      console.warn('⚠️  Continuing with default key for development...\n');
    }
  } else {
    console.log('✅ ENCRYPTION_KEY found in environment\n');
  }

  try {
    await encryptMedicalInfo();
    await encryptGovernmentIDs();
    await encryptSalaryData();

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main();
