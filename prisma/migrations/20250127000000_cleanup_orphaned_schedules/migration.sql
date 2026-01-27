-- Migration: Clean up orphaned Schedules records before adding foreign key constraints
-- This migration deletes Schedules records that reference non-existent ClassSection, Faculty, or Subject records

-- Delete schedules with invalid classSectionId
DELETE FROM "Schedules"
WHERE "classSectionId" NOT IN (
  SELECT id FROM "ClassSection"
);

-- Delete schedules with invalid facultyId
DELETE FROM "Schedules"
WHERE "facultyId" NOT IN (
  SELECT "FacultyID" FROM "Faculty"
);

-- Delete schedules with invalid subjectId
DELETE FROM "Schedules"
WHERE "subjectId" NOT IN (
  SELECT id FROM "Subject"
);

-- Note: After this migration, you can safely add foreign key constraints
-- The foreign key constraints should be added in a subsequent migration or by Prisma
