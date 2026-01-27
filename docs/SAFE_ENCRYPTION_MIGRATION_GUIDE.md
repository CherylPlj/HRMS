# Safe Encryption Migration Guide

This guide walks you through encrypting existing data in your database **without losing any data**.

## ⚠️ Critical Prerequisites

### 1. Database Backup (MANDATORY)

**Before doing anything, backup your database:**

```bash
# For PostgreSQL/Supabase
pg_dump your_database > backup_before_encryption_$(date +%Y%m%d_%H%M%S).sql

# Or use Supabase dashboard:
# Settings → Database → Backups → Create backup
```

### 2. Set Encryption Key

Make sure `ENCRYPTION_KEY` is set in your environment:

```bash
# Check if it's set
echo $ENCRYPTION_KEY

# If not set, add to .env.local:
ENCRYPTION_KEY=your_base64_encoded_32_byte_key
```

### 3. Database Schema Update (For Salary Data)

**IMPORTANT**: Before encrypting salary data, you must change the `SalaryAmount` column from `Decimal` to `TEXT` because encrypted values are strings.

Run this migration first:
```bash
# Apply the migration to change SalaryAmount to TEXT
# This is in: supabase/migrations/20250127000000_change_salary_amount_to_text.sql
```

Or manually in your database:
```sql
ALTER TABLE "EmploymentDetail" 
ALTER COLUMN "SalaryAmount" TYPE TEXT 
USING CASE 
  WHEN "SalaryAmount" IS NULL THEN NULL
  ELSE "SalaryAmount"::TEXT
END;
```

## 📋 Step-by-Step Migration Process

### Step 1: Verify Current Data

First, check what data you have:

```sql
-- Check medical records
SELECT COUNT(*) FROM "MedicalInfo";

-- Check government ID records
SELECT COUNT(*) FROM "GovernmentID";

-- Check employment records with salary
SELECT COUNT(*) FROM "EmploymentDetail" 
WHERE "SalaryAmount" IS NOT NULL OR "SalaryGrade" IS NOT NULL;
```

### Step 2: Test in Development First

**Always test in development/staging before production:**

1. Copy production data to a test database
2. Run the migration script on the test database
3. Verify all data is encrypted and can be decrypted
4. Test your application to ensure everything works

### Step 3: Run the Migration Script

The migration script is **safe** because it:
- ✅ Only encrypts plaintext data (skips already encrypted)
- ✅ Updates records one at a time (transactional)
- ✅ Preserves null/empty values
- ✅ Is idempotent (safe to run multiple times)

```bash
# Run the migration
npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/migrate-encrypt-existing-data.ts
```

### Step 4: Verify Encryption

After running, verify the data:

```sql
-- Check that data is encrypted (encrypted strings contain colons)
SELECT 
  id,
  "SalaryAmount",
  CASE 
    WHEN "SalaryAmount" LIKE '%:%:%:%' THEN 'Encrypted'
    ELSE 'Plaintext'
  END as status
FROM "EmploymentDetail"
WHERE "SalaryAmount" IS NOT NULL
LIMIT 10;
```

### Step 5: Test Decryption

Verify that encrypted data can be decrypted by your application:

```bash
# Test by fetching an employee record via API
curl http://localhost:3000/api/employees/2026-0001
```

The API should automatically decrypt and return plaintext values.

## 🔒 How the Script Protects Your Data

### Safety Features:

1. **Idempotent**: Safe to run multiple times
   - Checks `isEncrypted()` before encrypting
   - Skips already encrypted data

2. **No Data Loss**:
   - Only updates fields that need encryption
   - Preserves null values
   - Preserves empty strings
   - Updates are atomic (one record at a time)

3. **Error Handling**:
   - Continues processing even if one record fails
   - Logs errors for review
   - Doesn't rollback successful encryptions

4. **Verification**:
   - Shows count of encrypted vs skipped records
   - Reports errors separately

## 🛡️ Rollback Plan

If something goes wrong, you can rollback:

### Option 1: Restore from Backup

```bash
# Restore the backup you created
psql your_database < backup_before_encryption_YYYYMMDD_HHMMSS.sql
```

### Option 2: Decrypt Data (if needed)

If you need to decrypt data, you can create a reverse script:

```typescript
// scripts/decrypt-existing-data.ts (example)
import { PrismaClient } from '@prisma/client';
import { decrypt, isEncrypted } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function decryptSalaryData() {
  const records = await prisma.employmentDetail.findMany({
    where: {
      OR: [
        { SalaryAmount: { not: null } },
        { SalaryGrade: { not: null } }
      ]
    }
  });

  for (const record of records) {
    const updates: any = {};
    
    if (record.SalaryAmount && isEncrypted(record.SalaryAmount)) {
      updates.SalaryAmount = decrypt(record.SalaryAmount, 'salary');
    }
    
    if (record.SalaryGrade && isEncrypted(record.SalaryGrade)) {
      updates.SalaryGrade = decrypt(record.SalaryGrade, 'salary');
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.employmentDetail.update({
        where: { id: record.id },
        data: updates
      });
    }
  }
}
```

## 📊 Migration Checklist

- [ ] Database backup created
- [ ] `ENCRYPTION_KEY` environment variable set
- [ ] Database schema updated (SalaryAmount → TEXT)
- [ ] Tested in development environment
- [ ] Verified data counts before migration
- [ ] Migration script run successfully
- [ ] Verified data is encrypted (SQL check)
- [ ] Tested API decryption works
- [ ] Application tested with encrypted data

## 🚨 Common Issues & Solutions

### Issue: "ENCRYPTION_KEY not set"

**Solution**: Set the environment variable:
```bash
export ENCRYPTION_KEY=your_key_here
# Or add to .env.local
```

### Issue: "Invalid input syntax for type numeric"

**Solution**: You haven't changed `SalaryAmount` column to TEXT yet. Run the schema migration first.

### Issue: "Failed to decrypt data"

**Solution**: 
- Verify `ENCRYPTION_KEY` matches the key used for encryption
- Check if data was encrypted with a different key
- Restore from backup and re-encrypt with correct key

### Issue: Some records failed to encrypt

**Solution**: 
- Check the error logs in the script output
- Review the specific records that failed
- Manually encrypt those records if needed
- The script continues processing even if some fail

## ✅ Post-Migration Verification

After migration, verify everything works:

1. **Check encryption status**:
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE "SalaryAmount" LIKE '%:%:%:%') as encrypted,
     COUNT(*) FILTER (WHERE "SalaryAmount" IS NOT NULL AND "SalaryAmount" NOT LIKE '%:%:%:%') as plaintext
   FROM "EmploymentDetail"
   WHERE "SalaryAmount" IS NOT NULL;
   ```

2. **Test API endpoints**:
   - GET employee records (should return decrypted data)
   - UPDATE employee records (should encrypt on save)
   - Verify no errors in application logs

3. **Check application functionality**:
   - Employee profile pages load correctly
   - Salary information displays properly
   - Forms can update encrypted fields

## 📝 Notes

- The migration is **one-way** - once encrypted, you should keep it encrypted
- The encryption key is **critical** - if lost, data cannot be recovered
- Always test in development first
- Keep backups until you're 100% confident everything works
- The script processes records sequentially to avoid overwhelming the database

## 🆘 Need Help?

If you encounter issues:
1. Check the error messages in the script output
2. Verify your database backup is accessible
3. Review the encryption setup documentation: `ENCRYPTION_SETUP.md`
4. Test with a small subset of data first
