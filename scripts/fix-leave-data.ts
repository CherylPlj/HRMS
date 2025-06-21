import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLeaveData() {
  try {
    console.log('Checking for NULL LeaveType values...');
    
    // Find all leaves with NULL LeaveType
    const nullLeaves = await prisma.leave.findMany({
      where: {
        LeaveType: null
      }
    });

    console.log(`Found ${nullLeaves.length} leaves with NULL LeaveType`);

    if (nullLeaves.length > 0) {
      // Update all NULL LeaveType to 'Sick' (or you can choose another default)
      const updatedLeaves = await prisma.leave.updateMany({
        where: {
          LeaveType: null
        },
        data: {
          LeaveType: 'Sick'
        }
      });

      console.log(`Updated ${updatedLeaves.count} leaves with LeaveType = 'Sick'`);
    }

    console.log('Leave data fix completed successfully!');
  } catch (error) {
    console.error('Error fixing leave data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLeaveData(); 