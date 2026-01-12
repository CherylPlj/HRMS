'use client';

import React, { useState, useEffect } from 'react';
import { formatTimeRangeShort } from '@/lib/timeUtils';

interface FacultySchedule {
  faculty: {
    id: number;
    employeeId: string;
    name: string;
    email: string;
    department: string;
    position: string;
    employmentStatus: string;
  };
  schedules: Array<{
    id: number;
    day: string;
    time: string;
    duration: number;
    subject: {
      id: number;
      name: string;
    };
    classSection: {
      id: number;
      name: string;
    };
  }>;
  schedulesByDay: Record<string, any[]>;
  summary: {
    totalSections: number;
    totalHoursPerWeek: number;
  };
}

interface FacultyScheduleViewProps {
  facultyId: number;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyScheduleView({ facultyId }: FacultyScheduleViewProps) {
  const [data, setData] = useState<FacultySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (facultyId) {
      loadFacultySchedule();
    }
  }, [facultyId]);

  const loadFacultySchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedules/faculty/${facultyId}`);
      if (!response.ok) {
        throw new Error('Failed to load faculty schedule');
      }
      const scheduleData = await response.json();
      setData(scheduleData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const { faculty, schedulesByDay, summary } = data;

  // Calculate workload percentage (assuming 40 hours max for full-time)
  const maxHours = 40;
  const workloadPercentage = Math.round((summary.totalHoursPerWeek / maxHours) * 100);

  return (
    <div className="space-y-6">
      {/* Faculty Info Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{faculty.name}</h3>
            <p className="text-sm text-gray-500">{faculty.email}</p>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {faculty.position || 'N/A'}
              </span>
              <span>•</span>
              <span>{faculty.department || 'N/A'}</span>
              <span>•</span>
              <span className="font-medium">{faculty.employeeId}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Employment Status</div>
            <div className="mt-1">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                {faculty.employmentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sections</dt>
                  <dd className="text-lg font-semibold text-gray-900">{summary.totalSections}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Hours/Week</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {summary.totalHoursPerWeek}h
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Workload</dt>
                  <dd className="flex items-baseline">
                    <span className="text-lg font-semibold text-gray-900">{workloadPercentage}%</span>
                    <span className="ml-2 text-sm text-gray-500">of {maxHours}h</span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Weekly Schedule</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b">
                  <h4 className="text-sm sm:text-base font-medium text-gray-900">{day}</h4>
                </div>
                <div className="p-3 sm:p-4">
                  {schedulesByDay[day] && schedulesByDay[day].length > 0 ? (
                    <div className="space-y-2">
                      {schedulesByDay[day].map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{schedule.subject.name}</div>
                            <div className="text-sm text-gray-600">{schedule.classSection.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{formatTimeRangeShort(schedule.time)}</div>
                            <div className="text-xs text-gray-500">{schedule.duration}h</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">No classes scheduled</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
