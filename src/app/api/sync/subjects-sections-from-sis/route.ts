import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Helper function to fetch sections from SIS enrollment system
async function fetchSectionsFromSIS() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    if (!SHARED_SECRET) {
        throw new Error('Missing required environment variable: SJSFI_SHARED_SECRET');
    }
    
    if (!API_KEY) {
        throw new Error('Missing required environment variable: SJSFI_HRMS_API_KEY');
    }

    // Prepare body
    const requestBody = { data: "fetch-all-sections" };
    const rawBody = JSON.stringify(requestBody);

    // Generate timestamp and signature
    const timestamp = Date.now().toString();
    const message = rawBody + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    // Make request
    const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/sections`, {
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
        throw new Error(`Failed to fetch sections from SIS: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        throw new Error(`SIS API returned non-JSON response: ${contentType || 'unknown content type'}`);
    }

    const jsonData = await response.json();
    
    // Log raw data retrieved from SIS
    console.log('[SIS Sync] Raw data retrieved from SIS API:');
    console.log(JSON.stringify(jsonData, null, 2));
    console.log(`[SIS Sync] Data type: ${Array.isArray(jsonData) ? 'Array' : typeof jsonData}`);
    console.log(`[SIS Sync] Data length (if array): ${Array.isArray(jsonData) ? jsonData.length : 'N/A'}`);
    
    return jsonData;
}

