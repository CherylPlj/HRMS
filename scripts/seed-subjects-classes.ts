import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubjectsAndClasses() {
  try {
    console.log('Seeding Subjects and Class Sections...');

    // Seed Subjects
    const subjects = [
      'Mathematics',
      'Science',
      'English',
      'History',
      'Filipino',
      'MAPEH',
      'Technology and Livelihood Education',
      'Values Education',
    ];

    for (const name of subjects) {
      await prisma.subject.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log('✅ Subjects seeded successfully.');

    // Seed Class Sections
    // Kinder 1 & 2
    await prisma.classSection.upsert({ where: { name: 'Kinder 1-Mapagbigay' }, update: {}, create: { name: 'Kinder 1-Mapagbigay' } });
    await prisma.classSection.upsert({ where: { name: 'Kinder 2-Mabait' }, update: {}, create: { name: 'Kinder 2-Mabait' } });
    await prisma.classSection.upsert({ where: { name: 'Kinder 2-Matiyaga' }, update: {}, create: { name: 'Kinder 2-Matiyaga' } });

    // Grade 1
    await prisma.classSection.upsert({ where: { name: 'Grade 1-Malinis' }, update: {}, create: { name: 'Grade 1-Malinis' } });

    // Grade 2
    await prisma.classSection.upsert({ where: { name: 'Grade 2-Matapat' }, update: {}, create: { name: 'Grade 2-Matapat' } });

    // Grade 3
    await prisma.classSection.upsert({ where: { name: 'Grade 3-Mapagmahal' }, update: {}, create: { name: 'Grade 3-Mapagmahal' } });
    await prisma.classSection.upsert({ where: { name: 'Grade 3-Magalang' }, update: {}, create: { name: 'Grade 3-Magalang' } });

    // Grade 4
    await prisma.classSection.upsert({ where: { name: 'Grade 4-Maalalahanin' }, update: {}, create: { name: 'Grade 4-Maalalahanin' } });
    await prisma.classSection.upsert({ where: { name: 'Grade 4-Magiliw' }, update: {}, create: { name: 'Grade 4-Magiliw' } });

    // Grade 5
    await prisma.classSection.upsert({ where: { name: 'Grade 5-Malikhain' }, update: {}, create: { name: 'Grade 5-Malikhain' } });

    // Grade 6
    await prisma.classSection.upsert({ where: { name: 'Grade 6-Masigasig' }, update: {}, create: { name: 'Grade 6-Masigasig' } });

    // Grade 7
    await prisma.classSection.upsert({ where: { name: 'Grade 7-Magiting' }, update: {}, create: { name: 'Grade 7-Magiting' } });

    // Grade 8
    await prisma.classSection.upsert({ where: { name: 'Grade 8-Masinop' }, update: {}, create: { name: 'Grade 8-Masinop' } });

    // Grade 9
    await prisma.classSection.upsert({ where: { name: 'Grade 9-Masunurin' }, update: {}, create: { name: 'Grade 9-Masunurin' } });

    // Grade 10
    await prisma.classSection.upsert({ where: { name: 'Grade 10-Mahusay' }, update: {}, create: { name: 'Grade 10-Mahusay' } });
    
    console.log('✅ Class sections seeded successfully.');
    console.log('🎉 Subjects and Class Sections seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding subjects and class sections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSubjectsAndClasses(); 