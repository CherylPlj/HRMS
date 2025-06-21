import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSchedules() {
  try {
    console.log('🔍 Debugging Schedules...\n');

    // 1. Check all schedules in the database
    const allSchedules = await prisma.schedules.findMany({
      include: {
        subject: true,
        classSection: true,
        faculty: true
      }
    });

    console.log(`📊 Total schedules in database: ${allSchedules.length}`);
    
    if (allSchedules.length > 0) {
      console.log('\n📋 All schedules:');
      allSchedules.forEach((schedule, index) => {
        console.log(`\nSchedule ${index + 1}:`);
        console.log(`  ID: ${schedule.id}`);
        console.log(`  Faculty ID: ${schedule.facultyId}`);
        console.log(`  Day: ${schedule.day}`);
        console.log(`  Time: ${schedule.time}`);
        console.log(`  Duration: ${schedule.duration} minutes`);
        console.log(`  Subject: ${schedule.subject?.name || 'Unknown'}`);
        console.log(`  Class Section: ${schedule.classSection?.name || 'Unknown'}`);
      });

      // 2. Check specifically for faculty ID 1
      const faculty1Schedules = allSchedules.filter(s => s.facultyId === 1);
      console.log(`\n🎯 Schedules for faculty ID 1: ${faculty1Schedules.length}`);
      
      if (faculty1Schedules.length > 0) {
        console.log('Faculty 1 schedules:');
        faculty1Schedules.forEach((schedule, index) => {
          console.log(`  ${index + 1}. Day: ${schedule.day}, Time: ${schedule.time}, Subject: ${schedule.subject?.name}`);
        });
      } else {
        console.log('❌ No schedules found for faculty ID 1');
        
        // Show what faculty IDs exist
        const facultyIds = [...new Set(allSchedules.map(s => s.facultyId))];
        console.log(`\n📋 Available faculty IDs: ${facultyIds.join(', ')}`);
      }
    } else {
      console.log('❌ No schedules found in database at all');
    }

    // 3. Check if faculty ID 1 exists
    const faculty1 = await prisma.faculty.findUnique({
      where: { FacultyID: 1 }
    });

    console.log(`\n👥 Faculty ID 1 exists: ${!!faculty1}`);
    if (faculty1) {
      console.log('Faculty 1 details:', faculty1);
    }

    // 4. Test the exact Prisma query that the API uses
    console.log('\n🧪 Testing API query for faculty ID 1...');
    try {
      const apiQueryResult = await prisma.schedules.findMany({
        where: {
          facultyId: 1
        },
        include: {
          subject: true,
          classSection: true
        },
        orderBy: {
          day: 'asc'
        }
      });
      
      console.log(`API query result count: ${apiQueryResult.length}`);
      if (apiQueryResult.length > 0) {
        console.log('API query result:', JSON.stringify(apiQueryResult, null, 2));
      }
    } catch (error) {
      console.error('❌ API query failed:', error);
    }

  } catch (error) {
    console.error('❌ Error debugging schedules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSchedules(); 