// Helper function to extract all subjects and sections from SIS data
function extractSubjectsAndSections(sisSections: any[]) {
    const subjectsMap = new Map();
    const sectionsMap = new Map();

    // Helper function to add a subject to the map
    const addSubject = (subject: any) => {
        if (!subject || !subject.id || !subject.name) return;
        const subjectKey = subject.id;
        if (!subjectsMap.has(subjectKey)) {
            subjectsMap.set(subjectKey, {
                sisId: subject.id,
                name: subject.name,
                code: subject.code || null,
            });
        }
    };

    // Helper function to add a section to the map
    const addSection = (section: any, yearLevel?: any, term?: any) => {
        if (!section) return;
        
        // Handle different ID field names (id, sectionId, etc.)
        const sectionId = section.id || section.sectionId || section.SectionID;
        // Handle name - make sure it's a string, not an object
        let sectionName = section.name || section.sectionName;
        
        // If name is an object (like { name: "...", capacity: ... }), extract the name property
        if (sectionName && typeof sectionName === 'object') {
            sectionName = sectionName.name || sectionName.sectionName;
        }
        
        // Fallback to section.section if it's a string
        if (!sectionName && typeof section.section === 'string') {
            sectionName = section.section;
        }
        
        // Ensure sectionName is a string
        if (typeof sectionName !== 'string') {
            console.log('[SIS Sync] ⚠️ Skipping section - name is not a string:', {
                sectionId,
                nameType: typeof sectionName,
                nameValue: sectionName,
                keys: Object.keys(section),
            });
            return;
        }
        
        if (!sectionId || !sectionName) {
            // Log when section data is missing required fields
            console.log('[SIS Sync] ⚠️ Skipping section - missing id or name:', {
                hasId: !!sectionId,
                hasName: !!sectionName,
                sectionId,
                sectionName,
                keys: Object.keys(section),
            });
            return;
        }
        
        // Extract schoolYear from term (term.name or term.schoolYear)
        const schoolYear = term?.name || term?.schoolYear || null;
        // Extract semester if available (might be in term or section)
        const semester = term?.semester || section.semester || null;
        // Extract section code/identifier (might be different from name)
        const sectionCode = section.section || section.sectionCode || null;
        
        const sectionKey = sectionId;
        if (!sectionsMap.has(sectionKey)) {
            sectionsMap.set(sectionKey, {
                sisId: sectionId,
                name: sectionName,  // Ensure this is a string
                section: sectionCode, // Section code/identifier
                schoolYear: schoolYear, // From term.name
                semester: semester, // From term.semester or section.semester
                capacity: section.capacity || null,
                gradeLevel: yearLevel?.name || yearLevel || section.gradeLevel || section.yearLevel || null,
            });
            console.log(`[SIS Sync] ✓ Added section: ID ${sectionId}, name "${sectionName}", schoolYear: ${schoolYear || 'N/A'}, semester: ${semester || 'N/A'}`);
        } else {
            console.log(`[SIS Sync] ⊙ Section already in map: ID ${sectionId}, name "${sectionName}"`);
        }
    };

    // Recursively extract subjects from nested structures
    const extractSubjectsFromObject = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;

        // If object has subject properties directly
        if (obj.subject && obj.subject.id && obj.subject.name) {
            addSubject(obj.subject);
        }

        // If object has subjects array
        if (Array.isArray(obj.subjects)) {
            for (const subj of obj.subjects) {
                addSubject(subj);
            }
        }

        // Recursively check nested objects (schedules, etc.)
        for (const key in obj) {
            if (key === 'subject' || key === 'subjects') continue; // Already handled
            if (Array.isArray(obj[key])) {
                for (const item of obj[key]) {
                    extractSubjectsFromObject(item);
                }
            } else if (obj[key] && typeof obj[key] === 'object') {
                extractSubjectsFromObject(obj[key]);
            }
        }
    };

    // Process each section item - we want ALL sections, even without subjects/schedules
    console.log(`[SIS Sync] Processing ${sisSections.length} items from SIS response`);
    
    for (let i = 0; i < sisSections.length; i++) {
        const sectionItem = sisSections[i];
        
        // Log each item being processed
        console.log(`[SIS Sync] Processing item ${i + 1}/${sisSections.length}:`, {
            keys: Object.keys(sectionItem),
            hasSection: !!sectionItem.section,
            hasId: !!(sectionItem.id || sectionItem.sectionId),
            hasName: !!(sectionItem.name || sectionItem.sectionName || sectionItem.section?.name),
        });
        
        // Handle the SIS response structure: { sectionId: 4, section: { name: "...", capacity: 30 }, yearLevel: {...} }
        // The section ID is at sectionItem.sectionId (top level)
        // The section name is at sectionItem.section.name (nested)
        // The capacity is at sectionItem.section.capacity (nested)
        // The yearLevel is at sectionItem.yearLevel (nested object with name)
        
        const sectionId = sectionItem.sectionId || sectionItem.id;
        const nestedSection = sectionItem.section;
        const yearLevelData = sectionItem.yearLevel || sectionItem.gradeLevel || {};
        const termData = sectionItem.term || {}; // Extract term for schoolYear and semester
        
        if (sectionId && nestedSection && nestedSection.name) {
            // Format: { sectionId: X, section: { name: "...", capacity: ... }, yearLevel: {...}, term: {...} }
            // Build a properly structured section object
            const sectionData = {
                id: sectionId,
                sectionId: sectionId,
                name: nestedSection.name,  // Extract the name string, not the whole object
                sectionName: nestedSection.name,
                section: nestedSection.name, // Also store as section field
                capacity: nestedSection.capacity || nestedSection.currentStudents || null,
            };
            console.log(`[SIS Sync] Item ${i + 1}: Extracting section with ID ${sectionId}, name "${nestedSection.name}", term: ${termData.name || 'N/A'}`);
            addSection(sectionData, yearLevelData, termData);
        } else if (sectionItem.id || sectionItem.sectionId) {
            // Fallback: section data might be at the top level (flat structure)
            console.log(`[SIS Sync] Item ${i + 1}: Using item itself as section (fallback)`);
            addSection(sectionItem, yearLevelData);
        } else {
            console.log(`[SIS Sync] Item ${i + 1}: ⚠️ Skipping - no section ID or name found`);
        }

        // Extract subjects from all possible locations in the section item
        // This is separate - we want sections even without subjects
        extractSubjectsFromObject(sectionItem);

        // Also extract from nested section if it exists
        if (nestedSection && nestedSection !== sectionItem) {
            extractSubjectsFromObject(nestedSection);
        }
    }
    
    console.log(`[SIS Sync] Extraction complete: ${subjectsMap.size} unique subjects, ${sectionsMap.size} unique sections found`);

    return {
        subjects: Array.from(subjectsMap.values()),
        sections: Array.from(sectionsMap.values()),
    };
}

/**
 * GET /api/sync/subjects-sections-from-sis
 * Fetches unique subjects and sections from SIS sections endpoint (preview only, no changes)
 */
