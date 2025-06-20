const { PrismaClient } = require('@prisma/client');
// import { hashWithSHA256 } from '@/lib/hash';
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// Replace this with your real hashing logic
function hashWithSHA256(password) {
  return { saltHash: password }; // For now, we're just returning the raw password
}

async function createDefaultDepartments() {
  const departments = [
    { name: 'Math' },
    { name: 'English' },
    { name: 'Science' },
    { name: 'AP' },
    { name: 'Filipino' },
    { name: 'ESP' },
    { name: 'MAPEH' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { DepartmentName: dept.name },
      update: {},
      create: { DepartmentName: dept.name },
    });
  }
}

async function createDefaultDocumentTypes() {
  const documentTypes = [
    { name: 'Resume' },
    { name: 'Contract' },
    { name: 'Faculty Clearance Form' },
    { name: 'SSS' },
    { name: 'PhilHealth' },
    { name: 'PAGIBIG' },
    { name: 'TIN Number' },
  ];

  for (const doc of documentTypes) {
    await prisma.documentType.upsert({
      where: { DocumentTypeName: doc.name },
      update: {},
      create: { DocumentTypeName: doc.name, AllowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'] },
    });
  }
}

async function createUserWithRole({ email, plainPassword, firstName, lastName, roleName, facultyData = null }) {
  const { saltHash } = hashWithSHA256(plainPassword);

  // Create or get the role
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });

  // Create or update the user
  const user = await prisma.user.upsert({
    where: { Email: email },
    update: {
      FirstName: firstName,
      LastName: lastName,
      PasswordHash: saltHash,
      Status: 'Active',
      DateModified: new Date(),
    },
    create: {
      UserID: `2025-${randomUUID().split('-')[2]}-${randomUUID().split('-')[3]}`,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      PasswordHash: saltHash,
      Status: 'Active',
    },
  });

  // Connect user and role through the join table
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.UserID,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId: user.UserID,
      roleId: role.id,
    },
  });

  // If this is a faculty user and faculty data is provided, create faculty record
  if (roleName === 'Faculty' && facultyData) {
    const department = await prisma.department.findFirst({
      where: { DepartmentName: facultyData.departmentName },
    });

    if (!department) {
      throw new Error(`Department '${facultyData.departmentName}' not found`);
    }

    await prisma.faculty.upsert({
      where: { UserID: user.UserID },
      update: {
        DateOfBirth: facultyData.dateOfBirth,
        Phone: facultyData.phone,
        Address: facultyData.address,
        Position: facultyData.position,
        DepartmentID: department.DepartmentID,
        EmergencyContact: facultyData.emergencyContact,
        HireDate: new Date(), // Default hire date to today
      },
      create: {
        FacultyID: parseInt(randomUUID().split('-')[0], 16) % 1000000, // Generate a unique FacultyID
        UserID: user.UserID,
        DateOfBirth: facultyData.dateOfBirth,
        Phone: facultyData.phone,
        Address: facultyData.address,
        Position: facultyData.position,
        DepartmentID: department.DepartmentID,
        EmergencyContact: facultyData.emergencyContact,
        HireDate: new Date(), // Default hire date to today
      },
    });
  }

  return user;
}

async function main() {
  // Create default departments first
  await createDefaultDepartments();
  await createDefaultDocumentTypes();
  console.log('✅ Default departments and document types created/verified');

  const users = [
    {
      email: 'admin@admin.com',
      plainPassword: 'SJSFI@dmin1',
      firstName: 'Admin',
      lastName: 'User',
      roleName: 'Admin',
    },
    {
      email: 'faculty@faculty.com',
      plainPassword: 'SJSFIF@culty1',
      firstName: 'Faculty',
      lastName: 'User',
      roleName: 'Faculty',
      facultyData: {
        departmentName: 'Math',
        position: 'Assistant Professor',
        dateOfBirth: new Date('1990-01-15'),
        phone: '+63 912 345 6789',
        address: '123 Faculty Street, Manila, Philippines',
        emergencyContact: '+63 998 765 4321',
      },
    },
    {
      email: 'faculty2@faculty.com',
      plainPassword: 'SJSFIF@culty2',
      firstName: 'Jane',
      lastName: 'Smith',
      roleName: 'Faculty',
      facultyData: {
        departmentName: 'English',
        position: 'Associate Professor',
        dateOfBirth: new Date('1985-06-20'),
        phone: '+63 923 456 7890',
        address: '456 Teacher Avenue, Quezon City, Philippines',
        emergencyContact: '+63 987 654 3210',
      },
    },
    {
      email: 'faculty3@faculty.com',
      plainPassword: 'SJSFIF@culty3',
      firstName: 'Michael',
      lastName: 'Johnson',
      roleName: 'Faculty',
      facultyData: {
        departmentName: 'Science',
        position: 'Professor',
        dateOfBirth: new Date('1980-12-10'),
        phone: '+63 934 567 8901',
        address: '789 Business Road, Makati, Philippines',
        emergencyContact: '+63 976 543 2109',
      },
    },
    {
      email: 'registrar@registrar.com',
      plainPassword: 'Registrar@SJSFI',
      firstName: 'Registrar',
      lastName: 'User',
      roleName: 'Registrar',
    },
    {
      email: 'cashier@cashier.com',
      plainPassword: 'Cashier@SJSFI',
      firstName: 'Cashier',
      lastName: 'User',
      roleName: 'Cashier',
    },
    {
      email: 'student@student.com',
      plainPassword: 'Student@SJSFI',
      firstName: 'Student',
      lastName: 'User',
      roleName: 'Student',
    },
  ];

  for (const user of users) {
    const createdUser = await createUserWithRole(user);
    console.log(`✅ Seeded user: ${createdUser.Email} with role: ${user.roleName}`);
    if (user.facultyData) {
      console.log(`  📚 Faculty record created for department: ${user.facultyData.departmentName}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
