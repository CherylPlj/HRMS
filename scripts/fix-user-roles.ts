import { prisma } from "@/lib/prisma";

async function fixUserRoles() {
  try {
    console.log('Fixing user roles...\n');

    // Get all roles
    const roles = await prisma.role.findMany();
    console.log('Available roles:');
    roles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role.id})`);
    });
    console.log('');

    // Get all users
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

    console.log('Current user role assignments:');
    users.forEach(user => {
      console.log(`${user.Email}: ${user.Role.length > 0 ? user.Role.map(r => r.role.name).join(', ') : 'No roles'}`);
    });
    console.log('');

    // Define role mappings based on email patterns
    const roleMappings = [
      { email: 'admin@admin.com', roleName: 'Admin' },
      { email: 'faculty@faculty.com', roleName: 'Faculty' },
      { email: 'registrar@registrar.com', roleName: 'Registrar' },
      { email: 'cashier@cashier.com', roleName: 'Cashier' },
      { email: 'student@student.com', roleName: 'Student' },
      { email: 'cjeannepalaje@gmail.com', roleName: 'Admin' },
      { email: 'zaina3ghazi@gmail.com', roleName: 'Faculty' }
    ];

    // Fix role assignments
    for (const mapping of roleMappings) {
      const user = users.find(u => u.Email === mapping.email);
      if (!user) {
        console.log(`User not found: ${mapping.email}`);
        continue;
      }

      const role = roles.find(r => r.name === mapping.roleName);
      if (!role) {
        console.log(`Role not found: ${mapping.roleName}`);
        continue;
      }

      // Check if user already has this role
      const hasRole = user.Role.some(r => r.role.name === mapping.roleName);
      if (hasRole) {
        console.log(`${user.Email} already has role ${mapping.roleName}`);
        continue;
      }

      // Remove existing roles and assign the correct one
      await prisma.userRole.deleteMany({
        where: {
          userId: user.UserID
        }
      });

      // Assign the correct role
      await prisma.userRole.create({
        data: {
          userId: user.UserID,
          roleId: role.id
        }
      });

      console.log(`✅ Assigned role ${mapping.roleName} to ${user.Email}`);
    }

    // Verify the fixes
    console.log('\nVerifying role assignments...');
    const updatedUsers = await prisma.user.findMany({
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

    updatedUsers.forEach(user => {
      console.log(`${user.Email}: ${user.Role.length > 0 ? user.Role.map(r => r.role.name).join(', ') : 'No roles'}`);
    });

    console.log('\n✅ User roles fixed successfully!');

  } catch (error) {
    console.error('Error fixing user roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRoles()
  .catch(console.error); 