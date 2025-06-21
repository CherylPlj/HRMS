import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test Subject table
    console.log('\n--- Testing Subject table ---');
    const subjects = await prisma.subject.findMany();
    console.log(`Found ${subjects.length} subjects:`, subjects);
    
    // Test ClassSection table
    console.log('\n--- Testing ClassSection table ---');
    const classSections = await prisma.classSection.findMany();
    console.log(`Found ${classSections.length} class sections:`, classSections);
    
    // Test Schedules table
    console.log('\n--- Testing Schedules table ---');
    const schedules = await prisma.schedules.findMany({
      include: {
        subject: true,
        classSection: true,
        faculty: {
          include: {
            User: true
          }
        }
      }
    });
    console.log(`Found ${schedules.length} schedules:`, schedules);
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase(); 