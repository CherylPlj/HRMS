/**
 * Script to fix orphaned Schedules records
 * 
 * This script finds and fixes Schedules records that reference
 * non-existent ClassSection, Faculty, or Subject records.
 * 
 * Run with: npx ts-node -r tsconfig-paths/register scripts/fix-orphaned-schedules.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrphanedSchedules() {
  console.log('🔍 Checking for orphaned Schedules records...\n');

  try {
    // Get all valid IDs
    const validClassSectionIds = await prisma.classSection.findMany({
      select: { id: true },
    }).then(sections => new Set(sections.map(s => s.id)));

    const validFacultyIds = await prisma.faculty.findMany({
      select: { FacultyID: true },
    }).then(faculty => new Set(faculty.map(f => f.FacultyID)));

    const validSubjectIds = await prisma.subject.findMany({
      select: { id: true },
    }).then(subjects => new Set(subjects.map(s => s.id)));

    console.log(`✅ Valid ClassSection IDs: ${validClassSectionIds.size}`);
    console.log(`✅ Valid Faculty IDs: ${validFacultyIds.size}`);
    console.log(`✅ Valid Subject IDs: ${validSubjectIds.size}\n`);

    // Get all schedules
    const allSchedules = await prisma.schedules.findMany({
      select: {
        id: true,
        classSectionId: true,
        facultyId: true,
        subjectId: true,
        day: true,
        time: true,
      },
    });

    console.log(`📊 Total schedules in database: ${allSchedules.length}\n`);

    // Find orphaned records
    const orphanedByClassSection: number[] = [];
    const orphanedByFaculty: number[] = [];
    const orphanedBySubject: number[] = [];

    for (const schedule of allSchedules) {
      if (!validClassSectionIds.has(schedule.classSectionId)) {
        orphanedByClassSection.push(schedule.id);
      }
      if (!validFacultyIds.has(schedule.facultyId)) {
        orphanedByFaculty.push(schedule.id);
      }
      if (!validSubjectIds.has(schedule.subjectId)) {
        orphanedBySubject.push(schedule.id);
      }
    }

    // Report findings
    console.log('🔍 Orphaned Records Found:');
    console.log(`  - Orphaned by ClassSection: ${orphanedByClassSection.length}`);
    console.log(`  - Orphaned by Faculty: ${orphanedByFaculty.length}`);
    console.log(`  - Orphaned by Subject: ${orphanedBySubject.length}\n`);

    if (orphanedByClassSection.length === 0 && orphanedByFaculty.length === 0 && orphanedBySubject.length === 0) {
      console.log('✅ No orphaned records found! Database is clean.\n');
      return;
    }

    // Show details of orphaned records
    if (orphanedByClassSection.length > 0) {
      console.log('📋 Schedules with invalid ClassSection IDs:');
      const orphanedSchedules = allSchedules.filter(s => orphanedByClassSection.includes(s.id));
      orphanedSchedules.forEach(s => {
        console.log(`  - Schedule ID ${s.id}: classSectionId=${s.classSectionId} (does not exist)`);
      });
      console.log('');
    }

    if (orphanedByFaculty.length > 0) {
      console.log('📋 Schedules with invalid Faculty IDs:');
      const orphanedSchedules = allSchedules.filter(s => orphanedByFaculty.includes(s.id));
      orphanedSchedules.forEach(s => {
        console.log(`  - Schedule ID ${s.id}: facultyId=${s.facultyId} (does not exist)`);
      });
      console.log('');
    }

    if (orphanedBySubject.length > 0) {
      console.log('📋 Schedules with invalid Subject IDs:');
      const orphanedSchedules = allSchedules.filter(s => orphanedBySubject.includes(s.id));
      orphanedSchedules.forEach(s => {
        console.log(`  - Schedule ID ${s.id}: subjectId=${s.subjectId} (does not exist)`);
      });
      console.log('');
    }

    // Get all unique orphaned schedule IDs
    const allOrphanedIds = new Set([
      ...orphanedByClassSection,
      ...orphanedByFaculty,
      ...orphanedBySubject,
    ]);

    if (allOrphanedIds.size === 0) {
      console.log('✅ No orphaned records to fix.\n');
      return;
    }

    // Ask for confirmation (in a real script, you'd use readline)
    console.log(`⚠️  Found ${allOrphanedIds.size} orphaned schedule record(s).`);
    console.log('⚠️  These records will be DELETED because they reference non-existent records.');
    console.log('⚠️  This action cannot be undone!\n');

    // For automated execution, we'll delete them
    // In production, you might want to add a --dry-run flag
    const shouldDelete = process.argv.includes('--delete');

    if (!shouldDelete) {
      console.log('💡 Run with --delete flag to actually delete orphaned records.');
      console.log('💡 Example: npx ts-node scripts/fix-orphaned-schedules.ts --delete\n');
      return;
    }

    console.log('🗑️  Deleting orphaned records...\n');

    // Delete orphaned records
    const deleteResult = await prisma.schedules.deleteMany({
      where: {
        id: { in: Array.from(allOrphanedIds) },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} orphaned schedule record(s).\n`);
    console.log('✅ Database is now clean. You can now run Prisma migrations.\n');

  } catch (error) {
    console.error('❌ Error fixing orphaned schedules:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixOrphanedSchedules()
  .then(() => {
    console.log('✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
