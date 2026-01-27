# Lazy Encryption Guide (No Migration Required)

This guide shows you how to encrypt existing data **gradually** without running a bulk migration. Data will be encrypted automatically as it's accessed and updated through your application.

## ✅ Why This Approach is Safer

- **No bulk operations**: No risk of losing all data at once
- **Automatic**: Data encrypts itself when updated
- **Gradual**: Only encrypts data that's actually being used
- **Reversible**: If something goes wrong, only affects one record
- **No downtime**: Application continues working normally

## 🔄 How It Works

Your system already supports this! Here's what happens:

1. **When Reading Data**: 
   - If data is encrypted → decrypts it automatically
   - If data is plaintext → returns it as-is (no error)

2. **When Updating Data**:
   - If you update a field → encrypts it before saving
   - Old plaintext data stays plaintext until updated

3. **Gradual Migration**:
   - As users update employee records, salary data gets encrypted
   - As users update medical info, medical data gets encrypted
   - No bulk operation needed!

## 📋 What You Need to Do

### Step 1: Update Database Schema (For Salary Only)

**IMPORTANT**: Before encrypting salary data, change the `SalaryAmount` column type:

```sql
-- Run this SQL in your database
ALTER TABLE "EmploymentDetail" 
ALTER COLUMN "SalaryAmount" TYPE TEXT 
USING CASE 
  WHEN "SalaryAmount" IS NULL THEN NULL
  ELSE "SalaryAmount"::TEXT
END;
```

This is a **safe** operation that:
- ✅ Converts numbers to text (e.g., "50000" → "50000")
- ✅ Doesn't lose any data
- ✅ Allows storing encrypted strings later

### Step 2: Set Encryption Key

Add to `.env.local`:
```env
ENCRYPTION_KEY=your_generated_key_here
```

Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 3: That's It!

Your application will now:
- ✅ Encrypt new data automatically when saved
- ✅ Encrypt existing data when it's updated
- ✅ Decrypt data automatically when read
- ✅ Handle both encrypted and plaintext data seamlessly

## 🔍 How to Verify It's Working

### Check if New Data is Encrypted

1. Update an employee's salary through the UI
2. Check the database:
```sql
SELECT 
  "employeeId",
  "SalaryAmount",
  CASE 
    WHEN "SalaryAmount" LIKE '%:%:%:%' THEN 'Encrypted ✅'
    ELSE 'Plaintext'
  END as status
FROM "EmploymentDetail"
WHERE "SalaryAmount" IS NOT NULL
ORDER BY "updatedAt" DESC
LIMIT 5;
```

### Check if Reading Works

1. View an employee profile in your application
2. Salary should display correctly (whether encrypted or plaintext)
3. No errors in console

## 📊 Gradual Migration Strategy

### Option 1: Natural Migration (Recommended)
- Just use your application normally
- Data encrypts as users update records
- No manual intervention needed

### Option 2: Targeted Updates
If you want to encrypt specific records faster:

1. Open employee records in your application
2. Make a small update (e.g., add a note, update a field)
3. Save the record
4. That record's sensitive data is now encrypted

### Option 3: Selective Encryption Script (Safest)

If you want to encrypt specific records manually, use this safe script:

```typescript
// scripts/encrypt-single-record.ts
import { PrismaClient } from '@prisma/client';
import { encrypt, isEncrypted } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function encryptSingleEmployee(employeeId: string) {
  // Get employment detail
  const empDetail = await prisma.employmentDetail.findFirst({
    where: { employeeId }
  });

  if (!empDetail) {
    console.log('No employment detail found');
    return;
  }

  const updates: any = {};
  let needsUpdate = false;

  // Check SalaryAmount
  if (empDetail.SalaryAmount && !isEncrypted(String(empDetail.SalaryAmount))) {
    updates.SalaryAmount = encrypt(String(empDetail.SalaryAmount), 'salary');
    needsUpdate = true;
  }

  // Check SalaryGrade
  if (empDetail.SalaryGrade && !isEncrypted(empDetail.SalaryGrade)) {
    updates.SalaryGrade = encrypt(empDetail.SalaryGrade, 'salary');
    needsUpdate = true;
  }

  if (needsUpdate) {
    await prisma.employmentDetail.update({
      where: { id: empDetail.id },
      data: updates
    });
    console.log(`✅ Encrypted data for employee ${employeeId}`);
  } else {
    console.log(`ℹ️  Data already encrypted for employee ${employeeId}`);
  }
}

// Usage: encryptSingleEmployee('2026-0001');
```

## ⚠️ Important Notes

1. **Database Schema**: You MUST change `SalaryAmount` to TEXT before encrypting salary data
2. **Encryption Key**: Keep it secure and backed up
3. **Mixed Data**: Your system handles both encrypted and plaintext data simultaneously
4. **No Rush**: There's no deadline - encrypt gradually as data is updated

## 🚨 What If Something Goes Wrong?

Since we're encrypting one record at a time:

1. **If one record fails**: Only that record is affected, not all data
2. **If decryption fails**: The system falls back to showing plaintext
3. **If you lose the key**: Only newly encrypted data is affected, old plaintext remains readable

## 📈 Monitoring Progress

Check encryption progress:

```sql
-- Count encrypted vs plaintext salary records
SELECT 
  COUNT(*) FILTER (WHERE "SalaryAmount" LIKE '%:%:%:%') as encrypted,
  COUNT(*) FILTER (WHERE "SalaryAmount" IS NOT NULL AND "SalaryAmount" NOT LIKE '%:%:%:%') as plaintext,
  COUNT(*) as total
FROM "EmploymentDetail"
WHERE "SalaryAmount" IS NOT NULL;
```

## ✅ Benefits of This Approach

- ✅ **Zero risk**: No bulk operations
- ✅ **No downtime**: Application works normally
- ✅ **Automatic**: Happens as users work
- ✅ **Reversible**: Can stop anytime
- ✅ **Gradual**: Spreads over time
- ✅ **Safe**: One record at a time

## 🎯 Recommendation

**Use lazy encryption** - it's the safest approach. Your data will encrypt naturally as users update records through your application. No migration needed!
