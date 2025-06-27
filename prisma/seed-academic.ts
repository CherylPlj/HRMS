import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Create Document Types
    console.log('Creating document types...');
    const documentTypes = [
      {
        DocumentTypeName: 'Personal Data Sheet',
        AllowedFileTypes: ['pdf', 'doc', 'docx'],
      },
      {
        DocumentTypeName: 'Service Record',
        AllowedFileTypes: ['pdf', 'doc', 'docx'],
      },
      {
        DocumentTypeName: 'Transcript of Records',
        AllowedFileTypes: ['pdf'],
      },
      {
        DocumentTypeName: 'Diploma',
        AllowedFileTypes: ['pdf'],
      },
      {
        DocumentTypeName: 'Certificate of Employment',
        AllowedFileTypes: ['pdf'],
      },
      {
        DocumentTypeName: 'Training Certificates',
        AllowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      },
      {
        DocumentTypeName: 'Performance Evaluation',
        AllowedFileTypes: ['pdf'],
      },
      {
        DocumentTypeName: 'Medical Certificate',
        AllowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      },
      {
        DocumentTypeName: 'Government IDs',
        AllowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
      },
    ];

    for (const docType of documentTypes) {
      await prisma.documentType.upsert({
        where: { DocumentTypeName: docType.DocumentTypeName },
        update: { AllowedFileTypes: docType.AllowedFileTypes },
        create: docType,
      });
    }

    // Create Subjects
    console.log('Creating subjects...');
    const subjects = [
      // Pre-School Subjects
      { name: 'Kindergarten Reading' },
      { name: 'Kindergarten Math' },
      { name: 'Kindergarten Science' },
      { name: 'Arts and Crafts' },
      { name: 'Physical Education - Kinder' },
      
      // Primary Subjects (Grades 1-3)
      { name: 'English 1' },
      { name: 'English 2' },
      { name: 'English 3' },
      { name: 'Math 1' },
      { name: 'Math 2' },
      { name: 'Math 3' },
      { name: 'Science 1' },
      { name: 'Science 2' },
      { name: 'Science 3' },
      { name: 'Filipino 1' },
      { name: 'Filipino 2' },
      { name: 'Filipino 3' },
      { name: 'MAPEH 1' },
      { name: 'MAPEH 2' },
      { name: 'MAPEH 3' },
      
      // Intermediate Subjects (Grades 4-6)
      { name: 'English 4' },
      { name: 'English 5' },
      { name: 'English 6' },
      { name: 'Math 4' },
      { name: 'Math 5' },
      { name: 'Math 6' },
      { name: 'Science 4' },
      { name: 'Science 5' },
      { name: 'Science 6' },
      { name: 'Filipino 4' },
      { name: 'Filipino 5' },
      { name: 'Filipino 6' },
      { name: 'MAPEH 4' },
      { name: 'MAPEH 5' },
      { name: 'MAPEH 6' },
      
      // Junior High School Subjects (Grades 7-10)
      { name: 'English 7' },
      { name: 'English 8' },
      { name: 'English 9' },
      { name: 'English 10' },
      { name: 'Math 7' },
      { name: 'Math 8' },
      { name: 'Math 9' },
      { name: 'Math 10' },
      { name: 'Science 7' },
      { name: 'Science 8' },
      { name: 'Science 9' },
      { name: 'Science 10' },
      { name: 'Filipino 7' },
      { name: 'Filipino 8' },
      { name: 'Filipino 9' },
      { name: 'Filipino 10' },
      { name: 'MAPEH 7' },
      { name: 'MAPEH 8' },
      { name: 'MAPEH 9' },
      { name: 'MAPEH 10' },
      { name: 'TLE 7' },
      { name: 'TLE 8' },
      { name: 'TLE 9' },
      { name: 'TLE 10' },
    ];

    for (const subject of subjects) {
      await prisma.subject.upsert({
        where: { name: subject.name },
        update: {},
        create: subject,
      });
    }

    // Create Class Sections
    console.log('Creating class sections...');
    const classSections = [
      // Pre-School
      { name: 'Kinder - Love' },
      { name: 'Kinder - Hope' },
      { name: 'Kinder - Faith' },
      
      // Primary (Grades 1-3)
      { name: 'Grade 1 - Sampaguita' },
      { name: 'Grade 1 - Ilang-Ilang' },
      { name: 'Grade 2 - Rosal' },
      { name: 'Grade 2 - Jasmine' },
      { name: 'Grade 3 - Rose' },
      { name: 'Grade 3 - Lily' },
      
      // Intermediate (Grades 4-6)
      { name: 'Grade 4 - Earth' },
      { name: 'Grade 4 - Mars' },
      { name: 'Grade 5 - Jupiter' },
      { name: 'Grade 5 - Saturn' },
      { name: 'Grade 6 - Mercury' },
      { name: 'Grade 6 - Venus' },
      
      // Junior High School (Grades 7-10)
      { name: 'Grade 7 - Rizal' },
      { name: 'Grade 7 - Bonifacio' },
      { name: 'Grade 8 - Einstein' },
      { name: 'Grade 8 - Newton' },
      { name: 'Grade 9 - Hawking' },
      { name: 'Grade 9 - Tesla' },
      { name: 'Grade 10 - Aristotle' },
      { name: 'Grade 10 - Plato' },
    ];

    for (const section of classSections) {
      await prisma.classSection.upsert({
        where: { name: section.name },
        update: {},
        create: section,
      });
    }

    console.log('✅ Academic data seeding completed successfully');
  } catch (error) {
    console.error('❌ Error seeding academic data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 