import { prisma } from "@/lib/prisma";
import { hashWithSHA256 } from '@/lib/hash';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

// await prisma.role.createMany({
//   data: [
//     { name: 'Admin' },
//     { name: 'Faculty' },
//     { name: 'Registrar' },
//     { name: 'Cashier' },
//   ],
//   skipDuplicates: true
// });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        try {
            await prisma.department.upsert({
                where: { DepartmentName: dept.name },
                update: {},
                create: { DepartmentName: dept.name },
            });
            await delay(100); // Small delay to prevent prepared statement conflicts
        } catch (error) {
            console.log(`Department ${dept.name} already exists or error:`, error);
        }
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
        try {
            await prisma.documentType.upsert({
                where: { DocumentTypeName: doc.name },
                update: {},
                create: { DocumentTypeName: doc.name, AllowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'] },
            });
            await delay(100); // Small delay to prevent prepared statement conflicts
        } catch (error) {
            console.log(`Document type ${doc.name} already exists or error:`, error);
        }
    }
}

async function createUserWithRole({
    email,
    plainPassword,
    firstName,
    lastName,
    roleName,
    facultyData = null,
}: {
    email: string;
    plainPassword: string;
    firstName: string;
    lastName: string;
    roleName: string;
    facultyData?: {
        departmentName: string;
        position: string;
        dateOfBirth: Date;
        phone?: string;
        address?: string;
        emergencyContact?: string;
    } | null;
}) {
    const { saltHash } = hashWithSHA256(plainPassword);

    const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
    });

    const user = await prisma.user.upsert({
        where: { Email: email },
        update: {
            // Update existing user data
            FirstName: firstName,
            LastName: lastName,
            PasswordHash: saltHash,
            Status: 'Active',
            DateModified: new Date(),
        },
        create: {
            // Generate a unique user ID with this prefix AND FORMAT 2025-XXXX-XXXX
            UserID: `2025-${randomUUID().split('-')[2]}-${randomUUID().split('-')[3]}`,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            PasswordHash: saltHash,
            Status: 'Active',
            Role: {
                create: {
                    roleId: role.id,
                },
            },
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
    console.log('Seeding database...');

    // Create default departments first
    await createDefaultDepartments();
    await createDefaultDocumentTypes();
    console.log('Default departments created/verified');
    console.log('Default document types created/verified');

    // Seed Subjects
    const subjects = [
        'Mathematics',
        'Science',
        'English',
        'History',
        'Filipino',
        'MAPEH',
        'Technology and Livelihood Education',
        'Values Education',
    ];

    for (const name of subjects) {
        await prisma.subject.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('Subjects seeded.');

    // Seed Class Sections
    const gemNames = [
        'Ruby', 'Diamond', 'Sapphire', 'Emerald', 'Pearl', 'Garnet',
        'Amethyst', 'Opal', 'Topaz', 'Peridot', 'Aquamarine', 'Tourmaline'
    ];

    const treeNames = [
        'Narra', 'Mahogany', 'Acacia', 'Pine', 'Oak', 'Maple', 'Cherry', 'Willow',
        'Aspen', 'Birch', 'Cedar', 'Cypress'
    ];

    // Kinder
    await prisma.classSection.upsert({ where: { name: 'Kinder-Ruby' }, update: {}, create: { name: 'Kinder-Ruby' } });
    await prisma.classSection.upsert({ where: { name: 'Kinder-Diamond' }, update: {}, create: { name: 'Kinder-Diamond' } });

    // Grades 1-6 (Gems)
    for (let grade = 1; grade <= 6; grade++) {
        const section1Name = `${grade}-${gemNames[(grade - 1) * 2]}`;
        const section2Name = `${grade}-${gemNames[(grade - 1) * 2 + 1]}`;
        await prisma.classSection.upsert({ where: { name: section1Name }, update: {}, create: { name: section1Name } });
        await prisma.classSection.upsert({ where: { name: section2Name }, update: {}, create: { name: section2Name } });
    }

    // Grades 7-12 (Trees)
    for (let grade = 7; grade <= 12; grade++) {
        const treeIndex = (grade - 7) * 2;
        const section1Name = `${grade}-${treeNames[treeIndex]}`;
        const section2Name = `${grade}-${treeNames[treeIndex + 1]}`;
        await prisma.classSection.upsert({ where: { name: section1Name }, update: {}, create: { name: section1Name } });
        await prisma.classSection.upsert({ where: { name: section2Name }, update: {}, create: { name: section2Name } });
    }
    console.log('Class sections seeded.');

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
        console.log(`Seeded user: ${createdUser.Email} with role: ${user.roleName}`);
        if (user.facultyData) {
            console.log(`  - Faculty record created for department: ${user.facultyData.departmentName}`);
        }
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

