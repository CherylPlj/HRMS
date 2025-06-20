import { prisma } from "@/lib/prisma";

async function checkUsersAndRoles() {
  try {
    console.log('Checking users and roles...\n');

    // Check all roles
    const roles = await prisma.role.findMany();
    console.log('Available roles:');
    roles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role.id})`);
    });
    console.log('');

    // Check all users with their roles
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false
      },
      include: {
        Role: {
          include: {
            role: true
          }
        }
      }
    });

    console.log('Users and their roles:');
    users.forEach(user => {
      console.log(`\nUser: ${user.FirstName} ${user.LastName} (${user.Email})`);
      console.log(`  UserID: ${user.UserID}`);
      console.log(`  ClerkID: ${user.ClerkID || 'Not set'}`);
      console.log(`  Status: ${user.Status}`);
      console.log(`  Roles: ${user.Role.length > 0 ? user.Role.map(r => r.role.name).join(', ') : 'No roles assigned'}`);
    });

    // Check users without roles
    const usersWithoutRoles = users.filter(user => user.Role.length === 0);
    if (usersWithoutRoles.length > 0) {
      console.log('\n⚠️  Users without roles:');
      usersWithoutRoles.forEach(user => {
        console.log(`- ${user.Email} (${user.UserID})`);
      });
    }

    // Check UserRole table directly
    console.log('\nUserRole assignments:');
    const userRoles = await prisma.userRole.findMany({
      include: {
        user: true,
        role: true
      }
    });

    userRoles.forEach(userRole => {
      console.log(`- User ${userRole.user.Email} has role ${userRole.role.name}`);
    });

  } catch (error) {
    console.error('Error checking users and roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsersAndRoles()
  .catch(console.error); 