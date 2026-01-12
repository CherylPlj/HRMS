# Apply Section Assignments Migration

## Problem
The Prisma client doesn't recognize the new fields (`adviserFacultyId`, `homeroomTeacherId`, `sectionHeadId`) because:
1. The Prisma client hasn't been regenerated after schema changes
2. The migration hasn't been applied to the database

## Solution

### Step 1: Stop the Development Server
**IMPORTANT**: You must stop your Next.js dev server first (Ctrl+C in the terminal where it's running).

### Step 2: Apply the Migration to Database

You have two options:

#### Option A: Using Prisma Migrate (Recommended)
```bash
npx prisma migrate deploy
```

This will apply all pending migrations to your database.

#### Option B: Manual SQL Execution
If Prisma migrate doesn't work, you can run the SQL directly in your Supabase SQL editor:

```sql
-- AlterTable
ALTER TABLE "ClassSection" ADD COLUMN IF NOT EXISTS "adviserFacultyId" INTEGER;
ALTER TABLE "ClassSection" ADD COLUMN IF NOT EXISTS "homeroomTeacherId" INTEGER;
ALTER TABLE "ClassSection" ADD COLUMN IF NOT EXISTS "sectionHeadId" INTEGER;

-- AddForeignKey
ALTER TABLE "ClassSection" 
  ADD CONSTRAINT "ClassSection_adviserFacultyId_fkey" 
  FOREIGN KEY ("adviserFacultyId") 
  REFERENCES "Faculty"("FacultyID") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

ALTER TABLE "ClassSection" 
  ADD CONSTRAINT "ClassSection_homeroomTeacherId_fkey" 
  FOREIGN KEY ("homeroomTeacherId") 
  REFERENCES "Faculty"("FacultyID") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

ALTER TABLE "ClassSection" 
  ADD CONSTRAINT "ClassSection_sectionHeadId_fkey" 
  FOREIGN KEY ("sectionHeadId") 
  REFERENCES "Faculty"("FacultyID") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
```

### Step 3: Regenerate Prisma Client

After stopping the dev server, run:
```bash
npx prisma generate
```

### Step 4: Restart Development Server

```bash
npm run dev
```

## Verification

After completing these steps, you should be able to:
1. Access `/dashboard/admin/section-assignments` without errors
2. View sections with assignment data
3. Update section assignments successfully

## Troubleshooting

If you still get errors after following these steps:

1. **Check if migration was applied:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'ClassSection' 
   AND column_name IN ('adviserFacultyId', 'homeroomTeacherId', 'sectionHeadId');
   ```
   All three columns should exist.

2. **Clear Prisma cache:**
   ```bash
   rm -rf node_modules/.prisma
   npx prisma generate
   ```

3. **Restart your IDE/editor** to ensure it picks up the new Prisma types.
