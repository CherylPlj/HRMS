import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding subjects and class sections...');

  // Seed Subjects
  const subjects = [
    // Grade 7
    {
      code: 'MATH7',
      name: 'Mathematics 7',
      description: 'Basic mathematics for Grade 7 students',
      units: 3,
      gradeLevel: '7',
      department: 'Mathematics',
      isActive: true,
    },
    {
      code: 'ENG7',
      name: 'English 7',
      description: 'English language and literature for Grade 7',
      units: 3,
      gradeLevel: '7',
      department: 'English',
      isActive: true,
    },
    {
      code: 'SCI7',
      name: 'Science 7',
      description: 'General science for Grade 7 students',
      units: 3,
      gradeLevel: '7',
      department: 'Science',
      isActive: true,
    },
    {
      code: 'FIL7',
      name: 'Filipino 7',
      description: 'Filipino language for Grade 7',
      units: 3,
      gradeLevel: '7',
      department: 'Filipino',
      isActive: true,
    },
    {
      code: 'AP7',
      name: 'Araling Panlipunan 7',
      description: 'Social Studies for Grade 7',
      units: 3,
      gradeLevel: '7',
      department: 'Social Studies',
      isActive: true,
    },
    {
      code: 'MAPEH7',
      name: 'MAPEH 7',
      description: 'Music, Arts, Physical Education, and Health for Grade 7',
      units: 2,
      gradeLevel: '7',
      department: 'MAPEH',
      isActive: true,
    },
    {
      code: 'TLE7',
      name: 'Technology and Livelihood Education 7',
      description: 'TLE for Grade 7',
      units: 2,
      gradeLevel: '7',
      department: 'TLE',
      isActive: true,
    },

    // Grade 8
    {
      code: 'MATH8',
      name: 'Mathematics 8',
      description: 'Intermediate mathematics for Grade 8 students',
      units: 3,
      gradeLevel: '8',
      department: 'Mathematics',
      isActive: true,
    },
    {
      code: 'ENG8',
      name: 'English 8',
      description: 'English language and literature for Grade 8',
      units: 3,
      gradeLevel: '8',
      department: 'English',
      isActive: true,
    },
    {
      code: 'SCI8',
      name: 'Science 8',
      description: 'General science for Grade 8 students',
      units: 3,
      gradeLevel: '8',
      department: 'Science',
      isActive: true,
    },
    {
      code: 'FIL8',
      name: 'Filipino 8',
      description: 'Filipino language for Grade 8',
      units: 3,
      gradeLevel: '8',
      department: 'Filipino',
      isActive: true,
    },
    {
      code: 'AP8',
      name: 'Araling Panlipunan 8',
      description: 'Social Studies for Grade 8',
      units: 3,
      gradeLevel: '8',
      department: 'Social Studies',
      isActive: true,
    },
    {
      code: 'MAPEH8',
      name: 'MAPEH 8',
      description: 'Music, Arts, Physical Education, and Health for Grade 8',
      units: 2,
      gradeLevel: '8',
      department: 'MAPEH',
      isActive: true,
    },

    // Grade 9
    {
      code: 'MATH9',
      name: 'Mathematics 9',
      description: 'Advanced mathematics for Grade 9 students',
      units: 3,
      gradeLevel: '9',
      department: 'Mathematics',
      isActive: true,
    },
    {
      code: 'ENG9',
      name: 'English 9',
      description: 'English language and literature for Grade 9',
      units: 3,
      gradeLevel: '9',
      department: 'English',
      isActive: true,
    },
    {
      code: 'SCI9',
      name: 'Science 9',
      description: 'General science for Grade 9 students',
      units: 3,
      gradeLevel: '9',
      department: 'Science',
      isActive: true,
    },
    {
      code: 'FIL9',
      name: 'Filipino 9',
      description: 'Filipino language for Grade 9',
      units: 3,
      gradeLevel: '9',
      department: 'Filipino',
      isActive: true,
    },
    {
      code: 'AP9',
      name: 'Araling Panlipunan 9',
      description: 'Social Studies for Grade 9',
      units: 3,
      gradeLevel: '9',
      department: 'Social Studies',
      isActive: true,
    },

    // Grade 10
    {
      code: 'MATH10',
      name: 'Mathematics 10',
      description: 'Advanced mathematics for Grade 10 students',
      units: 3,
      gradeLevel: '10',
      department: 'Mathematics',
      isActive: true,
    },
    {
      code: 'ENG10',
      name: 'English 10',
      description: 'English language and literature for Grade 10',
      units: 3,
      gradeLevel: '10',
      department: 'English',
      isActive: true,
    },
    {
      code: 'SCI10',
      name: 'Science 10',
      description: 'General science for Grade 10 students',
      units: 3,
      gradeLevel: '10',
      department: 'Science',
      isActive: true,
    },
    {
      code: 'FIL10',
      name: 'Filipino 10',
      description: 'Filipino language for Grade 10',
      units: 3,
      gradeLevel: '10',
      department: 'Filipino',
      isActive: true,
    },
    {
      code: 'AP10',
      name: 'Araling Panlipunan 10',
      description: 'Social Studies for Grade 10',
      units: 3,
      gradeLevel: '10',
      department: 'Social Studies',
      isActive: true,
    },
  ];

  console.log('📚 Creating subjects...');
  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { name: subject.name },
      update: subject,
      create: subject,
    });
  }
  console.log(`✅ Created ${subjects.length} subjects`);

  // Seed Class Sections
  const sections = [
    // Grade 7 Sections
    {
      name: 'Grade 7 - Rizal',
      gradeLevel: '7',
      section: 'Rizal',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 101',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 7 - Bonifacio',
      gradeLevel: '7',
      section: 'Bonifacio',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 102',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 7 - Mabini',
      gradeLevel: '7',
      section: 'Mabini',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 103',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 7 - Luna',
      gradeLevel: '7',
      section: 'Luna',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 104',
      capacity: 40,
      isActive: true,
    },

    // Grade 8 Sections
    {
      name: 'Grade 8 - Aguinaldo',
      gradeLevel: '8',
      section: 'Aguinaldo',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 201',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 8 - Bonifacio',
      gradeLevel: '8',
      section: 'Bonifacio',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 202',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 8 - Mabini',
      gradeLevel: '8',
      section: 'Mabini',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 203',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 8 - Luna',
      gradeLevel: '8',
      section: 'Luna',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 204',
      capacity: 40,
      isActive: true,
    },

    // Grade 9 Sections
    {
      name: 'Grade 9 - Rizal',
      gradeLevel: '9',
      section: 'Rizal',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 301',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 9 - Aguinaldo',
      gradeLevel: '9',
      section: 'Aguinaldo',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 302',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 9 - Mabini',
      gradeLevel: '9',
      section: 'Mabini',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 303',
      capacity: 40,
      isActive: true,
    },

    // Grade 10 Sections
    {
      name: 'Grade 10 - Rizal',
      gradeLevel: '10',
      section: 'Rizal',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 401',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 10 - Bonifacio',
      gradeLevel: '10',
      section: 'Bonifacio',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 402',
      capacity: 40,
      isActive: true,
    },
    {
      name: 'Grade 10 - Luna',
      gradeLevel: '10',
      section: 'Luna',
      schoolYear: '2025-2026',
      semester: '1st Semester',
      room: 'Room 403',
      capacity: 40,
      isActive: true,
    },
  ];

  console.log('🏫 Creating class sections...');
  for (const section of sections) {
    await prisma.classSection.upsert({
      where: { name: section.name },
      update: section,
      create: section,
    });
  }
  console.log(`✅ Created ${sections.length} class sections`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
