import { prisma } from "@/lib/prisma";
import { createClerkClient } from '@clerk/clerk-sdk-node';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function fixSeededUsers() {
  try {
    console.log('Starting to fix seeded users...');

    // Get all users that don't have a ClerkID
    const usersWithoutClerkID = await prisma.user.findMany({
      where: {
        ClerkID: null,
        isDeleted: false
      },
      select: {
        UserID: true,
        Email: true,
        FirstName: true,
        LastName: true,
        Status: true
      }
    });

    console.log(`Found ${usersWithoutClerkID.length} users without ClerkID`);

    for (const user of usersWithoutClerkID) {
      try {
        console.log(`Processing user: ${user.Email} (${user.UserID})`);

        // Check if user exists in Clerk by email
        const clerkResponse = await clerk.users.getUserList({
          emailAddress: [user.Email]
        });

        if (clerkResponse.data.length > 0) {
          const clerkUser = clerkResponse.data[0];
          console.log(`Found Clerk user: ${clerkUser.id} for ${user.Email}`);

          // Update the user with the Clerk ID
          await prisma.user.update({
            where: { UserID: user.UserID },
            data: { ClerkID: clerkUser.id }
          });

          console.log(`Updated user ${user.UserID} with ClerkID: ${clerkUser.id}`);
        } else {
          console.log(`No Clerk user found for ${user.Email}, creating one...`);

          // Create a new Clerk user
          const newClerkUser = await clerk.users.createUser({
            firstName: user.FirstName,
            lastName: user.LastName,
            emailAddress: [user.Email],
            password: 'TemporaryPassword123!', // They'll need to reset this
            publicMetadata: {
              role: 'Faculty', // Default role, adjust as needed
              status: user.Status
            }
          });

          // Update the user with the new Clerk ID
          await prisma.user.update({
            where: { UserID: user.UserID },
            data: { ClerkID: newClerkUser.id }
          });

          console.log(`Created Clerk user ${newClerkUser.id} for ${user.Email}`);
        }
      } catch (error) {
        console.error(`Error processing user ${user.Email}:`, error);
      }
    }

    console.log('Finished fixing seeded users');
  } catch (error) {
    console.error('Error in fixSeededUsers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixSeededUsers()
  .catch(console.error); 