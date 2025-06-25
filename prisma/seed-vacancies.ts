import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function seedVacancies() {
    console.log('Seeding vacancies...');

    const vacancies = [
        {
            JobTitle: 'Faculty' as const,
            VacancyName: 'Elementary Teacher',
            Description: 'Full-time position for grades 1-6. Bachelor\'s degree in Education required.',
            HiringManager: 'HR Department',
            Status: 'Active' as const,
            DatePosted: new Date('2025-05-01'),
        },
        {
            JobTitle: 'Faculty' as const,
            VacancyName: 'High School Math Teacher',
            Description: 'Teaching position for junior and senior high school mathematics.',
            HiringManager: 'HR Department',
            Status: 'Active' as const,
            DatePosted: new Date('2025-05-01'),
        },
        {
            JobTitle: 'Other' as const,
            VacancyName: 'School Guidance Counselor',
            Description: 'Full-time counselor position. Psychology or Guidance Counseling degree preferred.',
            HiringManager: 'HR Department',
            Status: 'Active' as const,
            DatePosted: new Date('2025-05-01'),
        },
        {
            JobTitle: 'Other' as const,
            VacancyName: 'Administrative Assistant',
            Description: 'Support role for school administration. Computer literacy and communication skills required.',
            HiringManager: 'HR Department',
            Status: 'Active' as const,
            DatePosted: new Date('2025-05-01'),
        },
    ];

    for (const vacancy of vacancies) {
        try {
            // Check if vacancy already exists
            const existingVacancy = await prisma.vacancy.findFirst({
                where: { 
                    VacancyName: vacancy.VacancyName,
                    isDeleted: false 
                },
            });

            if (!existingVacancy) {
                await prisma.vacancy.create({
                    data: {
                        JobTitle: vacancy.JobTitle,
                        VacancyName: vacancy.VacancyName,
                        Description: vacancy.Description,
                        HiringManager: vacancy.HiringManager,
                        Status: vacancy.Status,
                        DatePosted: vacancy.DatePosted,
                        isDeleted: false,
                    },
                });
                console.log(`✓ Created vacancy: ${vacancy.VacancyName}`);
            } else {
                // Update existing vacancy with new fields if they don't exist
                await prisma.vacancy.update({
                    where: { VacancyID: existingVacancy.VacancyID },
                    data: {
                        Description: vacancy.Description,
                        DatePosted: vacancy.DatePosted,
                        Status: vacancy.Status,
                    },
                });
                console.log(`✓ Updated vacancy: ${vacancy.VacancyName}`);
            }
            
            await delay(100); // Small delay to prevent conflicts
        } catch (error) {
            console.error(`✗ Error with vacancy ${vacancy.VacancyName}:`, error);
        }
    }

    console.log('Vacancy seeding completed!');
}

async function main() {
    try {
        await seedVacancies();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main(); 