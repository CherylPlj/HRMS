# Quick Encryption Migration Guide

## 🚀 Quick Start (5 Steps)

### Step 1: Backup Database
```bash
# Create a backup first!
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

### Step 2: Set Encryption Key
```bash
# Add to .env.local
ENCRYPTION_KEY=your_base64_encoded_key_here
```

### Step 3: Update Database Schema (For Salary)
```sql
-- Change SalaryAmount from Decimal to TEXT
ALTER TABLE "EmploymentDetail" 
ALTER COLUMN "SalaryAmount" TYPE TEXT 
USING "SalaryAmount"::TEXT;
```

### Step 4: Run Migration Script
```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/migrate-encrypt-existing-data.ts
```

### Step 5: Verify
```sql
-- Check that data is encrypted (should show "Encrypted")
SELECT 
  id,
  CASE 
    WHEN "SalaryAmount" LIKE '%:%:%:%' THEN 'Encrypted ✅'
    ELSE 'Plaintext ⚠️'
  END as status
FROM "EmploymentDetail"
WHERE "SalaryAmount" IS NOT NULL
LIMIT 5;
```

## ✅ Why It's Safe

The migration script:
- ✅ **Idempotent**: Safe to run multiple times (skips already encrypted data)
- ✅ **No data loss**: Only encrypts, never deletes
- ✅ **Verification**: Tests encryption/decryption before saving
- ✅ **Error handling**: Continues even if some records fail
- ✅ **Atomic updates**: One record at a time

## 📋 Full Guide

For detailed instructions, see: `docs/SAFE_ENCRYPTION_MIGRATION_GUIDE.md`
