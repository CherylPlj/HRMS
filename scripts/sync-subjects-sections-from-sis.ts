/**
 * Script to sync subjects and sections from SIS to HRMS
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/sync-subjects-sections-from-sis.ts
 * 
 * Options:
 *   --clear-existing  Clear unused experimental data before syncing
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';
const CLEAR_EXISTING = process.argv.includes('--clear-existing');

async function fetchSchedulesFromEnrollmentSystem() {
    if (!SHARED_SECRET || !API_KEY) {
        throw new Error('Missing environment variables: SJSFI_SHARED_SECRET and/or SJSFI_HRMS_API_KEY');
    }

    const requestBody = { data: "fetch-all-schedules" };
    const rawBody = JSON.stringify(requestBody);
    const timestamp = Date.now().toString();
    const message = rawBody + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
        body: rawBody,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch schedules: ${response.status} - ${errorText}`);
    }

    return response.json();
}

async function main() {
    try {
        console.log('🔄 Starting sync from SIS...\n');
        
        if (CLEAR_EXISTING) {
            console.log('⚠️  Clear existing mode: Will delete unused experimental data\n');
        }

        // Fetch schedules from SIS
        console.log('📡 Fetching schedules from SIS...');
        const sisData = await fetchSchedulesFromEnrollmentSystem();
        
        if (!sisData || !(sisData as any).data) {
            console.error('❌ No schedule data received from SIS');
            process.exit(1);
        }

        const sisSchedules = (sisData as any).data || [];
        console.log(`✅ Fetched ${sisSchedules.length} schedules from SIS\n`);

        // Extract unique subjects and sections
        const subjectsMap = new Map();
        const sectionsMap = new Map();

        for (const schedule of sisSchedules) {
            const subjectData = schedule.subject || {};
            const sectionData = schedule.section || {};
            const yearLevelData = schedule.yearLevel || {};

            if (subjectData.id && subjectData.name) {
                const subjectKey = subjectData.id;
                if (!subjectsMap.has(subjectKey)) {
                    subjectsMap.set(subjectKey, {
                        sisId: subjectData.id,
                        name: subjectData.name,
                        code: subjectData.code || null,
                    });
                }
            }

            if (sectionData.id && sectionData.name) {
                const sectionKey = sectionData.id;
                if (!sectionsMap.has(sectionKey)) {
                    sectionsMap.set(sectionKey, {
                        sisId: sectionData.id,
                        name: sectionData.name,
                        capacity: sectionData.capacity || null,
                        gradeLevel: yearLevelData?.name || null,
                    });
                }
            }
        }

        const uniqueSubjects = Array.from(subjectsMap.values());
        const uniqueSections = Array.from(sectionsMap.values());

        console.log(`📚 Found ${uniqueSubjects.length} unique subjects`);
        console.log(`📁 Found ${uniqueSections.length} unique sections\n`);

        const results = {
            subjects: { created: 0, updated: 0, deleted: 0 },
            sections: { created: 0, updated: 0, deleted: 0 },
        };

        // Clear unused data if requested
        if (CLEAR_EXISTING) {
            console.log('🧹 Clearing unused experimental data...');
            const existingSubjects = await prisma.subject.findMany({
                include: { schedules: true },
            });
            const existingSections = await prisma.classSection.findMany({
                include: { schedules: true },
            });

            const sisSubjectNames = new Set(uniqueSubjects.map(s => s.name));
            const sisSectionNames = new Set(uniqueSections.map(s => s.name));

            for (const subject of existingSubjects) {
                if (!sisSubjectNames.has(subject.name) && subject.schedules.length === 0) {
                    await prisma.subject.delete({ where: { id: subject.id } });
                    results.subjects.deleted++;
                }
            }

            for (const section of existingSections) {
                if (!sisSectionNames.has(section.name) && section.schedules.length === 0) {
                    await prisma.classSection.delete({ where: { id: section.id } });
                    results.sections.deleted++;
                }
            }
            console.log(`✅ Deleted ${results.subjects.deleted} unused subjects and ${results.sections.deleted} unused sections\n`);
        }

        // Import/Update Subjects
        console.log('📝 Syncing subjects...');
        for (const subject of uniqueSubjects) {
            const existing = await prisma.subject.findUnique({
                where: { name: subject.name },
            });

            await prisma.subject.upsert({
                where: { name: subject.name },
                update: {
                    code: subject.code || undefined,
                    isActive: true,
                },
                create: {
                    name: subject.name,
                    code: subject.code || undefined,
                    isActive: true,
                },
            });

            if (existing) {
                results.subjects.updated++;
            } else {
                results.subjects.created++;
            }
        }
        console.log(`✅ Subjects: ${results.subjects.created} created, ${results.subjects.updated} updated\n`);

        // Import/Update Sections
        console.log('📝 Syncing sections...');
        for (const section of uniqueSections) {
            const existing = await prisma.classSection.findUnique({
                where: { name: section.name },
            });

            await prisma.classSection.upsert({
                where: { name: section.name },
                update: {
                    capacity: section.capacity || undefined,
                    gradeLevel: section.gradeLevel || undefined,
                    isActive: true,
                },
                create: {
                    name: section.name,
                    capacity: section.capacity || undefined,
                    gradeLevel: section.gradeLevel || undefined,
                    isActive: true,
                },
            });

            if (existing) {
                results.sections.updated++;
            } else {
                results.sections.created++;
            }
        }
        console.log(`✅ Sections: ${results.sections.created} created, ${results.sections.updated} updated\n`);

        console.log('🎉 Sync completed successfully!');
        console.log('\nSummary:');
        console.log(`  Subjects: ${results.subjects.created} created, ${results.subjects.updated} updated${CLEAR_EXISTING ? `, ${results.subjects.deleted} deleted` : ''}`);
        console.log(`  Sections: ${results.sections.created} created, ${results.sections.updated} updated${CLEAR_EXISTING ? `, ${results.sections.deleted} deleted` : ''}`);

    } catch (error) {
        console.error('❌ Error syncing from SIS:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
