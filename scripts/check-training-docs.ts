import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function checkTrainingDocuments() {
  try {
    console.log('Checking training documents in database...\n');

    // Check all training documents
    const allDocs = await prisma.trainingDocument.findMany({
      include: {
        User: {
          select: {
            FirstName: true,
            LastName: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    console.log(`Total training documents found: ${allDocs.length}\n`);

    if (allDocs.length === 0) {
      console.log('No training documents found in the database.');
      return;
    }

    // Display each document
    allDocs.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Title: ${doc.title}`);
      console.log(`  Status: ${doc.status}`);
      console.log(`  File URL: ${doc.fileUrl}`);
      console.log(`  Content Length: ${doc.content?.length || 0} characters`);
      console.log(`  Uploaded By: ${doc.User?.FirstName} ${doc.User?.LastName}`);
      console.log(`  Uploaded At: ${doc.uploadedAt}`);
      console.log(`  File Type: ${doc.fileType}`);
      console.log('');
    });

    // Check AIChat records
    const aiChats = await prisma.aIChat.findMany({
      include: {
        User: {
          select: {
            FirstName: true,
            LastName: true,
          },
        },
      },
      orderBy: {
        dateSubmitted: 'desc',
      },
    });

    console.log(`Total AIChat records found: ${aiChats.length}\n`);

    // Check for any AIChat records that might have training documents
    const chatsWithTrainingContent = aiChats.filter(chat => 
      chat.Question.includes('training') || 
      chat.Answer.includes('training') ||
      chat.Question === 'none' ||
      chat.Answer === 'none'
    );

    console.log(`AIChat records with potential training content: ${chatsWithTrainingContent.length}\n`);

    if (chatsWithTrainingContent.length > 0) {
      chatsWithTrainingContent.forEach((chat, index) => {
        console.log(`Chat ${index + 1}:`);
        console.log(`  ID: ${chat.ChatID}`);
        console.log(`  Question: ${chat.Question}`);
        console.log(`  Answer: ${chat.Answer}`);
        console.log(`  Status: ${chat.Status}`);
        console.log(`  User: ${chat.User?.FirstName} ${chat.User?.LastName}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error checking training documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrainingDocuments(); 