import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncSectionAdviserToSIS } from '@/lib/sisSync';
import crypto from 'crypto';

/**
 * Helper function to fetch sections from SIS
 */
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

    // For GET requests, body is empty string
    const body = '';
    const timestamp = Date.now().toString();
    const message = body + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    // Fetch sections from SIS
    const response = await fetch(`${ENROLLMENT_BASE_URL}/api/sections`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Fetch Sections from SIS] Error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
        });
        throw new Error(`Failed to fetch sections from SIS: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Fetch Sections from SIS] Raw response received:', JSON.stringify(data, null, 2));
    
    // Handle different response formats
    const sections = data.data || data.sections || [];
    console.log(`[Fetch Sections from SIS] Parsed ${sections.length} sections from response`);
    
    // Log details of each section received
    if (sections.length > 0) {
        console.log('[Fetch Sections from SIS] Section details:');
        sections.forEach((section: any, index: number) => {
            console.log(`  [${index + 1}] Section ID: ${section.sectionId}, Name: ${section.section?.name}, Adviser: ${section.adviser ? JSON.stringify(section.adviser) : 'null'}`);
        });
    }
    
    return sections;
}

/**
 * POST /api/schedules/fetch-from-sis/sync-section-advisers
 * Fetches sections from SIS and syncs adviser assignments from HRMS to SIS
 */
export async function POST(request: Request) {
    try {
        console.log('[Sync Section Advisers] Starting sync to SIS...');

        // Fetch sections from SIS
        const sisSections = await fetchSectionsFromSIS();
        
        if (!sisSections || sisSections.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No sections found in SIS',
            }, { status: 404 });
        }

        console.log(`[Sync Section Advisers] Found ${sisSections.length} sections in SIS`);
        console.log('[Sync Section Advisers] SIS Sections data:', JSON.stringify(sisSections, null, 2));

        // Get all HRMS sections with their adviser assignments
        console.log('[Sync Section Advisers] Fetching HRMS sections...');
        const hrmsSections = await prisma.classSection.findMany({
            include: {
                adviserFaculty: {
                    include: {
                        User: {
                            select: {
                                FirstName: true,
                                LastName: true,
                                Email: true,
                            },
                        },
                        Employee: {
                            select: {
                                EmployeeID: true,
                            },
                        },
                    },
                },
            },
        });

        console.log(`[Sync Section Advisers] Found ${hrmsSections.length} sections in HRMS`);
        console.log('[Sync Section Advisers] HRMS Sections data:', JSON.stringify(hrmsSections.map(s => ({
            id: s.id,
            name: s.name,
            adviserFacultyId: s.adviserFacultyId,
            adviserEmployeeId: s.adviserFaculty?.Employee?.EmployeeID,
            adviserName: s.adviserFaculty ? `${s.adviserFaculty.User.FirstName} ${s.adviserFaculty.User.LastName}` : null,
        })), null, 2));

        const results = [];
        let syncedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        console.log('[Sync Section Advisers] Starting to process sections...');
        for (const sisSection of sisSections) {
            console.log(`[Sync Section Advisers] Processing SIS section:`, JSON.stringify(sisSection, null, 2));
            const sectionName = sisSection.section?.name;
            const sisSectionId = sisSection.sectionId;
            
            if (!sectionName || !sisSectionId) {
                skippedCount++;
                results.push({
                    sisSectionId,
                    sectionName: sectionName || 'Unknown',
                    status: 'skipped',
                    reason: 'Missing section name or sectionId',
                });
                continue;
            }

            // Find matching HRMS section by name (case-insensitive)
            const hrmsSection = hrmsSections.find(section => 
                section.name.toLowerCase() === sectionName.toLowerCase()
            );

            console.log(`[Sync Section Advisers] Matching HRMS section for "${sectionName}":`, hrmsSection ? {
                id: hrmsSection.id,
                name: hrmsSection.name,
                adviserFacultyId: hrmsSection.adviserFacultyId,
                adviserEmployeeId: hrmsSection.adviserFaculty?.Employee?.EmployeeID,
            } : 'Not found');

            if (!hrmsSection) {
                skippedCount++;
                results.push({
                    sisSectionId,
                    sectionName,
                    status: 'skipped',
                    reason: 'Section not found in HRMS',
                });
                continue;
            }

            // Check if HRMS has an adviser assigned
            console.log(`[Sync Section Advisers] HRMS section "${sectionName}" has adviser:`, {
                hasAdviser: !!hrmsSection.adviserFacultyId,
                adviserFacultyId: hrmsSection.adviserFacultyId,
                adviserEmployeeId: hrmsSection.adviserFaculty?.Employee?.EmployeeID,
            });
            console.log(`[Sync Section Advisers] SIS section "${sectionName}" has adviser:`, sisSection.adviser);

            if (!hrmsSection.adviserFacultyId || !hrmsSection.adviserFaculty) {
                // No adviser in HRMS - send null to unassign in SIS if there's currently an adviser
                if (sisSection.adviser !== null) {
                    console.log(`[Sync Section Advisers] Unassigning adviser from SIS section "${sectionName}" (sectionId: ${sisSectionId})`);
                    // Unassign adviser in SIS
                    try {
                        const syncResult = await syncSectionAdviserToSIS({
                            sectionId: sisSectionId, // Use SIS sectionId
                            sectionName: hrmsSection.name,
                            employeeId: null,
                            adviserName: null,
                            adviserEmail: null,
                        });

                        if (syncResult.synced) {
                            syncedCount++;
                            results.push({
                                sisSectionId,
                                sectionName: hrmsSection.name,
                                status: 'synced',
                                action: 'unassigned',
                                message: 'Adviser unassigned in SIS',
                            });
                        } else {
                            skippedCount++;
                            results.push({
                                sisSectionId,
                                sectionName: hrmsSection.name,
                                status: 'skipped',
                                reason: syncResult.message || 'Sync not attempted',
                            });
                        }
                    } catch (error: any) {
                        errorCount++;
                        results.push({
                            sisSectionId,
                            sectionName: hrmsSection.name,
                            status: 'error',
                            reason: error.message || 'Failed to unassign adviser',
                        });
                    }
                } else {
                    // Already unassigned in SIS, skip
                    skippedCount++;
                    results.push({
                        sisSectionId,
                        sectionName: hrmsSection.name,
                        status: 'skipped',
                        reason: 'No adviser in HRMS and already unassigned in SIS',
                    });
                }
            } else {
                // HRMS has an adviser - sync to SIS
                const employeeId = hrmsSection.adviserFaculty.Employee?.EmployeeID;
                const adviserName = `${hrmsSection.adviserFaculty.User.FirstName} ${hrmsSection.adviserFaculty.User.LastName}`.trim();
                const adviserEmail = hrmsSection.adviserFaculty.User.Email;

                console.log(`[Sync Section Advisers] Syncing adviser to SIS section "${sectionName}" (sectionId: ${sisSectionId}):`, {
                    employeeId,
                    adviserName,
                    adviserEmail,
                });

                if (!employeeId) {
                    skippedCount++;
                    results.push({
                        sisSectionId,
                        sectionName: hrmsSection.name,
                        status: 'skipped',
                        reason: 'Adviser in HRMS has no EmployeeID',
                    });
                    continue;
                }

                try {
                    console.log(`[Sync Section Advisers] Calling syncSectionAdviserToSIS with:`, {
                        sectionId: sisSectionId,
                        sectionName: hrmsSection.name,
                        employeeId,
                        adviserName,
                        adviserEmail,
                    });
                    
                    const syncResult = await syncSectionAdviserToSIS({
                        sectionId: sisSectionId, // Use SIS sectionId
                        sectionName: hrmsSection.name,
                        employeeId: employeeId,
                        adviserName: adviserName,
                        adviserEmail: adviserEmail,
                    });

                    console.log(`[Sync Section Advisers] Sync result for "${sectionName}":`, syncResult);

                    if (syncResult.synced) {
                        syncedCount++;
                        results.push({
                            sisSectionId,
                            sectionName: hrmsSection.name,
                            status: 'synced',
                            action: 'assigned',
                            employeeId: employeeId,
                            adviserName: adviserName,
                            message: 'Adviser synced to SIS successfully',
                        });
                    } else {
                        skippedCount++;
                        results.push({
                            sisSectionId,
                            sectionName: hrmsSection.name,
                            status: 'skipped',
                            reason: syncResult.message || syncResult.error || 'Sync not attempted',
                        });
                    }
                } catch (error: any) {
                    errorCount++;
                    results.push({
                        sisSectionId,
                        sectionName: hrmsSection.name,
                        status: 'error',
                        reason: error.message || 'Failed to sync adviser',
                    });
                }
            }
        }

        console.log(`[Sync Section Advisers] Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`);

        return NextResponse.json({
            success: true,
            message: `Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`,
            summary: {
                total: sisSections.length,
                synced: syncedCount,
                skipped: skippedCount,
                errors: errorCount,
            },
            results,
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Sync Section Advisers] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to sync section advisers to SIS',
        }, { status: 500 });
    }
}
