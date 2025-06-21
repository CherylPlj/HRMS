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
    const gemNames = [
      'Ruby', 'Diamond', 'Sapphire', 'Emerald', 'Pearl', 'Garnet',
      'Amethyst', 'Opal', 'Topaz', 'Peridot', 'Aquamarine', 'Tourmaline'
    ];

    const treeNames = [
      'Narra', 'Mahogany', 'Acacia', 'Pine', 'Oak', 'Maple', 'Cherry', 'Willow',
      'Aspen', 'Birch', 'Cedar', 'Cypress', 'Elm', 'Beech', 'Hickory', 'Sycamore',
      'Poplar', 'Linden', 'Hawthorn', 'Dogwood', 'Redwood', 'Sequoia'
    ];

    // Kinder
    await prisma.classSection.upsert({ where: { name: 'Kinder-Ruby' }, update: {}, create: { name: 'Kinder-Ruby' } });
    await prisma.classSection.upsert({ where: { name: 'Kinder-Diamond' }, update: {}, create: { name: 'Kinder-Diamond' } });

    // Grades 1-6 (Gems)
    for (let grade = 1; grade <= 6; grade++) {
      const section1Name = `${grade}-${gemNames[(grade - 1) * 2]}`;
      const section2Name = `${grade}-${gemNames[(grade - 1) * 2 + 1]}`;
      await prisma.classSection.upsert({ where: { name: section1Name }, update: {}, create: { name: section1Name } });
      await prisma.classSection.upsert({ where: { name: section2Name }, update: {}, create: { name: section2Name } });
    }

    // Grades 7-12 (Trees)
    for (let grade = 7; grade <= 12; grade++) {
      const treeIndex = (grade - 7) * 2;
      const section1Name = `${grade}-${treeNames[treeIndex]}`;
      const section2Name = `${grade}-${treeNames[treeIndex + 1]}`;
      await prisma.classSection.upsert({ where: { name: section1Name }, update: {}, create: { name: section1Name } });
      await prisma.classSection.upsert({ where: { name: section2Name }, update: {}, create: { name: section2Name } });
    }
    
    console.log('✅ Class sections seeded successfully.');
    console.log('🎉 Subjects and Class Sections seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding subjects and class sections:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSubjectsAndClasses(); 