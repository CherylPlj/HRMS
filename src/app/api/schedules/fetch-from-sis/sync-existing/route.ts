import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncAssignmentToSIS } from '@/lib/sisSync';
import crypto from 'crypto';

/**
 * POST /api/schedules/fetch-from-sis/sync-existing
 * Syncs all existing HRMS schedule assignments to SIS
 * 
 * This endpoint:
 * 1. Fetches all schedules from SIS
 * 2. Matches them with HRMS schedules (by subject, section, day, time)
 * 3. For each match where HRMS has a teacher assigned, syncs to SIS
 */
export async function POST(request: Request) {
    try {
        const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
        const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
        const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

        if (!SHARED_SECRET || !API_KEY) {
            return NextResponse.json({
                success: false,
                error: 'Missing required environment variables (SJSFI_SHARED_SECRET or SJSFI_HRMS_API_KEY)',
            }, { status: 500 });
        }

        // Fetch all schedules from SIS
        console.log('[Sync Existing] Fetching schedules from SIS...');
        const timestamp = Date.now().toString();
        const body = JSON.stringify({ data: 'fetch-all-schedules' });
        const message = body + timestamp;
        const hmac = crypto.createHmac('sha256', SHARED_SECRET);
        hmac.update(message);
        const signature = hmac.digest('hex');

        const sisResponse = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
            body: body,
        });

        if (!sisResponse.ok) {
            return NextResponse.json({
                success: false,
                error: `Failed to fetch schedules from SIS: ${sisResponse.status} ${sisResponse.statusText}`,
            }, { status: sisResponse.status });
        }

        const sisData = await sisResponse.json();
        const sisSchedules = sisData.schedules || sisData.data?.schedules || [];
        
        if (!Array.isArray(sisSchedules)) {
            console.error('[Sync Existing] Invalid SIS response format:', sisData);
            return NextResponse.json({
                success: false,
                error: 'Invalid response format from SIS. Expected schedules array.',
                sisResponse: sisData,
            }, { status: 500 });
        }

        console.log(`[Sync Existing] Found ${sisSchedules.length} schedules in SIS`);

        // Get all HRMS schedules with faculty assigned
        const hrmsSchedules = await prisma.schedules.findMany({
            include: {
                faculty: {
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
                subject: true,
                classSection: true,
            },
        });

        console.log(`[Sync Existing] Found ${hrmsSchedules.length} HRMS schedules with teachers assigned`);

        // Match and sync
        const syncResults = [];
        let syncedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const hrmsSchedule of hrmsSchedules) {
            if (!hrmsSchedule.faculty || !hrmsSchedule.faculty.Employee?.EmployeeID) {
                skippedCount++;
                continue;
            }

            // Find matching SIS schedule
            const matchingSisSchedule = sisSchedules.find((sisSchedule: any) => {
                const scheduleData = sisSchedule.schedule || {};
                const subjectData = sisSchedule.subject || {};
                const sectionData = sisSchedule.section || {};

                // Match by subject name/code
                const subjectMatches = 
                    hrmsSchedule.subject.name.toLowerCase().includes((subjectData.name || '').toLowerCase()) ||
                    hrmsSchedule.subject.code === subjectData.code;

                // Match by section name
                const sectionMatches = 
                    hrmsSchedule.classSection.name.toLowerCase().includes((sectionData.name || '').toLowerCase());

                // Match by day
                const dayMatches = scheduleData.day === hrmsSchedule.day;

                // Match by time (format: "HH:MM-HH:MM")
                const timeMatches = scheduleData.startTime && scheduleData.endTime
                    ? `${scheduleData.startTime}-${scheduleData.endTime}` === hrmsSchedule.time
                    : false;

                return subjectMatches && sectionMatches && dayMatches && timeMatches;
            });

            if (!matchingSisSchedule) {
                syncResults.push({
                    hrmsScheduleId: hrmsSchedule.id,
                    status: 'skipped',
                    reason: 'No matching SIS schedule found',
                    subject: hrmsSchedule.subject.name,
                    section: hrmsSchedule.classSection.name,
                    day: hrmsSchedule.day,
                    time: hrmsSchedule.time,
                });
                skippedCount++;
                continue;
            }

            // Get SIS schedule ID
            const sisScheduleId = matchingSisSchedule.schedule?.id || matchingSisSchedule.id;
            if (!sisScheduleId) {
                syncResults.push({
                    hrmsScheduleId: hrmsSchedule.id,
                    status: 'skipped',
                    reason: 'SIS schedule ID not found',
                    subject: hrmsSchedule.subject.name,
                    section: hrmsSchedule.classSection.name,
                });
                skippedCount++;
                continue;
            }

            // Sync to SIS
            const employeeId = hrmsSchedule.faculty.Employee.EmployeeID;
            try {
                const syncResult = await syncAssignmentToSIS({
                    scheduleId: sisScheduleId,
                    employeeId: employeeId,
                    assigned: true,
                });

                if (syncResult.synced) {
                    syncedCount++;
                    syncResults.push({
                        hrmsScheduleId: hrmsSchedule.id,
                        sisScheduleId: sisScheduleId,
                        status: 'synced',
                        employeeId: employeeId,
                        teacherName: `${hrmsSchedule.faculty.User.FirstName} ${hrmsSchedule.faculty.User.LastName}`,
                        subject: hrmsSchedule.subject.name,
                        section: hrmsSchedule.classSection.name,
                    });
                } else {
                    errorCount++;
                    syncResults.push({
                        hrmsScheduleId: hrmsSchedule.id,
                        sisScheduleId: sisScheduleId,
                        status: 'failed',
                        reason: syncResult.message || syncResult.error || 'Unknown error',
                        employeeId: employeeId,
                        subject: hrmsSchedule.subject.name,
                        section: hrmsSchedule.classSection.name,
                    });
                }
            } catch (error: any) {
                errorCount++;
                syncResults.push({
                    hrmsScheduleId: hrmsSchedule.id,
                    sisScheduleId: sisScheduleId,
                    status: 'error',
                    reason: error.message || 'Sync error',
                    employeeId: employeeId,
                    subject: hrmsSchedule.subject.name,
                    section: hrmsSchedule.classSection.name,
                });
            }
        }

        console.log(`[Sync Existing] Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`);

        return NextResponse.json({
            success: true,
            message: `Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`,
            summary: {
                total: hrmsSchedules.length,
                synced: syncedCount,
                skipped: skippedCount,
                errors: errorCount,
            },
            results: syncResults,
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Sync Existing] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to sync existing assignments',
        }, { status: 500 });
    }
}