export async function GET() {
    try {
        const sisSectionsData = await fetchSectionsFromSIS();
        
        // Handle different response structures
        const sisSections = Array.isArray(sisSectionsData) 
            ? sisSectionsData 
            : (sisSectionsData.data || sisSectionsData.sections || []);
        
        console.log('[SIS Sync GET] Processed sections array:');
        console.log(`[SIS Sync GET] Total sections received: ${Array.isArray(sisSections) ? sisSections.length : 0}`);
        if (Array.isArray(sisSections) && sisSections.length > 0) {
            console.log('[SIS Sync GET] First section example:');
            console.log(JSON.stringify(sisSections[0], null, 2));
        }
        
        if (!Array.isArray(sisSections) || sisSections.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No sections data received from SIS',
            }, { status: 404 });
        }

        // Extract all unique subjects and sections
        const { subjects: uniqueSubjects, sections: uniqueSections } = extractSubjectsAndSections(sisSections);
        
        console.log('[SIS Sync GET] Extracted data:');
        console.log(`[SIS Sync GET] Unique subjects found: ${uniqueSubjects.length}`);
        console.log(`[SIS Sync GET] Unique sections found: ${uniqueSections.length}`);
        console.log('[SIS Sync GET] Subjects:', JSON.stringify(uniqueSubjects, null, 2));
        console.log('[SIS Sync GET] Sections:', JSON.stringify(uniqueSections, null, 2));

        return NextResponse.json({
            success: true,
            preview: true,
            subjects: {
                count: uniqueSubjects.length,
                data: uniqueSubjects,
            },
            sections: {
                count: uniqueSections.length,
                data: uniqueSections,
            },
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching subjects/sections from SIS:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch data from SIS',
        }, { status: 500 });
    }
}

