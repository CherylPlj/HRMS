import { PrismaClient } from '@prisma/client';
import { generateUserId } from '@/lib/generateUserId';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { firstName, lastName, email, roles, hireDate } = req.body;

    const userId = await generateUserId(new Date(hireDate));

    try {
        // Find role IDs
        const roleRecords = await prisma.role.findMany({
        where: {
            name: { in: roles } // roles should be array: ['Faculty', 'Admin']
        }
        });

        const user = await prisma.user.create({
        data: {
            UserID: userId,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            Roles: {
            create: roleRecords.map(r => ({
                role: {
                connect: { id: r.id }
                }
            }))
            }
        }
        });

        res.status(201).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create user' });
    }
}
