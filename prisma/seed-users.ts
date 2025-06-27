// import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcrypt';

// // Create a new PrismaClient instance
// const prisma = new PrismaClient();

// // Helper function for hashing passwords
// async function hash(password: string): Promise<string> {
//   const saltRounds = 10;
//   return bcrypt.hash(password, saltRounds);
// }

// async function main() {
//   try {
//     console.log('Creating departments...');
//     // Create departments
//     await prisma.department.createMany({
//       data: [
//         { DepartmentName: 'Pre-School', type: 'Pre_School' },
//         { DepartmentName: 'Primary', type: 'Primary' },
//         { DepartmentName: 'Intermediate', type: 'Intermediate' },
//         { DepartmentName: 'JHS', type: 'JHS' },
//         { DepartmentName: 'Admin', type: 'Admin' },
//       ],
//       skipDuplicates: true
//     });

//     console.log('Creating roles...');
//     // Create roles
//     await prisma.role.createMany({
//       data: [
//         { name: 'SUPER_ADMIN' },
//         { name: 'ADMIN' },
//         { name: 'EMPLOYEE' }
//       ],
//       skipDuplicates: true
//     });

//     // Get role IDs
//     const superAdminRole = await prisma.role.findUnique({
//       where: { name: 'SUPER_ADMIN' }
//     });

//     const adminRole = await prisma.role.findUnique({
//       where: { name: 'ADMIN' }
//     });

//     if (!superAdminRole || !adminRole) {
//       throw new Error('Required roles not found');
//     }

//     console.log('Creating super admin...');
//     // Create Super Admin
//     const superAdminPassword = await hash('5450LS7JF<wg"=£.%Fx3fog5Wp|&^#');
    
//     await prisma.employee.upsert({
//       where: { EmployeeID: 'EMP001' },
//       update: {},
//       create: {
//         EmployeeID: 'EMP001',
//         LastName: 'Admin',
//         FirstName: 'Super',
//         DateOfBirth: new Date('1990-01-01'),
//         Sex: 'Male',
//         DepartmentID: 5, // Admin department
//         HireDate: new Date('2020-01-01'),
//         employmentDetails: {
//           create: {
//             EmploymentStatus: 'Regular',
//             EmployeeType: 'Regular',
//             Position: 'Super Administrator',
//             Designation: 'Admin_Officer'
//           }
//         },
//         User: {
//           create: {
//             UserID: 'SUPER001',
//             FirstName: 'Super',
//             LastName: 'Admin',
//             Email: 'sjsfisuper12345@gmail.com',
//             PasswordHash: superAdminPassword,
//             Status: 'Active',
//             Role: {
//               create: {
//                 roleId: superAdminRole.id
//               }
//             }
//           }
//         }
//       }
//     });

//     console.log('Creating admin user...');
//     // Create one Admin User
//     const adminPassword = await hash('SJSFI@dmin1');
//     await prisma.employee.upsert({
//       where: { EmployeeID: 'EMP002' },
//       update: {},
//       create: {
//         EmployeeID: 'EMP002',
//         LastName: 'Admin',
//         FirstName: 'System',
//         DateOfBirth: new Date('1990-01-01'),
//         Sex: 'Female',
//         DepartmentID: 5, // Admin department
//         HireDate: new Date('2020-01-01'),
//         employmentDetails: {
//           create: {
//             EmploymentStatus: 'Regular',
//             EmployeeType: 'Regular',
//             Position: 'Administrator',
//             Designation: 'Admin_Officer'
//           }
//         },
//         User: {
//           create: {
//             UserID: 'ADMIN001',
//             FirstName: 'System',
//             LastName: 'Admin',
//             Email: 'admin@admin.com',
//             PasswordHash: adminPassword,
//             Status: 'Active',
//             Role: {
//               create: {
//                 roleId: adminRole.id
//               }
//             }
//           }
//         }
//       }
//     });

//     console.log('Database seeded successfully');
//   } catch (error) {
//     console.error('Error seeding database:', error);
//     throw error;
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   }); 