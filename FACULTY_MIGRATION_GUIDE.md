# Faculty Records Migration Guide

## Overview

This guide explains the changes made to automatically create Faculty records for employees with `Designation: "Faculty"` and how to migrate existing data.

---

## What Changed?

### 1. **Employee ID vs Faculty ID** (No Schema Changes)
- **EmployeeID**: String format (e.g., "2025-0001") - used for all employees
- **FacultyID**: Integer format (e.g., 1, 2, 3...) - only for faculty members
- These are **separate and distinct** IDs

### 2. **Automatic Faculty Record Creation**
When creating or updating an employee:
- If `Designation = "Faculty"`, a Faculty record is **automatically created**
- No need to manually create Faculty records anymore
- The system generates a unique sequential FacultyID

### 3. **FacultyID Generation**
- Changed from random UUID-based to **sequential integers**
- Starts from 1 and increments
- More predictable and user-friendly

---

## Database Structure

### Faculty Table (No Changes Needed)
```prisma
model Faculty {
  FacultyID        Int              @id              // Sequential: 1, 2, 3...
  UserID           String           @unique          // Links to User
  EmployeeID       String?          @unique          // Links to Employee (optional)
  DateOfBirth      DateTime         @db.Date
  Phone            String?
  Address          String?
  EmploymentStatus EmploymentStatus @default(Regular)
  HireDate         DateTime         @db.Date
  Position         String?
  DepartmentID     Int?
  EmergencyContact String?
  EmployeeType     EmployeeType     @default(Regular)
  // ... other fields
}
```

---

## Migration Steps for Existing Data

### Step 1: Check Your Current Faculty Data

Run this query in Supabase SQL Editor to see which faculty need migration:

```sql
-- Find employees with Designation = 'Faculty' but no Faculty record
SELECT 
  e."EmployeeID",
  e."FirstName",
  e."LastName",
  ed."Designation",
  f."FacultyID"
FROM "Employee" e
INNER JOIN "EmploymentDetail" ed ON e."EmployeeID" = ed."employeeId"
LEFT JOIN "Faculty" f ON e."EmployeeID" = f."EmployeeID"
WHERE ed."Designation" = 'Faculty'
  AND e."isDeleted" = false
  AND f."FacultyID" IS NULL;
```

### Step 2: Run the Backfill Migration Script

**Option 1: Using npm script (Recommended)**
```bash
npm run migrate:faculty
```

**Option 2: Direct execution**
```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/backfill-faculty-records.ts
```

**What this script does:**
1. ✅ Finds all employees with `Designation = "Faculty"`
2. ✅ Checks if they already have a Faculty record (skips if yes)
3. ✅ Creates User records if needed (for faculty without User accounts)
4. ✅ Generates unique sequential FacultyIDs
5. ✅ Creates Faculty records with all required information
6. ✅ Provides detailed summary and error reporting

**Expected Output:**
```
🔍 Starting Faculty Records Backfill Migration...

📊 Found 15 employees with Designation = 'Faculty'

✅ Created Faculty record for John Doe (2024-0001) - FacultyID: 1
✅ Created Faculty record for Jane Smith (2024-0002) - FacultyID: 2
⏭️  Skipping Mike Johnson (2024-0003) - Faculty record already exists

============================================================
📊 Migration Summary
============================================================
Total Employees Processed: 15
✅ Faculty Records Created: 12
⏭️  Skipped (Already Exists): 3
❌ Failed: 0
============================================================
```

### Step 3: Verify the Migration

After running the script, verify the results:

```sql
-- Check all Faculty records with their Employee info
SELECT 
  f."FacultyID",
  f."EmployeeID",
  e."FirstName",
  e."LastName",
  f."Position",
  f."HireDate"
FROM "Faculty" f
INNER JOIN "Employee" e ON f."EmployeeID" = e."EmployeeID"
ORDER BY f."FacultyID";
```

---

## Going Forward

### Creating New Faculty

**Option 1: Through Employee Creation (Recommended)**
When creating a new employee, simply set `Designation: "Faculty"`:

```javascript
const employeeData = {
  FirstName: "John",
  LastName: "Doe",
  DateOfBirth: "1990-01-15",
  Sex: "Male",
  HireDate: "2025-01-08",
  Designation: "Faculty",  // ← This triggers automatic Faculty record creation
  Position: "Math Teacher",
  DepartmentID: 1,
  // ... other fields
};

fetch('/api/employees', {
  method: 'POST',
  body: JSON.stringify(employeeData)
});
```

**Result:**
- ✅ Employee record created with EmployeeID (e.g., "2025-0001")
- ✅ Faculty record automatically created with FacultyID (e.g., 15)
- ✅ User record created if email provided

**Option 2: Updating Existing Employee**
If you change an employee's Designation to "Faculty":

```javascript
const updateData = {
  EmployeeID: "2025-0001",
  Designation: "Faculty",  // ← Changing to Faculty
  // ... other fields
};

fetch('/api/employees', {
  method: 'PATCH',
  body: JSON.stringify(updateData)
});
```

**Result:**
- ✅ Employee record updated
- ✅ Faculty record automatically created if it doesn't exist

---

## Common Questions

### Q: What if I have faculty without EmployeeIDs?
**A:** The migration script handles this:
- It creates User records for faculty who don't have them
- Links the Faculty record to the User
- You can add EmployeeID later if needed

### Q: Can I still create Faculty records manually?
**A:** Yes, but it's not recommended. The automatic creation ensures:
- Consistent FacultyID generation
- Proper linking between Employee, User, and Faculty
- All required fields are populated

### Q: What happens if the migration script fails for some records?
**A:** The script:
- ✅ Continues processing other records
- ✅ Shows detailed error messages
- ✅ Can be safely re-run (skips successful records)
- ❌ Failed records can be fixed and migrated again

### Q: How do I find a faculty's FacultyID from their EmployeeID?
**A:** Query the Faculty table:

```sql
SELECT "FacultyID", "EmployeeID" 
FROM "Faculty" 
WHERE "EmployeeID" = '2025-0001';
```

### Q: Can I customize the FacultyID format?
**A:** The current implementation uses sequential integers (1, 2, 3...). If you need a different format, you can modify the `generateUniqueFacultyId()` function in `/api/employees/route.ts`.

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Check your `.env.local` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Issue: "Unable to generate unique FacultyID"
**Solution:** This is very rare. It means the script tried 1000 times to find an available ID. Check your Faculty table for data inconsistencies.

### Issue: "Faculty record creation failed"
**Solution:** Check the error message. Common causes:
- Missing required fields (DateOfBirth, HireDate)
- Invalid foreign key references (UserID, DepartmentID)
- Duplicate FacultyID (very rare with the new system)

---

## Summary

✅ **No database schema changes needed** - the structure already supports this
✅ **Run migration script once** to backfill existing faculty
✅ **New faculty** are automatically handled going forward
✅ **EmployeeID and FacultyID** remain separate (String vs Integer)
✅ **Safe to re-run** migration script if needed

For questions or issues, check the error logs or contact the development team.
