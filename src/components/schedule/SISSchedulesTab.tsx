'use client';

import React, { useState, useEffect } from 'react';
import Toast from '@/components/Toast';

interface SISSchedule {
    sisId: number;
    subjectId: number | null;
    subjectName: string;
    subjectCode?: string;
    classSectionId: number | null;
    sectionName: string;
    day: string;
    time: string;
    room: string;
    instructor: string;
    facultyId: number | null;
    facultyName: string;
    isAssigned: boolean;
    duration: number;
    syncStatus?: 'synced' | 'hrms-only' | 'sis-only' | 'unassigned';
    isAssignedInSIS?: boolean;
    existsInHRMS?: boolean;
    hrmsScheduleId?: number | null;
    facultyLeaveStatus?: {
        isOnLeave: boolean;
        leave: {
            LeaveID: number;
            LeaveType: string | null;
            StartDate: Date | null;
            EndDate: Date | null;
            Reason: string;
        } | null;
    } | null;
    originalFacultyId?: number | null;
    originalFacultyName?: string | null;
    shouldRestoreOriginal?: boolean;
    rawData: any;
}

interface Faculty {
    FacultyID: number;
    EmployeeID: string;
    Position?: string | null;
    User: {
        FirstName: string;
        LastName: string;
        Email: string;
    };
    Employee?: {
        EmployeeID: string;
        EmploymentDetail?: {
            Designation?: string | null;
        } | null;
    } | null;
    _count?: {
        Schedules?: number;
    };
}

