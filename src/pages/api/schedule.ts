// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// import { NextApiRequest, NextApiResponse } from 'next';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method === 'POST') {
//         const { facultyID, dayOfWeek, startTime, endTime, subject, classSection } = req.body;

//         try {
//             const schedule = await prisma.schedule.create({
//                 data: {
//                     FacultyID: facultyID,
//                     DayOfWeek: dayOfWeek,
//                     StartTime: new Date(`1970-01-01T${startTime}:00Z`), // Adjust as necessary
//                     EndTime: new Date(`1970-01-01T${endTime}:00Z`), // Adjust as necessary
//                     Subject: subject,
//                     ClassSection: classSection,
//                 },
//             });
//             res.status(201).json(schedule);
//         } catch (error) {
//             console.error(error);
//             res.status(500).json({ error: 'Error adding schedule' });
//         }
//     } else {
//         res.setHeader('Allow', ['POST']);
//         res.status(405).end(`Method ${req.method} Not Allowed`);
//     }
// }

import { PrismaClient } from '@/generated/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { facultyID, dayOfWeek, startTime, endTime, subject, classSection } = req.body;

        try {
            const schedule = await prisma.schedule.create({
                data: {
                    FacultyID: facultyID,
                    DayOfWeek: dayOfWeek,
                    StartTime: new Date(`1970-01-01T${startTime}:00Z`),
                    EndTime: new Date(`1970-01-01T${endTime}:00Z`),
                    Subject: subject,
                    ClassSection: classSection,
                },
            });
            res.status(201).json(schedule);
        } catch (error) {
            console.error("Error adding schedule:", error);
            res.status(500).json({ error: 'Error adding schedule' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}