import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDocumentTypes() {
  try {
    console.log('Seeding Document Types...');

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

    console.log('✅ Document types seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding document types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDocumentTypes(); 