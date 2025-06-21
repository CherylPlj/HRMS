import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchedules() {
  try {
    console.log('🔍 Checking schedules for faculty ID 1...\n');

    // 1. Check if faculty ID 1 exists
    const faculty = await prisma.faculty.findUnique({
      where: { FacultyID: 1 },
      include: {
        User: true
      }
    });

    if (!faculty) {
      console.log('❌ Faculty ID 1 does not exist');
      return;
    }

    console.log('✅ Faculty ID 1 exists:', {
      FacultyID: faculty.FacultyID,
      UserID: faculty.UserID,
      userEmail: faculty.User?.Email
    });

    // 2. Check schedules for faculty ID 1
    const schedules = await prisma.schedules.findMany({
      where: { facultyId: 1 },
      include: {
        subject: true,
        classSection: true
      }
    });

    console.log(`\n📊 Schedules found for faculty ID 1: ${schedules.length}`);

    if (schedules.length > 0) {
      console.log('\n📋 Schedules:');
      schedules.forEach((schedule, index) => {
        console.log(`\nSchedule ${index + 1}:`);
        console.log(`  ID: ${schedule.id}`);
        console.log(`  Day: ${schedule.day}`);
        console.log(`  Time: ${schedule.time}`);
        console.log(`  Duration: ${schedule.duration} minutes`);
        console.log(`  Subject: ${schedule.subject?.name || 'Unknown'}`);
        console.log(`  Class Section: ${schedule.classSection?.name || 'Unknown'}`);
      });
    } else {
      console.log('❌ No schedules found for faculty ID 1');
      
      // 3. Check if there are any schedules at all
      const allSchedules = await prisma.schedules.findMany({
        take: 5,
        include: {
          subject: true,
          classSection: true,
          faculty: true
        }
      });

      console.log(`\n📊 Total schedules in database: ${allSchedules.length}`);
      if (allSchedules.length > 0) {
        console.log('Sample schedules:');
        allSchedules.forEach((schedule, index) => {
          console.log(`  ${index + 1}. Faculty ID: ${schedule.facultyId}, Day: ${schedule.day}, Subject: ${schedule.subject?.name}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error checking schedules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchedules(); 