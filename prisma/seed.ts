// import { PrismaClient } from '@prisma/client';
// import * as bcrypt from 'bcrypt';

// const users = [
//   {
//     email: 'zaina3ghazi@gmail.com',
//     password: 'ZainGhaz1904.',
//     firstName: 'Zaina',
//     lastName: 'Ghazi',
//     roleName: 'ADMIN',
//   },
//   {
//     email: 'cjeannepalaje@gmail.com',
//     password: 'Cheryl1016.',
//     firstName: 'Cheryl',
//     lastName: 'Palaje',
//     roleName: 'FACULTY',
//   },
//   {
//     email: 'sjsfisuper12345@gmail.com',
//     password: '5450LS7JF<wg"=£.%Fx3fog5Wp|&^#',
//     firstName: 'Super',
//     lastName: 'Admin',
//     roleName: 'SUPERADMIN',
//   },
//   {
//     email: 'admin@admin.com',
//     password: 'SJSFI@dmin1',
//     firstName: 'Admin',
//     lastName: 'Account',
//     roleName: 'ADMIN',
//   },
//   {
//     email: 'faculty@faculty.com',
//     password: 'SJSFIF@culty1',
//     firstName: 'Faculty',
//     lastName: 'Account',
//     roleName: 'FACULTY',
//   },
//   {
//     email: 'registrar@registrar.com',
//     password: 'Registrar@SJSFI',
//     firstName: 'Registrar',
//     lastName: 'User',
//     roleName: 'REGISTRAR',
//   },
//   {
//     email: 'cashier@cashier.com',
//     password: 'Cashier@SJSFI',
//     firstName: 'Cashier',
//     lastName: 'User',
//     roleName: 'CASHIER',
//   },
//   {
//     email: 'student@student.com',
//     password: 'Student@SJSFI',
//     firstName: 'Student',
//     lastName: 'User',
//     roleName: 'STUDENT',
//   },
// ];

// async function main() {
//   for (const u of users) {
//     const prisma = new PrismaClient(); // new instance per loop iteration
//     try {
//       const passwordHash = await bcrypt.hash(u.password, 10);
//       const userId = `USR${Date.now()}${Math.floor(Math.random() * 1000)}`;
//       const employeeId = `EMP${Date.now()}${Math.floor(Math.random() * 1000)}`;

//       // Create or upsert user
//       const user = await prisma.user.upsert({
//         where: { Email: u.email },
//         update: {},
//         create: {
//           UserID: userId,
//           FirstName: u.firstName,
//           LastName: u.lastName,
//           Email: u.email,
//           PasswordHash: passwordHash,
//           Status: 'Active',
//           createdBy: 'seed_script',
//           updatedBy: 'seed_script',
//         },
//       });

//       // Create employee
//       await prisma.employee.create({
//         data: {
//           EmployeeID: employeeId,
//           FirstName: u.firstName,
//           LastName: u.lastName,
//           DateOfBirth: new Date('1990-01-01'),
//           User: {
//             connect: { UserID: user.UserID },
//           },
//         },
//       });

//       // Ensure role exists
//       const role = await prisma.role.upsert({
//         where: { name: u.roleName },
//         update: {},
//         create: { name: u.roleName },
//       });

//       // Link user to role
//       await prisma.userRole.upsert({
//         where: {
//           userId_roleId: {
//             userId: user.UserID,
//             roleId: role.id,
//           },
//         },
//         update: {},
//         create: {
//           userId: user.UserID,
//           roleId: role.id,
//         },
//       });

//       console.log(`✅ Created user: ${u.email}`);
//     } catch (error) {
//       console.error(`❌ Error seeding ${u.email}:`, error);
//     } finally {
//       await prisma.$disconnect();
//     }
//   }
// }

// main()
//   .catch((e) => {
//     console.error('❌ Fatal seed error:', e);
//     process.exit(1);
//   });
