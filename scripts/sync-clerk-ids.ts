import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import type { User as ClerkUser, EmailAddress } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ✅ New paginated fetch function
async function getAllClerkUsers(): Promise<ClerkUser[]> {
  let allUsers: ClerkUser[] = [];
  let hasMore = true;
  let offset = 0;
  const limit = 100;

  while (hasMore) {
    const response = await clerk.users.getUserList({ limit, offset });
    allUsers = allUsers.concat(response.data);
    offset += response.data.length;
    hasMore = response.data.length === limit;
  }

  return allUsers;
}

// ✅ Main sync function
async function main() {
  try {
    const clerkUsers = await getAllClerkUsers();
    const dbUsers = await prisma.user.findMany({
      where: { ClerkID: null },
    });

    console.log(`Found ${clerkUsers.length} Clerk users and ${dbUsers.length} database users without ClerkID`);

    for (const dbUser of dbUsers) {
      const clerkUser = clerkUsers.find((cu: ClerkUser) =>
        cu.emailAddresses.some((email: EmailAddress) =>
          email.emailAddress.toLowerCase() === dbUser.Email.toLowerCase()
        )
      );

      if (clerkUser) {
        await prisma.user.update({
          where: { UserID: dbUser.UserID },
          data: {
            ClerkID: clerkUser.id,
            updatedBy: 'sync-clerk-ids-script',
          },
        });
        console.log(`✅ Updated ${dbUser.Email} with Clerk ID ${clerkUser.id}`);
      } else {
        console.log(`⚠️  No matching Clerk user found for ${dbUser.Email}`);
      }
    }

    console.log('✅ Clerk ID sync completed successfully');
  } catch (error) {
    console.error('❌ Error syncing Clerk IDs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
