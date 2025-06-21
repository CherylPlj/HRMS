import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSchedules() {
  try {
    console.log('🔍 Testing Schedules...\n');

    // 1. Check if there are any schedules in the database
    const schedules = await prisma.schedules.findMany({
      include: {
        subject: true,
        classSection: true,
        faculty: true
      }
    });

    console.log(`📊 Total schedules found: ${schedules.length}`);
    
    if (schedules.length > 0) {
      console.log('\n📋 Sample schedules:');
      schedules.slice(0, 3).forEach((schedule, index) => {
        console.log(`\nSchedule ${index + 1}:`);
        console.log(`  ID: ${schedule.id}`);
        console.log(`  Faculty ID: ${schedule.facultyId}`);
        console.log(`  Day: ${schedule.day}`);
        console.log(`  Time: ${schedule.time}`);
        console.log(`  Duration: ${schedule.duration} minutes`);
        console.log(`  Subject: ${schedule.subject?.name || 'Unknown'}`);
        console.log(`  Class Section: ${schedule.classSection?.name || 'Unknown'}`);
      });
    } else {
      console.log('❌ No schedules found in database');
    }

    // 2. Check if there are any faculty members
    const faculty = await prisma.faculty.findMany({
      take: 5
    });

    console.log(`\n👥 Faculty members found: ${faculty.length}`);
    if (faculty.length > 0) {
      console.log('Sample faculty IDs:', faculty.map(f => f.FacultyID).slice(0, 3));
    }

    // 3. Check subjects and class sections
    const subjects = await prisma.subject.findMany();
    const classSections = await prisma.classSection.findMany();

    console.log(`\n📚 Subjects found: ${subjects.length}`);
    console.log(`🏫 Class sections found: ${classSections.length}`);

  } catch (error) {
    console.error('❌ Error testing schedules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchedules(); 