/**
 * POST /api/sync/subjects-sections-from-sis
 * Syncs subjects and sections from SIS to HRMS
 * Body: { clearExisting: boolean } - if true, clears all existing subjects/sections before importing
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clearExisting = false } = body;

        // Fetch sections data from SIS
        const sisSectionsData = await fetchSectionsFromSIS();
        
        // Handle different response structures
        const sisSections = Array.isArray(sisSectionsData) 
            ? sisSectionsData 
            : (sisSectionsData.data || sisSectionsData.sections || []);
        
        console.log('[SIS Sync POST] Processed sections array:');
        console.log(`[SIS Sync POST] Total sections received: ${Array.isArray(sisSections) ? sisSections.length : 0}`);
        if (Array.isArray(sisSections) && sisSections.length > 0) {
            console.log('[SIS Sync POST] First section example:');
            console.log(JSON.stringify(sisSections[0], null, 2));
            if (sisSections.length > 1) {
                console.log(`[SIS Sync POST] ... and ${sisSections.length - 1} more sections`);
            }
        }
        
        if (!Array.isArray(sisSections) || sisSections.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No sections data received from SIS',
            }, { status: 404 });
        }
        
        // Extract all unique subjects and sections
        const { subjects: uniqueSubjects, sections: uniqueSections } = extractSubjectsAndSections(sisSections);
        
        console.log('[SIS Sync POST] Extracted data:');
        console.log(`[SIS Sync POST] Unique subjects found: ${uniqueSubjects.length}`);
        console.log(`[SIS Sync POST] Unique sections found: ${uniqueSections.length}`);
        console.log('[SIS Sync POST] Subjects list:', uniqueSubjects.map(s => ({ id: s.sisId, name: s.name, code: s.code })));
        console.log('[SIS Sync POST] Sections list:', uniqueSections.map(s => ({ id: s.sisId, name: s.name, capacity: s.capacity, gradeLevel: s.gradeLevel })));

        const results = {
            subjects: { created: 0, updated: 0, deleted: 0, errors: [] as any[] },
            sections: { created: 0, updated: 0, deleted: 0, errors: [] as any[] },
        };

        // Clear unused subjects and sections if requested
        if (clearExisting) {
            try {
                // Get all subjects and sections that exist in HRMS
                const existingSubjects = await prisma.subject.findMany({
                    include: {
                        schedules: true,
                    },
                });

                const existingSections = await prisma.classSection.findMany({
                    include: {
                        schedules: true,
                    },
                });

                // Collect SIS subject names and section names
                const sisSubjectNames = new Set(uniqueSubjects.map(s => s.name));
                const sisSectionNames = new Set(uniqueSections.map(s => s.name));

                // Delete subjects that are not in SIS and not used by any schedules
                for (const subject of existingSubjects) {
                    if (!sisSubjectNames.has(subject.name) && subject.schedules.length === 0) {
                        try {
                            await prisma.subject.delete({
                                where: { id: subject.id },
                            });
                            results.subjects.deleted++;
                        } catch (error) {
                            results.subjects.errors.push({
                                subject: subject.name,
                                error: error instanceof Error ? error.message : 'Failed to delete',
                            });
                        }
                    }
                }

                // Delete sections that are not in SIS and not used by any schedules
                for (const section of existingSections) {
                    if (!sisSectionNames.has(section.name) && section.schedules.length === 0) {
                        try {
                            await prisma.classSection.delete({
                                where: { id: section.id },
                            });
                            results.sections.deleted++;
                        } catch (error) {
                            results.sections.errors.push({
                                section: section.name,
                                error: error instanceof Error ? error.message : 'Failed to delete',
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error clearing existing data:', error);
                // Continue with import even if clearing fails
            }
        }

        // Import/Update Subjects - Save ALL subjects from SIS
        console.log(`[SIS Sync POST] Starting to save ${uniqueSubjects.length} subjects to database...`);
        for (const subject of uniqueSubjects) {
            try {
                console.log(`[SIS Sync POST] Processing subject: ${subject.name} (ID: ${subject.sisId}, Code: ${subject.code || 'N/A'})`);
                
                // Check if subject exists
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
                    console.log(`[SIS Sync POST] ✓ Updated subject: ${subject.name}`);
                } else {
                    results.subjects.created++;
                    console.log(`[SIS Sync POST] ✓ Created subject: ${subject.name}`);
                }
            } catch (error: any) {
                // If it's a unique constraint error on code, try updating by code
                if (error.code === 'P2002' && subject.code) {
                    try {
                        await prisma.subject.update({
                            where: { code: subject.code },
                            data: {
                                name: subject.name,
                                isActive: true,
                            },
                        });
                        results.subjects.updated++;
                    } catch (updateError) {
                        results.subjects.errors.push({
                            subject,
                            error: updateError instanceof Error ? updateError.message : 'Unknown error',
                        });
                    }
                } else {
                    results.subjects.errors.push({
                        subject,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }

        // Import/Update Sections - Save ALL sections from SIS
        console.log(`[SIS Sync POST] Starting to save ${uniqueSections.length} sections to database...`);
        for (const section of uniqueSections) {
            try {
                console.log(`[SIS Sync POST] Processing section: ${section.name} (ID: ${section.sisId}, Grade: ${section.gradeLevel || 'N/A'}, Capacity: ${section.capacity || 'N/A'})`);
                
                // Check if section exists
                const existing = await prisma.classSection.findUnique({
                    where: { name: section.name },
                });

                await prisma.classSection.upsert({
                    where: { name: section.name },
                    update: {
                        section: section.section || undefined,
                        schoolYear: section.schoolYear || undefined,
                        semester: section.semester || undefined,
                        capacity: section.capacity || undefined,
                        gradeLevel: section.gradeLevel || undefined,
                        isActive: true,
                    },
                    create: {
                        name: section.name,
                        section: section.section || undefined,
                        schoolYear: section.schoolYear || undefined,
                        semester: section.semester || undefined,
                        capacity: section.capacity || undefined,
                        gradeLevel: section.gradeLevel || undefined,
                        isActive: true,
                    },
                });

                if (existing) {
                    results.sections.updated++;
                    console.log(`[SIS Sync POST] ✓ Updated section: ${section.name}`);
                } else {
                    results.sections.created++;
                    console.log(`[SIS Sync POST] ✓ Created section: ${section.name}`);
                }
            } catch (error: any) {
                console.error(`[SIS Sync POST] ✗ Error saving section ${section.name}:`, error);
                results.sections.errors.push({
                    section,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        console.log(`[SIS Sync POST] Save complete! Summary:`);
        console.log(`[SIS Sync POST]   Subjects: ${results.subjects.created} created, ${results.subjects.updated} updated, ${results.subjects.errors.length} errors`);
        console.log(`[SIS Sync POST]   Sections: ${results.sections.created} created, ${results.sections.updated} updated, ${results.sections.errors.length} errors`);

        return NextResponse.json({
            success: true,
            message: 'Subjects and sections synced from SIS',
            results: {
                subjects: {
                    total: uniqueSubjects.length,
                    created: results.subjects.created,
                    updated: results.subjects.updated,
                    errors: results.subjects.errors.length,
                },
                sections: {
                    total: uniqueSections.length,
                    created: results.sections.created,
                    updated: results.sections.updated,
                    errors: results.sections.errors.length,
                },
            },
            errors: {
                subjects: results.subjects.errors,
                sections: results.sections.errors,
            },
        }, { status: 200 });

    } catch (error) {
        console.error('Error syncing subjects/sections from SIS:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to sync data from SIS',
        }, { status: 500 });
    }
}
