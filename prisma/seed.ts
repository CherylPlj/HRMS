import { prisma } from "@/lib/prisma";
import { hashWithSHA256 } from '@/lib/hash';
import { randomUUID } from 'crypto';

// await prisma.role.createMany({
//   data: [
//     { name: 'Admin' },
//     { name: 'Faculty' },
//     { name: 'Registrar' },
//     { name: 'Cashier' },
//   ],
//   skipDuplicates: true
// });

async function createUserWithRole({
    email,
    plainPassword,
    firstName,
    lastName,
    roleName,
}: {
    email: string;
    plainPassword: string;
    firstName: string;
    lastName: string;
    roleName: string;
}) {
    const { saltHash } = hashWithSHA256(plainPassword);

    const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
    });

    return prisma.user.upsert({
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
}

async function main() {
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
    ];

    for (const user of users) {
        const createdUser = await createUserWithRole(user);
        console.log(`Seeded user: ${createdUser.Email}`);
    }
}

main()
    .catch((e) => {
        console.error('Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

