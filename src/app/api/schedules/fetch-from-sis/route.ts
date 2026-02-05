import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Helper function to fetch schedules from enrollment system
async function fetchSchedulesFromEnrollmentSystem() {
    const ENROLLMENT_BASE_URL = process.env.ENROLLMENT_BASE_URL || 'http://localhost:3000';
    const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET || '';
    // Note: When HRMS calls SIS, we use HRMS's API key (SJSFI_HRMS_API_KEY)
    // This is the key that SIS recognizes as coming from HRMS
    const API_KEY = process.env.SJSFI_HRMS_API_KEY || '';

    if (!SHARED_SECRET) {
        throw new Error('Missing required environment variable: SJSFI_SHARED_SECRET');
    }
    
    if (!API_KEY) {
        throw new Error('Missing required environment variable: SJSFI_HRMS_API_KEY. This is the API key that SIS recognizes for HRMS requests.');
    }

    // Prepare body
    const requestBody = { data: "fetch-all-schedules" };
    const rawBody = JSON.stringify(requestBody);

    // Generate timestamp and signature
    const timestamp = Date.now().toString();
    const message = rawBody + timestamp;
    const hmac = crypto.createHmac('sha256', SHARED_SECRET);
    hmac.update(message);
    const signature = hmac.digest('hex');

    // Make request with timeout to avoid hanging (30s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${ENROLLMENT_BASE_URL}/api/hrms/available-schedules`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
        body: rawBody,
        signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch schedules: ${response.status} - ${errorText}`);
    }

    return response.json();
}

/**
 * GET /api/schedules/fetch-from-sis
 * Fetches schedules from SIS enrollment system and returns them
 * for display and teacher assignment
 */
export async function GET() {
    try {
        // Fetch schedules from SIS
        const sisData = await fetchSchedulesFromEnrollmentSystem();
        
        if (!sisData || !sisData.data) {
            return NextResponse.json({
                success: false,
                error: 'No schedule data received from SIS',
            }, { status: 404 });
        }

        const sisSchedules = sisData.data || [];
        
        // Helper function to calculate duration in hours from start and end times
        const calculateDuration = (startTime: string, endTime: string): number => {
            try {
                const [startHour, startMin] = startTime.split(':').map(Number);
                const [endHour, endMin] = endTime.split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;
                const durationMinutes = endMinutes - startMinutes;
                // Convert to hours (rounded to nearest 0.5)
                return Math.round((durationMinutes / 30)) * 0.5;
            } catch {
                return 1; // Default to 1 hour
            }
        };

        // --- Batch load HRMS data (avoids N+1: was 3–5 DB queries per schedule) ---
        const codes = [...new Set((sisSchedules as any[]).map((s: any) => (s.subject?.code || '').trim()).filter(Boolean))];
        const names = [...new Set((sisSchedules as any[]).map((s: any) => (s.subject?.name || '').trim()).filter(Boolean))];
        const uniqueSectionNames = [...new Set((sisSchedules as any[]).map((s: any) => (s.section?.name || '').trim()).filter((n: string) => n && n !== 'Unknown'))];
        const uniqueTeacherIds = [...new Set((sisSchedules as any[]).map((s: any) => s.teacher?.teacherId).filter(Boolean))].map(String);

        const subjectOr = [
            ...(codes.length ? [{ code: { in: codes } }] : []),
            ...(names.length ? [{ name: { in: names } }] : []),
        ].filter(Boolean) as { code?: { in: string[] }; name?: { in: string[] } }[];
        const [subjects, sectionsForLookup, facultyList] = await Promise.all([
            subjectOr.length ? prisma.subject.findMany({ where: { OR: subjectOr } }) : Promise.resolve([]),
            Promise.all(uniqueSectionNames.map((name: string) =>
                prisma.classSection.findFirst({ where: { name: { contains: name, mode: 'insensitive' } } })
            )),
            uniqueTeacherIds.length
                ? prisma.faculty.findMany({
                    where: { EmployeeID: { in: uniqueTeacherIds } },
                    include: {
                        User: { select: { FirstName: true, LastName: true, Email: true } },
                        Leaves: {
                            where: {
                                Status: 'Approved',
                                StartDate: { lte: new Date() },
                                EndDate: { gte: new Date() },
                            },
                            select: { LeaveID: true, LeaveType: true, StartDate: true, EndDate: true, Reason: true },
                            take: 1,
                        },
                    },
                })
                : Promise.resolve([]),
        ]);

        const subjectByCode = new Map<string, (typeof subjects)[0]>();
        const subjectByName = new Map<string, (typeof subjects)[0]>();
        subjects.forEach((s) => {
            if (s.code) subjectByCode.set(s.code, s);
            subjectByName.set(s.name.toLowerCase(), s);
        });
        const sectionByLookupName = new Map<string, NonNullable<Awaited<ReturnType<typeof prisma.classSection.findFirst>>>>();
        sectionsForLookup.forEach((sec, i) => {
            if (sec && uniqueSectionNames[i]) sectionByLookupName.set(uniqueSectionNames[i], sec);
        });
        const facultyByEmployeeId = new Map<string, (typeof facultyList)[0]>();
        facultyList.forEach((f) => { if (f.EmployeeID) facultyByEmployeeId.set(f.EmployeeID, f); });

        // Build schedule keys from SIS data to batch-fetch HRMS schedules
        type ScheduleKey = { subjectId: number; classSectionId: number; day: string; time: string };
        const scheduleKeys: ScheduleKey[] = [];
        for (const sisSchedule of sisSchedules as any[]) {
            const subjectData = sisSchedule.subject || {};
            const sectionData = sisSchedule.section || {};
            const scheduleData = sisSchedule.schedule || {};
            const subjectName = subjectData.name || 'Unknown';
            const subject = subjectData.code ? subjectByCode.get(subjectData.code) : undefined;
            const subjectResolved = subject ?? (subjectName ? subjectByName.get(subjectName.toLowerCase()) : undefined);
            const sectionName = (sectionData.name || '').trim();
            const section = sectionName ? sectionByLookupName.get(sectionName) : undefined;
            const startTime = scheduleData.startTime || '';
            const endTime = scheduleData.endTime || '';
            const timeRange = startTime && endTime ? `${startTime}-${endTime}` : '';
            const day = scheduleData.day || '';
            if (subjectResolved?.id && section?.id && timeRange) {
                scheduleKeys.push({
                    subjectId: subjectResolved.id,
                    classSectionId: section.id,
                    day,
                    time: timeRange,
                });
            }
        }

        const uniqueKeys = Array.from(new Map(scheduleKeys.map((k) => [`${k.subjectId}-${k.classSectionId}-${k.day}-${k.time}`, k])).values());
        const hrmsSchedulesList = uniqueKeys.length
            ? await prisma.schedules.findMany({
                where: { OR: uniqueKeys.map((k) => ({ subjectId: k.subjectId, classSectionId: k.classSectionId, day: k.day, time: k.time })) },
                include: {
                    faculty: {
                        include: {
                            User: { select: { FirstName: true, LastName: true, Email: true } },
                            Employee: { select: { EmployeeID: true } },
                            Leaves: {
                                where: { Status: 'Approved', StartDate: { lte: new Date() }, EndDate: { gte: new Date() } },
                                select: { LeaveID: true, LeaveType: true, StartDate: true, EndDate: true, Reason: true },
                                take: 1,
                            },
                        },
                    },
                },
            })
            : [];

        const scheduleByKey = new Map<string, (typeof hrmsSchedulesList)[0]>();
        hrmsSchedulesList.forEach((s) => {
            scheduleByKey.set(`${s.subjectId}-${s.classSectionId}-${s.day}-${s.time}`, s);
        });

        // Map SIS schedules using in-memory lookups only (no per-schedule DB calls)
        const mappedSchedules = [];

        for (const sisSchedule of sisSchedules as any[]) {
                const scheduleData = sisSchedule.schedule || {};
                const subjectData = sisSchedule.subject || {};
                const sectionData = sisSchedule.section || {};
                const teacherData = sisSchedule.teacher || {};

                const subjectNameRaw = subjectData.name || 'Unknown';
                const subject = subjectData.code ? subjectByCode.get(subjectData.code) : undefined;
                const subjectResolved = subject ?? (subjectNameRaw ? subjectByName.get(subjectNameRaw.toLowerCase()) : undefined);
                let subjectId: number | null = subjectResolved?.id ?? null;
                let subjectName = subjectResolved?.name ?? subjectNameRaw;

                let classSectionId: number | null = null;
                let sectionName = (sectionData.name || 'Unknown').trim() || 'Unknown';
                const section = sectionName !== 'Unknown' ? sectionByLookupName.get(sectionName) : undefined;
                if (section) {
                    classSectionId = section.id;
                    sectionName = section.name;
                }

                const startTime = scheduleData.startTime || '';
                const endTime = scheduleData.endTime || '';
                const timeRange = startTime && endTime ? `${startTime}-${endTime}` : '';
                const isAssignedInSIS = teacherData.assigned === true;
                const teacherId = teacherData.teacherId ?? null;

                const hrmsSchedule = subjectId && classSectionId && timeRange
                    ? scheduleByKey.get(`${subjectId}-${classSectionId}-${scheduleData.day || ''}-${timeRange}`) ?? null
                    : null;

                const isAssigned = isAssignedInSIS || !!hrmsSchedule;

                const originalFaculty = isAssignedInSIS && teacherId ? facultyByEmployeeId.get(teacherId.toString()) : undefined;
                const originalFacultyId = originalFaculty?.FacultyID ?? null;
                const originalFacultyName = originalFaculty ? `${originalFaculty.User.FirstName} ${originalFaculty.User.LastName}` : null;
                const originalFacultyLeaveStatus = originalFaculty
                    ? { isOnLeave: (originalFaculty.Leaves?.length ?? 0) > 0, leave: (originalFaculty.Leaves?.[0] as any) ?? null }
                    : null;

                let facultyId: number | null = null;
                let facultyName = 'Unassigned';
                let facultyLeaveStatus: { isOnLeave: boolean; leave: any } | null = null;

                if (hrmsSchedule?.faculty) {
                    const f = hrmsSchedule.faculty;
                    facultyId = f.FacultyID;
                    facultyName = `${f.User.FirstName} ${f.User.LastName}`;
                    facultyLeaveStatus = { isOnLeave: (f.Leaves?.length ?? 0) > 0, leave: (f.Leaves?.[0] as any) ?? null };
                } else if (isAssignedInSIS && teacherId) {
                    const faculty = facultyByEmployeeId.get(teacherId.toString());
                    if (faculty) {
                        facultyId = faculty.FacultyID;
                        facultyName = `${faculty.User.FirstName} ${faculty.User.LastName}`;
                        facultyLeaveStatus = { isOnLeave: (faculty.Leaves?.length ?? 0) > 0, leave: (faculty.Leaves?.[0] as any) ?? null };
                    } else if (teacherData.teacherName) {
                        facultyName = teacherData.teacherName;
                    }
                }

                const shouldRestoreOriginal = !!(
                    hrmsSchedule?.faculty && originalFacultyId && hrmsSchedule.faculty.FacultyID !== originalFacultyId &&
                    originalFacultyLeaveStatus && !originalFacultyLeaveStatus.isOnLeave
                );

                const duration = startTime && endTime ? calculateDuration(startTime, endTime) : 1;
                const finalDuration = hrmsSchedule?.duration ?? duration;

                const existsInHRMS = !!hrmsSchedule;
                const syncStatus: 'synced' | 'hrms-only' | 'sis-only' | 'unassigned' =
                    !isAssigned ? 'unassigned' :
                    isAssignedInSIS && existsInHRMS ? 'synced' :
                    existsInHRMS && !isAssignedInSIS ? 'hrms-only' :
                    isAssignedInSIS && !existsInHRMS ? 'sis-only' : 'unassigned';

                mappedSchedules.push({
                    sisId: sisSchedule.scheduleId,
                    subjectId,
                    subjectName,
                    subjectCode: subjectData.code,
                    classSectionId,
                    sectionName,
                    day: scheduleData.day || 'Unknown',
                    time: timeRange,
                    room: scheduleData.room || '',
                    instructor: facultyName,
                    facultyId,
                    facultyName,
                    isAssigned,
                    duration: finalDuration,
                    hrmsScheduleId: hrmsSchedule?.id ?? null,
                    syncStatus,
                    isAssignedInSIS,
                    existsInHRMS,
                    facultyLeaveStatus,
                    originalFacultyId,
                    originalFacultyName,
                    shouldRestoreOriginal,
                    yearLevel: sisSchedule.yearLevel?.name,
                    termId: sisSchedule.term?.id,
                    rawData: sisSchedule,
                });
        }

        return NextResponse.json({
            success: true,
            total: mappedSchedules.length,
            assigned: mappedSchedules.filter(s => s.isAssigned).length,
            unassigned: mappedSchedules.filter(s => !s.isAssigned).length,
            schedules: mappedSchedules,
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching schedules from SIS:', error);
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        return NextResponse.json({
            success: false,
            error: isTimeout
                ? 'Request to SIS timed out. The enrollment system may be slow or unavailable.'
                : (error instanceof Error ? error.message : 'Failed to fetch schedules from SIS'),
        }, { status: isTimeout ? 504 : 500 });
    }
}