export default function SISSchedulesTab() {
    const [schedules, setSchedules] = useState<SISSchedule[]>([]);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState<number | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [substituting, setSubstituting] = useState<number | null>(null);
    const [availableTeachers, setAvailableTeachers] = useState<Record<number, Faculty[]>>({});
    const [syncingExisting, setSyncingExisting] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState<number | null>(null);

    // Fetch SIS schedules
    const fetchSISSchedules = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/schedules/fetch-from-sis');
            if (!response.ok) {
                throw new Error('Failed to fetch schedules from SIS');
            }
            const data = await response.json();
            setSchedules(data.schedules || []);
        } catch (error) {
            console.error('Error fetching SIS schedules:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to fetch schedules from SIS',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch faculties for assignment
    const fetchFaculties = async () => {
        try {
            // Fetch faculties and schedules separately to calculate load
            const [facultyResponse, schedulesResponse] = await Promise.all([
                fetch('/api/faculty'),
                fetch('/api/schedules'),
            ]);
            
            if (!facultyResponse.ok) {
                throw new Error('Failed to fetch faculties');
            }
            
            const facultiesData = await facultyResponse.json();
            const schedulesData = schedulesResponse.ok ? await schedulesResponse.json() : [];
            
            // Calculate schedule count for each faculty
            const scheduleCounts = new Map<number, number>();
            if (Array.isArray(schedulesData)) {
                schedulesData.forEach((schedule: any) => {
                    if (schedule.facultyId) {
                        scheduleCounts.set(schedule.facultyId, (scheduleCounts.get(schedule.facultyId) || 0) + 1);
                    }
                });
            }
            
            // Add schedule count to each faculty
            const facultiesWithLoad = (facultiesData || []).map((faculty: Faculty) => ({
                ...faculty,
                _count: {
                    Schedules: scheduleCounts.get(faculty.FacultyID) || 0,
                },
            }));
            
            setFaculties(facultiesWithLoad);
        } catch (error) {
            console.error('Error fetching faculties:', error);
        }
    };

    // Sync subjects and sections from SIS
    const handleSyncSubjectsSections = async (clearExisting: boolean = false) => {
        setSyncing(true);
        try {
            const response = await fetch('/api/sync/subjects-sections-from-sis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clearExisting }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to sync subjects and sections');
            }

            setToast({
                message: `Successfully synced! ${data.results.subjects.created} subjects and ${data.results.sections.created} sections imported.${clearExisting && data.results.subjects.deleted > 0 ? ` Removed ${data.results.subjects.deleted + data.results.sections.deleted} unused items.` : ''}`,
                type: 'success',
            });

            // Refresh schedules to update "Not in HRMS" warnings
            await fetchSISSchedules();
        } catch (error) {
            console.error('Error syncing subjects/sections:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to sync subjects and sections',
                type: 'error',
            });
        } finally {
            setSyncing(false);
        }
    };

    // Sync existing assignments to SIS
    const handleSyncExistingAssignments = async () => {
        setSyncingExisting(true);
        try {
            const response = await fetch('/api/schedules/fetch-from-sis/sync-existing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to sync existing assignments');
            }

            if (data.success && data.summary) {
                const { synced, skipped, errors } = data.summary;
                let message = `Sync complete! `;
                if (synced > 0) message += `${synced} assignment(s) synced to SIS. `;
                if (skipped > 0) message += `${skipped} skipped (no matching SIS schedule). `;
                if (errors > 0) message += `${errors} error(s). `;

                setToast({
                    message: message.trim(),
                    type: synced > 0 ? 'success' : 'error',
                });

                // Refresh schedules to update sync status
                await fetchSISSchedules();
            } else {
                throw new Error(data.error || 'Unexpected response format');
            }
        } catch (error) {
            console.error('Error syncing existing assignments:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to sync existing assignments',
                type: 'error',
            });
        } finally {
            setSyncingExisting(false);
        }
    };

    useEffect(() => {
        fetchSISSchedules();
        fetchFaculties();
    }, []);

    // Fetch available teachers for substitute selection
    const fetchAvailableTeachers = async (schedule: SISSchedule) => {
        try {
            const response = await fetch(
                `/api/schedules/fetch-from-sis/available-teachers?day=${encodeURIComponent(schedule.day)}&time=${encodeURIComponent(schedule.time)}&excludeFacultyId=${schedule.facultyId || ''}`
            );
            if (!response.ok) throw new Error('Failed to fetch available teachers');
            const data = await response.json();
            setAvailableTeachers(prev => ({
                ...prev,
                [schedule.sisId]: data.availableTeachers || [],
            }));
        } catch (error) {
            console.error('Error fetching available teachers:', error);
        }
    };

    // Restore original teacher when leave ends
    const handleRestoreOriginal = async (schedule: SISSchedule) => {
        if (!schedule.hrmsScheduleId || !schedule.originalFacultyId) {
            setToast({
                message: 'Cannot restore: Missing schedule or original teacher information.',
                type: 'error',
            });
            return;
        }

        setSubstituting(schedule.sisId);
        try {
            const response = await fetch('/api/schedules/fetch-from-sis/restore-original-teacher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hrmsScheduleId: schedule.hrmsScheduleId,
                    originalFacultyId: schedule.originalFacultyId,
                    sisScheduleId: schedule.sisId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to restore original teacher');
            }

            setToast({
                message: 'Original teacher restored successfully!',
                type: 'success',
            });

            // Refresh schedules and faculty load
            await Promise.all([fetchSISSchedules(), fetchFaculties()]);
        } catch (error) {
            console.error('Error restoring original teacher:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to restore original teacher',
                type: 'error',
            });
        } finally {
            setSubstituting(null);
        }
    };

    // Assign substitute teacher
    const handleAssignSubstitute = async (schedule: SISSchedule, substituteFacultyId: number) => {
        if (!schedule.subjectId || !schedule.classSectionId) {
            setToast({
                message: 'Cannot assign: Subject or Section not found in HRMS.',
                type: 'error',
            });
            return;
        }

        setSubstituting(schedule.sisId);
        try {
            const response = await fetch('/api/schedules/fetch-from-sis/assign-teacher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sisScheduleId: schedule.sisId,
                    facultyId: substituteFacultyId,
                    subjectId: schedule.subjectId,
                    classSectionId: schedule.classSectionId,
                    day: schedule.day,
                    time: schedule.time,
                    duration: schedule.duration,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to assign substitute teacher');
            }

            setToast({
                message: 'Substitute teacher assigned successfully!',
                type: 'success',
            });

            // Refresh schedules and faculty load
            await Promise.all([fetchSISSchedules(), fetchFaculties()]);
        } catch (error) {
            console.error('Error assigning substitute teacher:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to assign substitute teacher',
                type: 'error',
            });
        } finally {
            setSubstituting(null);
        }
    };

    // Assign teacher to schedule
    const handleAssignTeacher = async (schedule: SISSchedule, facultyId: number) => {
        if (!schedule.subjectId || !schedule.classSectionId) {
            setToast({
                message: 'Cannot assign: Subject or Section not found in HRMS. Please create them first.',
                type: 'error',
            });
            return;
        }

        setAssigning(schedule.sisId);
        try {
            const response = await fetch('/api/schedules/fetch-from-sis/assign-teacher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sisScheduleId: schedule.sisId,
                    facultyId,
                    subjectId: schedule.subjectId,
                    classSectionId: schedule.classSectionId,
                    day: schedule.day,
                    time: schedule.time,
                    duration: schedule.duration,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to assign teacher');
            }

            // Use the message from the API response, which indicates if schedule was created or updated
            setToast({
                message: data.message || 'Teacher assigned successfully!',
                type: 'success',
            });

            // Refresh schedules and faculty load
            await Promise.all([fetchSISSchedules(), fetchFaculties()]);
        } catch (error) {
            console.error('Error assigning teacher:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to assign teacher',
                type: 'error',
            });
        } finally {
            setAssigning(null);
        }
    };

    // Edit assigned faculty
    const handleEditFaculty = async (schedule: SISSchedule, newFacultyId: number) => {
        if (!schedule.subjectId || !schedule.classSectionId) {
            setToast({
                message: 'Cannot edit: Subject or Section not found in HRMS.',
                type: 'error',
            });
            return;
        }

        setEditingFaculty(schedule.sisId);
        try {
            // If schedule doesn't exist in HRMS (SIS Only), create it using assign-teacher endpoint
            // This endpoint handles both creating new schedules and updating existing ones
            if (!schedule.hrmsScheduleId) {
                const response = await fetch('/api/schedules/fetch-from-sis/assign-teacher', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        sisScheduleId: schedule.sisId,
                        facultyId: newFacultyId,
                        subjectId: schedule.subjectId,
                        classSectionId: schedule.classSectionId,
                        day: schedule.day,
                        time: schedule.time,
                        duration: schedule.duration,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || data.message || 'Failed to assign teacher');
                }

                setToast({
                    message: data.message || 'Teacher assigned and schedule created in HRMS successfully!',
                    type: 'success',
                });

                // Refresh schedules and faculty load
                await Promise.all([fetchSISSchedules(), fetchFaculties()]);
                return;
            }

            // If schedule exists in HRMS, update it using PUT endpoint
            // Include sisScheduleId in the request so the endpoint can sync to SIS
            const response = await fetch(`/api/schedules/${schedule.hrmsScheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    facultyId: newFacultyId,
                    subjectId: schedule.subjectId,
                    classSectionId: schedule.classSectionId,
                    day: schedule.day,
                    time: schedule.time,
                    duration: schedule.duration,
                    sisScheduleId: schedule.sisId || undefined, // Include SIS schedule ID for syncing
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to update faculty assignment');
            }

            // Check sync result from the response
            const syncResult = data.sync;
            if (syncResult) {
                if (syncResult.synced) {
                    setToast({
                        message: 'Faculty assignment updated and synced to SIS successfully!',
                        type: 'success',
                    });
                } else {
                    // Sync was attempted but didn't succeed (e.g., endpoint not available, sync disabled)
                    // This is not necessarily an error - assignment is still updated in HRMS
                    setToast({
                        message: 'Faculty assignment updated in HRMS. ' + (syncResult.message || 'Sync to SIS was not completed.'),
                        type: 'success', // Use success since HRMS update succeeded
                    });
                }
            } else if (schedule.sisId) {
                // If SIS ID was provided but no sync result, it means sync wasn't attempted (e.g., missing Employee ID)
                setToast({
                    message: 'Faculty assignment updated in HRMS. Could not sync to SIS (missing Employee ID or sync not configured).',
                    type: 'success', // Still success since HRMS update worked
                });
            } else {
                // No SIS ID, so no sync needed
                setToast({
                    message: 'Faculty assignment updated successfully!',
                    type: 'success',
                });
            }

            // Refresh schedules and faculty load
            await Promise.all([fetchSISSchedules(), fetchFaculties()]);
        } catch (error) {
            console.error('Error editing faculty:', error);
            setToast({
                message: error instanceof Error ? error.message : 'Failed to update faculty assignment',
                type: 'error',
            });
        } finally {
            setEditingFaculty(null);
        }
    };

    // Filter schedules
    const filteredSchedules = schedules
        .filter((schedule) => {
            // Status filter
            if (filter === 'assigned' && !schedule.isAssigned) return false;
            if (filter === 'unassigned' && schedule.isAssigned) return false;

            // Search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return (
                    schedule.subjectName.toLowerCase().includes(search) ||
                    schedule.sectionName.toLowerCase().includes(search) ||
                    schedule.day.toLowerCase().includes(search) ||
                    schedule.instructor.toLowerCase().includes(search)
                );
            }

            return true;
        })
        .sort((a, b) => {
            // When filter is 'all', put unassigned schedules on top
            if (filter === 'all') {
                if (!a.isAssigned && b.isAssigned) return -1;
                if (a.isAssigned && !b.isAssigned) return 1;
            }
            return 0;
        });

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm]);

    return (
        <div className="space-y-4">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Schedules</h3>
                    <p className="text-sm text-gray-500">
                        Fetch schedules from SIS and assign teachers
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleSyncSubjectsSections(false)}
                        disabled={syncing || loading || syncingExisting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Sync subjects and sections from SIS to HRMS"
                    >
                        <svg
                            className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        {syncing ? 'Syncing...' : 'Sync Subjects & Sections'}
                    </button>
                    <button
                        onClick={handleSyncExistingAssignments}
                        disabled={syncing || loading || syncingExisting}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Sync existing HRMS assignments to SIS"
                    >
                        <svg
                            className={`h-5 w-5 ${syncingExisting ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                        </svg>
                        {syncingExisting ? 'Syncing...' : 'Sync Existing to SIS'}
                    </button>
                    <button
                        onClick={fetchSISSchedules}
                        disabled={loading || syncing || syncingExisting}
                        className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <svg
                            className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        {loading ? 'Fetching...' : 'Refresh from SIS'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            {schedules.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-500">Total Schedules</div>
                        <div className="text-2xl font-bold text-gray-900">{schedules.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-500">Unassigned</div>
                        <div className="text-2xl font-bold text-red-600">
                            {schedules.filter(s => !s.isAssigned).length}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by subject, section, day, or instructor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg ${
                            filter === 'all'
                                ? 'bg-[#800000] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('assigned')}
                        className={`px-4 py-2 rounded-lg ${
                            filter === 'assigned'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Assigned
                    </button>
                    <button
                        onClick={() => setFilter('unassigned')}
                        className={`px-4 py-2 rounded-lg ${
                            filter === 'unassigned'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Unassigned
                    </button>
                </div>
            </div>

            {/* Schedules Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
                </div>
            ) : filteredSchedules.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">
                        {schedules.length === 0
                            ? 'No schedules found. Click "Refresh from SIS" to fetch schedules.'
                            : 'No schedules match your filters.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subject
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Section
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Day
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Room
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Teacher
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedSchedules.map((schedule) => (
                                    <tr key={schedule.sisId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {schedule.subjectName}
                                            </div>
                                            {schedule.subjectCode && (
                                                <div className="text-xs text-gray-500">
                                                    {schedule.subjectCode}
                                                </div>
                                            )}
                                            {!schedule.subjectId && (
                                                <div className="text-xs text-red-500 mt-1">
                                                    ⚠ Not in HRMS
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {schedule.sectionName}
                                            </div>
                                            {!schedule.classSectionId && (
                                                <div className="text-xs text-red-500 mt-1">
                                                    ⚠ Not in HRMS
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {schedule.day}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {schedule.time}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {schedule.room || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {schedule.isAssigned ? (
                                                <div className="space-y-1">
                                                    <div className="text-sm text-gray-900">
                                                        {schedule.facultyName}
                                                    </div>
                                                    {schedule.facultyLeaveStatus?.isOnLeave && schedule.facultyLeaveStatus.leave && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                                On Leave ({schedule.facultyLeaveStatus.leave.LeaveType || 'Leave'})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-yellow-600 font-medium">
                                                    Unassigned
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {schedule.isAssigned ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Assigned
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Unassigned
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                            {!schedule.isAssigned ? (
                                                <TeacherAssignmentDropdown
                                                    schedule={schedule}
                                                    faculties={faculties}
                                                    onAssign={handleAssignTeacher}
                                                    assigning={assigning === schedule.sisId}
                                                    disabled={!schedule.subjectId || !schedule.classSectionId}
                                                />
                                            ) : schedule.shouldRestoreOriginal ? (
                                                <button
                                                    onClick={() => handleRestoreOriginal(schedule)}
                                                    disabled={substituting === schedule.sisId}
                                                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={`Restore original teacher: ${schedule.originalFacultyName || 'Original teacher'}`}
                                                >
                                                    {substituting === schedule.sisId ? 'Restoring...' : 'Restore Original'}
                                                </button>
                                            ) : schedule.facultyLeaveStatus?.isOnLeave ? (
                                                <SubstituteTeacherDropdown
                                                    schedule={schedule}
                                                    availableTeachers={availableTeachers[schedule.sisId] || []}
                                                    onFetchAvailable={() => fetchAvailableTeachers(schedule)}
                                                    onAssign={handleAssignSubstitute}
                                                    substituting={substituting === schedule.sisId}
                                                    disabled={!schedule.subjectId || !schedule.classSectionId}
                                                />
                                            ) : (
                                                <EditFacultyDropdown
                                                    schedule={schedule}
                                                    faculties={faculties}
                                                    onEdit={handleEditFaculty}
                                                    editing={editingFaculty === schedule.sisId}
                                                    disabled={!schedule.subjectId || !schedule.classSectionId}
                                                    onRefreshFaculties={fetchFaculties}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination - Always Visible */}
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage >= totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{filteredSchedules.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                                    <span className="font-medium">{Math.min(endIndex, filteredSchedules.length)}</span> of{' '}
                                    <span className="font-medium">{filteredSchedules.length}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    
                                    {/* Page Numbers */}
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        // Show first page, last page, current page, and pages around current
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                        page === currentPage
                                                            ? 'z-10 bg-[#800000] text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800000]'
                                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return (
                                                <span
                                                    key={page}
                                                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }
                                        return null;
                                    })}
                                    
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

interface EditFacultyDropdownProps {
    schedule: SISSchedule;
    faculties: Faculty[];
    onEdit: (schedule: SISSchedule, facultyId: number) => void;
    editing: boolean;
    disabled: boolean;
    onRefreshFaculties?: () => Promise<void>;
}

function EditFacultyDropdown({
    schedule,
    faculties,
    onEdit,
    editing,
    disabled,
    onRefreshFaculties,
}: EditFacultyDropdownProps) {
    const [selectedFacultyId, setSelectedFacultyId] = useState<number | ''>(schedule.facultyId || '');
    const [isOpen, setIsOpen] = useState(false);
    const [conflicts, setConflicts] = useState<Array<{ type: 'teacher' | 'section'; message: string; conflictingSchedule: any }>>([]);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    // Check for conflicts when faculty selection changes
    const checkConflicts = async (facultyId: number) => {
        if (!schedule.subjectId || !schedule.classSectionId || !facultyId) {
            setConflicts([]);
            return;
        }

        setCheckingConflicts(true);
        try {
            const response = await fetch('/api/schedules/check-conflicts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facultyId: facultyId,
                    subjectId: schedule.subjectId,
                    classSectionId: schedule.classSectionId,
                    day: schedule.day,
                    time: schedule.time,
                    scheduleId: schedule.hrmsScheduleId || undefined,
                }),
            });

            const data = await response.json();
            if (data.hasConflicts) {
                setConflicts(data.conflicts || []);
            } else {
                setConflicts([]);
            }
        } catch (error) {
            console.error('Error checking conflicts:', error);
            setConflicts([]);
        } finally {
            setCheckingConflicts(false);
        }
    };

    const handleFacultyChange = (facultyId: number | '') => {
        setSelectedFacultyId(facultyId);
        if (facultyId && typeof facultyId === 'number' && facultyId !== schedule.facultyId) {
            checkConflicts(facultyId);
        } else {
            setConflicts([]);
        }
    };

    const handleEdit = () => {
        if (selectedFacultyId && typeof selectedFacultyId === 'number' && selectedFacultyId !== schedule.facultyId) {
            // Prevent submission if conflicts exist
            if (conflicts.length > 0) {
                return;
            }
            onEdit(schedule, selectedFacultyId);
            setIsOpen(false);
        }
    };

    if (disabled) {
        return (
            <span className="text-xs text-gray-400 italic">
                Cannot edit
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={async () => {
                    const wasClosed = !isOpen;
                    setIsOpen(!isOpen);
                    if (wasClosed) {
                        // Refresh faculty data when opening modal to get latest load counts
                        if (onRefreshFaculties) {
                            await onRefreshFaculties();
                        }
                        setConflicts([]);
                        setSelectedFacultyId(schedule.facultyId || '');
                    }
                }}
                disabled={editing}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Edit assigned faculty"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {editing ? 'Updating...' : 'Edit'}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => {
                            setIsOpen(false);
                            setConflicts([]);
                        }}
                    ></div>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div 
                            className="bg-white rounded-lg shadow-2xl w-full max-w-md border-2 border-gray-300 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 space-y-4">
                                {/* Schedule Details */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                                    <h3 className="text-base font-semibold text-gray-900 mb-3">Edit Faculty Assignment</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-gray-600 text-xs mb-1">Subject:</span>
                                            <span className="font-medium text-gray-900 break-words">
                                                {schedule.subjectCode && `[${schedule.subjectCode}] `}
                                                {schedule.subjectName}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-600 text-xs mb-1">Section:</span>
                                            <span className="font-medium text-gray-900 break-words">{schedule.sectionName}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-600 text-xs mb-1">Day:</span>
                                            <span className="font-medium text-gray-900">{schedule.day}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-600 text-xs mb-1">Time:</span>
                                            <span className="font-medium text-gray-900">{schedule.time}</span>
                                        </div>
                                        <div className="col-span-2 flex flex-col pt-2 border-t border-gray-300">
                                            <span className="text-gray-600 text-xs mb-1">Current Teacher:</span>
                                            <span className="font-medium text-gray-900 break-words">{schedule.facultyName}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Select New Teacher
                                    </label>
                                    <select
                                        value={selectedFacultyId}
                                        onChange={(e) => handleFacultyChange(Number(e.target.value) || '')}
                                        className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="">-- Select Teacher --</option>
                                        {faculties.map((faculty) => {
                                            const position = faculty.Position || 'N/A';
                                            const designation = faculty.Employee?.EmploymentDetail?.Designation 
                                                ? faculty.Employee.EmploymentDetail.Designation.replace(/_/g, ' ')
                                                : 'N/A';
                                            const load = faculty._count?.Schedules || 0;
                                            const isCurrent = faculty.FacultyID === schedule.facultyId;
                                            
                                            return (
                                                <option key={faculty.FacultyID} value={faculty.FacultyID}>
                                                    {faculty.User.FirstName} {faculty.User.LastName} - {position} ({designation}) - Load: {load}
                                                    {isCurrent ? ' (Current)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Conflict Warnings */}
                                {checkingConflicts && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Checking for conflicts...
                                    </div>
                                )}

                                {conflicts.length > 0 && !checkingConflicts && (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-red-800 font-semibold">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            Schedule Conflict Detected
                                        </div>
                                        <div className="text-sm text-red-700 space-y-2">
                                            {conflicts.map((conflict, idx) => (
                                                <div key={idx} className="border-l-4 border-red-400 pl-3">
                                                    <div className="font-medium mb-1">
                                                        {conflict.type === 'teacher' ? 'Teacher Conflict:' : 'Section Conflict:'}
                                                    </div>
                                                    <div className="text-xs">
                                                        {conflict.message}
                                                    </div>
                                                    {conflict.conflictingSchedule && (
                                                        <div className="mt-1 text-xs bg-red-100 p-2 rounded">
                                                            <div><strong>Conflicting Schedule:</strong></div>
                                                            <div>Subject: {conflict.conflictingSchedule.subjectName}</div>
                                                            <div>Section: {conflict.conflictingSchedule.sectionName}</div>
                                                            <div>Teacher: {conflict.conflictingSchedule.teacherName}</div>
                                                            <div>Time: {conflict.conflictingSchedule.day} {conflict.conflictingSchedule.time}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-xs text-red-600 font-medium mt-2">
                                            ⚠ Cannot assign teacher due to schedule conflict. Please resolve conflicts first.
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleEdit}
                                        disabled={!selectedFacultyId || editing || selectedFacultyId === schedule.facultyId || conflicts.length > 0 || checkingConflicts}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Update
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            setConflicts([]);
                                        }}
                                        className="px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

interface TeacherAssignmentDropdownProps {
    schedule: SISSchedule;
    faculties: Faculty[];
    onAssign: (schedule: SISSchedule, facultyId: number) => void;
    assigning: boolean;
    disabled: boolean;
}

function TeacherAssignmentDropdown({
    schedule,
    faculties,
    onAssign,
    assigning,
    disabled,
}: TeacherAssignmentDropdownProps) {
    const [selectedFacultyId, setSelectedFacultyId] = useState<number | ''>('');
    const [isOpen, setIsOpen] = useState(false);
    const [conflicts, setConflicts] = useState<Array<{ type: 'teacher' | 'section'; message: string; conflictingSchedule: any }>>([]);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    // Check for conflicts when faculty selection changes
    const checkConflicts = async (facultyId: number) => {
        if (!schedule.subjectId || !schedule.classSectionId || !facultyId) {
            setConflicts([]);
            return;
        }

        setCheckingConflicts(true);
        try {
            const response = await fetch('/api/schedules/check-conflicts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facultyId: facultyId,
                    subjectId: schedule.subjectId,
                    classSectionId: schedule.classSectionId,
                    day: schedule.day,
                    time: schedule.time,
                }),
            });

            const data = await response.json();
            if (data.hasConflicts) {
                setConflicts(data.conflicts || []);
            } else {
                setConflicts([]);
            }
        } catch (error) {
            console.error('Error checking conflicts:', error);
            setConflicts([]);
        } finally {
            setCheckingConflicts(false);
        }
    };

    const handleFacultyChange = (facultyId: number | '') => {
        setSelectedFacultyId(facultyId);
        if (facultyId && typeof facultyId === 'number') {
            checkConflicts(facultyId);
        } else {
            setConflicts([]);
        }
    };

    const handleAssign = () => {
        if (selectedFacultyId && typeof selectedFacultyId === 'number') {
            // Prevent submission if conflicts exist
            if (conflicts.length > 0) {
                return;
            }
            onAssign(schedule, selectedFacultyId);
            setIsOpen(false);
            setSelectedFacultyId('');
            setConflicts([]);
        }
    };

    if (disabled) {
        return (
            <span className="text-xs text-gray-400 italic">
                Create subject/section first
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        setConflicts([]);
                        setSelectedFacultyId('');
                    }
                }}
                disabled={assigning}
                className="px-3 py-1.5 text-sm bg-[#800000] text-white rounded hover:bg-[#600000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {assigning ? 'Assigning...' : 'Assign Teacher'}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => {
                            setIsOpen(false);
                            setConflicts([]);
                        }}
                    ></div>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div 
                            className="bg-white rounded-lg shadow-2xl w-full max-w-md border-2 border-gray-300 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 space-y-4">
                                {/* Schedule Details */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Schedule Details</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-600">Subject:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {schedule.subjectCode && `[${schedule.subjectCode}] `}
                                                {schedule.subjectName}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Section:</span>
                                            <span className="ml-2 font-medium text-gray-900">{schedule.sectionName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Day:</span>
                                            <span className="ml-2 font-medium text-gray-900">{schedule.day}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Time:</span>
                                            <span className="ml-2 font-medium text-gray-900">{schedule.time}</span>
                                        </div>
                                        {schedule.room && (
                                            <div className="col-span-2">
                                                <span className="text-gray-600">Room:</span>
                                                <span className="ml-2 font-medium text-gray-900">{schedule.room}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Select Teacher
                                    </label>
                                    <select
                                        value={selectedFacultyId}
                                        onChange={(e) => handleFacultyChange(Number(e.target.value) || '')}
                                        className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000] bg-white"
                                    >
                                        <option value="">-- Select Teacher --</option>
                                        {faculties.map((faculty) => {
                                            const position = faculty.Position || 'N/A';
                                            const designation = faculty.Employee?.EmploymentDetail?.Designation 
                                                ? faculty.Employee.EmploymentDetail.Designation.replace(/_/g, ' ')
                                                : 'N/A';
                                            const load = faculty._count?.Schedules || 0;
                                            
                                            return (
                                                <option key={faculty.FacultyID} value={faculty.FacultyID}>
                                                    {faculty.User.FirstName} {faculty.User.LastName} - {position} ({designation}) - Load: {load}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Conflict Warnings */}
                                {checkingConflicts && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Checking for conflicts...
                                    </div>
                                )}

                                {conflicts.length > 0 && !checkingConflicts && (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-red-800 font-semibold">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            Schedule Conflict Detected
                                        </div>
                                        <div className="text-sm text-red-700 space-y-2">
                                            {conflicts.map((conflict, idx) => (
                                                <div key={idx} className="border-l-4 border-red-400 pl-3">
                                                    <div className="font-medium mb-1">
                                                        {conflict.type === 'teacher' ? 'Teacher Conflict:' : 'Section Conflict:'}
                                                    </div>
                                                    <div className="text-xs">
                                                        {conflict.message}
                                                    </div>
                                                    {conflict.conflictingSchedule && (
                                                        <div className="mt-1 text-xs bg-red-100 p-2 rounded">
                                                            <div><strong>Conflicting Schedule:</strong></div>
                                                            <div>Subject: {conflict.conflictingSchedule.subjectName}</div>
                                                            <div>Section: {conflict.conflictingSchedule.sectionName}</div>
                                                            <div>Teacher: {conflict.conflictingSchedule.teacherName}</div>
                                                            <div>Time: {conflict.conflictingSchedule.day} {conflict.conflictingSchedule.time}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-xs text-red-600 font-medium mt-2">
                                            ⚠ Cannot assign teacher due to schedule conflict. Please resolve conflicts first.
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleAssign}
                                        disabled={!selectedFacultyId || assigning || conflicts.length > 0 || checkingConflicts}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#800000] text-white rounded-lg hover:bg-[#600000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Assign
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            setConflicts([]);
                                        }}
                                        className="px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

interface SubstituteTeacherDropdownProps {
    schedule: SISSchedule;
    availableTeachers: Faculty[];
    onFetchAvailable: () => void;
    onAssign: (schedule: SISSchedule, facultyId: number) => void;
    substituting: boolean;
    disabled: boolean;
}

function SubstituteTeacherDropdown({
    schedule,
    availableTeachers,
    onFetchAvailable,
    onAssign,
    substituting,
    disabled,
}: SubstituteTeacherDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFacultyId, setSelectedFacultyId] = useState<number | ''>('');

    const handleOpen = () => {
        if (!isOpen && availableTeachers.length === 0) {
            onFetchAvailable();
        }
        setIsOpen(!isOpen);
    };

    const handleAssign = () => {
        if (selectedFacultyId && typeof selectedFacultyId === 'number') {
            onAssign(schedule, selectedFacultyId);
            setIsOpen(false);
            setSelectedFacultyId('');
        }
    };

    if (disabled) {
        return (
            <span className="text-xs text-gray-400 italic">
                Create subject/section first
            </span>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                disabled={substituting}
                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {substituting ? 'Assigning...' : 'Assign Substitute'}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div 
                            className="bg-white rounded-lg shadow-2xl w-full max-w-md border-2 border-gray-300 pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 space-y-4">
                                {/* Schedule Details */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Schedule Details</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-gray-600">Subject:</span>
                                            <span className="ml-2 font-medium text-gray-900">
                                                {schedule.subjectCode && `[${schedule.subjectCode}] `}
                                                {schedule.subjectName}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Section:</span>
                                            <span className="ml-2 font-medium text-gray-900">{schedule.sectionName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Day:</span>
                                            <span className="ml-2 font-medium text-gray-900">{schedule.day}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Time:</span>
                                            <span className="ml-2 font-medium text-gray-900">{schedule.time}</span>
                                        </div>
                                        {schedule.room && (
                                            <div className="col-span-2">
                                                <span className="text-gray-600">Room:</span>
                                                <span className="ml-2 font-medium text-gray-900">{schedule.room}</span>
                                            </div>
                                        )}
                                        {schedule.facultyName && schedule.facultyName !== 'Unassigned' && (
                                            <div className="col-span-2">
                                                <span className="text-gray-600">Current Teacher:</span>
                                                <span className="ml-2 font-medium text-orange-700">{schedule.facultyName}</span>
                                                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                    On Leave
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Select Substitute Teacher
                                    </label>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Teachers available for {schedule.day} at {schedule.time}
                                    </p>
                                    {availableTeachers.length === 0 ? (
                                        <div className="text-sm text-gray-500 py-3 text-center">
                                            Loading available teachers...
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedFacultyId}
                                            onChange={(e) => setSelectedFacultyId(Number(e.target.value) || '')}
                                            className="w-full px-4 py-3 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 bg-white"
                                        >
                                            <option value="">-- Select Substitute --</option>
                                            {availableTeachers.map((faculty) => {
                                                const position = faculty.Position || 'N/A';
                                                const designation = faculty.Employee?.EmploymentDetail?.Designation 
                                                    ? faculty.Employee.EmploymentDetail.Designation.replace(/_/g, ' ')
                                                    : 'N/A';
                                                const load = faculty._count?.Schedules || 0;
                                                
                                                return (
                                                    <option key={faculty.FacultyID} value={faculty.FacultyID}>
                                                        {faculty.User.FirstName} {faculty.User.LastName} - {position} ({designation}) - Load: {load}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    )}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleAssign}
                                        disabled={!selectedFacultyId || substituting}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Assign Substitute
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
