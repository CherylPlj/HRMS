'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Schedule, ScheduleFormData } from '@/contexts/ScheduleContext';

interface ScheduleFormProps {
  schedule?: Schedule | null;
  onSubmit: (data: ScheduleFormData | ScheduleFormData[]) => Promise<boolean>;
  onCancel?: () => void;
  loading?: boolean;
}

interface Faculty {
  FacultyID: number;
  EmployeeID: string;
  Position?: string | null;
  User: {
    FirstName: string;
    LastName: string;
  };
  Employee?: {
    EmployeeID: string;
    EmploymentDetail?: {
      Designation?: string | null;
    } | null;
  } | null;
  totalHoursPerWeek?: number;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  gradeLevel?: string | null;
}

interface ClassSection {
  id: number;
  name: string;
  gradeLevel?: string | null;
}

interface SubjectFacultyPair {
  subjectId: number;
  facultyId: number;
}

interface SubjectScheduleData {
  subjectId: number;
  facultyId: number;
  days: string[];
  time: string;
  duration: number;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleForm({
  schedule,
  onSubmit,
  onCancel,
  loading = false,
}: ScheduleFormProps) {
  // For editing existing schedule, use original format
  const isEditMode = !!schedule;

  // Section field
  const [classSectionId, setClassSectionId] = useState<number>(schedule?.classSectionId || 0);
  
  // For edit mode: single schedule fields
  const [day, setDay] = useState<string>(schedule?.day || '');
  const [time, setTime] = useState<string>(schedule?.time || '');
  const [duration, setDuration] = useState<number>(schedule?.duration || 1);

  // For new mode: per-subject schedule data
  const [subjectSchedules, setSubjectSchedules] = useState<Map<number, SubjectScheduleData>>(new Map());

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load faculties, subjects, and class sections
  useEffect(() => {
    loadFormData();
  }, []);

  // Initialize edit mode with schedule data
  useEffect(() => {
    if (schedule && isEditMode) {
      // Edit mode uses single schedule, no need to initialize subjectSchedules
    }
  }, [schedule]);

  // Clear subject schedules when section changes (if grade levels don't match)
  useEffect(() => {
    if (!isEditMode && classSectionId && classSections.length > 0 && subjects.length > 0) {
      const selectedSection = classSections.find(s => s.id === classSectionId);
      if (selectedSection?.gradeLevel) {
        // Remove any subject schedules where the subject's grade level doesn't match
        setSubjectSchedules((prevSchedules) => {
          const newSchedules = new Map<number, SubjectScheduleData>();
          prevSchedules.forEach((scheduleData, subjectId) => {
            const subject = subjects.find(s => s.id === subjectId);
            if (subject?.gradeLevel === selectedSection.gradeLevel) {
              newSchedules.set(subjectId, scheduleData);
            }
          });
          return newSchedules;
        });
      } else if (!selectedSection?.gradeLevel) {
        // If section has no grade level, clear all schedules
        setSubjectSchedules(new Map());
      }
    }
  }, [classSectionId, classSections, subjects, isEditMode]);

  // Filter subjects based on selected section's grade level
  const filteredSubjects = useMemo(() => {
    // In edit mode, show all subjects
    if (isEditMode) {
      return subjects;
    }
    
    // If no section is selected, return empty array (user must select section first)
    if (!classSectionId) {
      return [];
    }
    
    const selectedSection = classSections.find(s => s.id === classSectionId);
    
    // If section has no grade level, show all subjects
    if (!selectedSection?.gradeLevel) {
      return subjects;
    }

    // Filter subjects by matching grade level
    return subjects.filter(subject => subject.gradeLevel === selectedSection.gradeLevel);
  }, [subjects, classSectionId, classSections, isEditMode]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [facultiesRes, subjectsRes, sectionsRes, schedulesRes] = await Promise.all([
        fetch('/api/faculty'),
        fetch('/api/subjects'),
        fetch('/api/class-sections'),
        fetch('/api/schedules'),
      ]);

      if (facultiesRes.ok) {
        const facultiesData = await facultiesRes.json();
        
        // Calculate workload if schedules are available
        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          const workloadMap = new Map<number, number>();
          
          // Calculate total hours per week for each faculty
          schedulesData.forEach((schedule: any) => {
            const currentLoad = workloadMap.get(schedule.facultyId) || 0;
            workloadMap.set(schedule.facultyId, currentLoad + (schedule.duration || 0));
          });
          
          // Add workload to each faculty
          const facultiesWithLoad = facultiesData.map((faculty: Faculty) => ({
            ...faculty,
            totalHoursPerWeek: workloadMap.get(faculty.FacultyID) || 0,
          }));
          
          setFaculties(facultiesWithLoad);
        } else {
          setFaculties(facultiesData);
        }
      }

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData);
      }

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setClassSections(sectionsData);
      }
    } catch (err) {
      console.error('Error loading form data:', err);
      setError('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  // Calculate duration from time range (e.g., "08:00-09:00" = 1 hour)
  const calculateDuration = (timeRange: string): number => {
    try {
      const match = timeRange.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!match) return 0;

      const [, startHour, startMin, endHour, endMin] = match.map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const durationMinutes = endMinutes - startMinutes;

      // Check if duration is 0 or negative
      if (durationMinutes <= 0) {
        return 0;
      }

      // Convert to hours (rounded to nearest 0.5)
      const hours = Math.round(durationMinutes / 30) * 0.5;
      
      // Cap at 5 hours maximum
      return Math.min(hours, 5);
    } catch {
      return 0;
    }
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
    const calculatedDuration = calculateDuration(value);
    if (calculatedDuration > 0) {
      setDuration(calculatedDuration);
    }
  };

  const handleSubjectFacultyChange = (subjectId: number, facultyId: number) => {
    const newSchedules = new Map(subjectSchedules);
    if (facultyId === 0) {
      newSchedules.delete(subjectId);
    } else {
      // Initialize or update subject schedule
      const existing = newSchedules.get(subjectId);
      newSchedules.set(subjectId, {
        subjectId,
        facultyId,
        days: existing?.days || [],
        time: existing?.time || '',
        duration: existing?.duration || 1,
      });
    }
    setSubjectSchedules(newSchedules);
  };

  const handleSubjectDaysChange = (subjectId: number, days: string[]) => {
    const newSchedules = new Map(subjectSchedules);
    const existing = newSchedules.get(subjectId);
    if (existing) {
      newSchedules.set(subjectId, { ...existing, days });
    }
    setSubjectSchedules(newSchedules);
  };

  const handleSubjectTimeChange = (subjectId: number, time: string) => {
    const newSchedules = new Map(subjectSchedules);
    const existing = newSchedules.get(subjectId);
    if (existing) {
      const calculatedDuration = calculateDuration(time);
      newSchedules.set(subjectId, { 
        ...existing, 
        time,
        duration: calculatedDuration > 0 ? calculatedDuration : existing.duration
      });
    }
    setSubjectSchedules(newSchedules);
  };

  const handleSubjectDurationChange = (subjectId: number, duration: number) => {
    const newSchedules = new Map(subjectSchedules);
    const existing = newSchedules.get(subjectId);
    if (existing) {
      newSchedules.set(subjectId, { ...existing, duration });
    }
    setSubjectSchedules(newSchedules);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!classSectionId) {
      setError('Please select a section');
      return;
    }

    // In edit mode, validate single schedule
    if (isEditMode) {
      if (!day || !time) {
        setError('Please select day and time');
        return;
      }
      if (duration <= 0) {
        setError('Duration must be greater than 0. Check your time range (start time cannot equal end time)');
        return;
      }
      if (duration > 5) {
        setError('Duration cannot exceed 5 hours per subject per day');
        return;
      }
    }

    // In edit mode, submit single schedule
    if (isEditMode && schedule) {
      const formData: ScheduleFormData = {
        facultyId: schedule.facultyId,
        subjectId: schedule.subjectId,
        classSectionId,
        day,
        time,
        duration,
      };
      const success = await onSubmit(formData);
      if (success && onCancel) {
        onCancel();
      }
      return;
    }

    // In new mode, validate at least one subject schedule with complete data
    if (subjectSchedules.size === 0) {
      setError('Please assign at least one faculty to a subject');
      return;
    }

    // Validate each subject schedule
    for (const [subjectId, scheduleData] of subjectSchedules.entries()) {
      if (scheduleData.days.length === 0) {
        const subject = subjects.find(s => s.id === subjectId);
        setError(`${subject?.name || 'Subject'} is missing day selection`);
        return;
      }
      if (!scheduleData.time) {
        const subject = subjects.find(s => s.id === subjectId);
        setError(`${subject?.name || 'Subject'} is missing time`);
        return;
      }
      if (scheduleData.duration <= 0) {
        const subject = subjects.find(s => s.id === subjectId);
        setError(`${subject?.name || 'Subject'} duration must be greater than 0`);
        return;
      }
      if (scheduleData.duration > 5) {
        const subject = subjects.find(s => s.id === subjectId);
        setError(`${subject?.name || 'Subject'} duration cannot exceed 5 hours per day`);
        return;
      }
    }

    // Create schedule data for each day × subject combination
    const schedulesToCreate: ScheduleFormData[] = [];
    subjectSchedules.forEach((scheduleData) => {
      scheduleData.days.forEach(day => {
        schedulesToCreate.push({
          facultyId: scheduleData.facultyId,
          subjectId: scheduleData.subjectId,
          classSectionId,
          day,
          time: scheduleData.time,
          duration: scheduleData.duration,
        });
      });
    });

    // For now, we'll submit them one by one
    // The parent component should handle multiple submissions
    const success = await onSubmit(schedulesToCreate);
    if (success && onCancel) {
      onCancel();
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Section Selection */}
      <div>
        <label htmlFor="classSectionId" className="block text-sm font-medium text-gray-700">
          Section <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <select
            id="classSectionId"
            value={classSectionId}
            onChange={(e) => setClassSectionId(parseInt(e.target.value) || 0)}
            required
            disabled={isEditMode}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
          >
            <option value="">Select Section</option>
            {classSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Edit Mode: Day, Time, Duration (Single schedule) */}
      {isEditMode && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Day Selection */}
          <div>
            <label htmlFor="day" className="block text-sm font-medium text-gray-700">
              Day <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <select
                id="day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
              >
                <option value="">Select Day</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Time Input */}
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Time <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              placeholder="e.g., 08:00-09:00"
              required
              className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm px-3 py-2"
            />
            <p className="mt-1 text-xs text-blue-600">
              Time format: HH:MM-HH:MM
            </p>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
              Duration (hours) <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-blue-600"> Auto-calculated</span>
            </label>
            <input
              type="number"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
              min="0.5"
              max="5"
              step="0.5"
              required
              className="mt-1 block w-full border border-gray-300 bg-gray-50 text-gray-900 rounded-md shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Max 5 hours per subject per day.
            </p>
          </div>
        </div>
      )}

      {/* Subjects List with Faculty, Days, Time, and Duration Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {isEditMode ? 'Subject and Faculty' : 'Assign Faculty and Schedule to Subjects'} <span className="text-red-500">*</span>
        </label>
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {filteredSubjects.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {classSectionId 
                ? 'No subjects available for the selected section\'s grade level'
                : 'Please select a section first'}
            </div>
          ) : (
            filteredSubjects.map((subject) => {
              const selectedFacultyId = isEditMode 
                ? (schedule?.facultyId || 0)
                : (subjectSchedules.get(subject.id)?.facultyId || 0);
              const subjectSchedule = subjectSchedules.get(subject.id);
              const isSubjectSelected = selectedFacultyId > 0;

              return (
                <div key={subject.id} className={`p-4 ${isSubjectSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="space-y-4">
                    {/* Subject Name and Faculty Selection */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">
                          {subject.name}
                          {subject.code && (
                            <span className="ml-2 text-xs text-gray-500">({subject.code})</span>
                          )}
                        </h4>
                      </div>
                      <div className="flex-shrink-0 w-64">
                        <div className="relative">
                          <select
                            value={selectedFacultyId}
                            onChange={(e) => handleSubjectFacultyChange(subject.id, parseInt(e.target.value) || 0)}
                            className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] rounded-md appearance-none"
                          >
                            <option value="">Select Faculty</option>
                            {faculties.map((faculty) => {
                              const position = faculty.Position;
                              const positionText = position ? ` (${position})` : '';
                              const designation = faculty.Employee?.EmploymentDetail?.Designation;
                              const designationText = designation ? ` - ${designation.replace(/_/g, ' ')}` : '';
                              const loadText = faculty.totalHoursPerWeek !== undefined 
                                ? ` (${faculty.totalHoursPerWeek}h/week)` 
                                : '';
                              return (
                                <option key={faculty.FacultyID} value={faculty.FacultyID}>
                                  {faculty.User.FirstName} {faculty.User.LastName}{positionText}{designationText}{loadText}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Days, Time, Duration (only show if faculty is selected and not in edit mode) */}
                    {!isEditMode && isSubjectSelected && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-gray-200">
                        {/* Days Selection */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Days <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-2 border border-gray-300 rounded-md p-2 bg-white">
                            <div className="grid grid-cols-2 gap-1">
                              {DAYS_OF_WEEK.map((d) => (
                                <label
                                  key={d}
                                  className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 p-1 rounded text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={subjectSchedule?.days.includes(d) || false}
                                    onChange={(e) => {
                                      const currentDays = subjectSchedule?.days || [];
                                      const newDays = e.target.checked
                                        ? [...currentDays, d]
                                        : currentDays.filter(day => day !== d);
                                      handleSubjectDaysChange(subject.id, newDays);
                                    }}
                                    className="h-3 w-3 text-[#800000] focus:ring-[#800000] border-gray-300 rounded"
                                  />
                                  <span className="text-xs text-gray-900">{d.substring(0, 3)}</span>
                                </label>
                              ))}
                            </div>
                            {subjectSchedule?.days && subjectSchedule.days.length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {subjectSchedule.days.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Time Input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={subjectSchedule?.time || ''}
                            onChange={(e) => handleSubjectTimeChange(subject.id, e.target.value)}
                            placeholder="08:00-09:00"
                            className="block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:ring-[#800000] focus:border-[#800000] text-sm px-2 py-1.5"
                          />
                          <p className="mt-1 text-xs text-blue-600">
                            HH:MM-HH:MM
                          </p>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Duration (hrs) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={subjectSchedule?.duration || 1}
                            onChange={(e) => handleSubjectDurationChange(subject.id, parseFloat(e.target.value) || 0)}
                            min="0.5"
                            max="5"
                            step="0.5"
                            className="block w-full border border-gray-300 bg-gray-50 text-gray-900 rounded-md shadow-sm focus:ring-[#800000] focus:border-[#800000] text-sm px-2 py-1.5"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Max 5 hours/day
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {!isEditMode && (
          <p className="mt-2 text-xs text-gray-500">
            Select a faculty for each subject, then set the days, time, and duration for that subject. Only subjects with complete information will be scheduled.
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#800000] hover:bg-[#600018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {isEditMode ? 'Updating...' : 'Creating...'}
            </span>
          ) : isEditMode ? (
            'Update Schedule'
          ) : (
            'Create Schedules'
          )}
        </button>
      </div>
    </form>
  );
}
