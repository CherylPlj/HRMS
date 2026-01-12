'use client';

import React, { useState, useEffect } from 'react';
import { Schedule, ScheduleFormData } from '@/contexts/ScheduleContext';

interface ScheduleFormProps {
  schedule?: Schedule | null;
  onSubmit: (data: ScheduleFormData) => Promise<boolean>;
  onCancel?: () => void;
  loading?: boolean;
}

interface Faculty {
  FacultyID: number;
  EmployeeID: string;
  User: {
    FirstName: string;
    LastName: string;
  };
}

interface Subject {
  id: number;
  name: string;
  code?: string;
}

interface ClassSection {
  id: number;
  name: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleForm({
  schedule,
  onSubmit,
  onCancel,
  loading = false,
}: ScheduleFormProps) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    facultyId: schedule?.facultyId || 0,
    subjectId: schedule?.subjectId || 0,
    classSectionId: schedule?.classSectionId || 0,
    day: schedule?.day || '',
    time: schedule?.time || '',
    duration: schedule?.duration || 1,
  });

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load faculties, subjects, and class sections
  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [facultiesRes, subjectsRes, sectionsRes] = await Promise.all([
        fetch('/api/faculty'),
        fetch('/api/subjects'),
        fetch('/api/class-sections'),
      ]);

      if (facultiesRes.ok) {
        const facultiesData = await facultiesRes.json();
        setFaculties(facultiesData);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-calculate duration when time changes
    if (name === 'time') {
      const calculatedDuration = calculateDuration(value);
      setFormData((prev) => ({
        ...prev,
        time: value,
        duration: calculatedDuration || prev.duration, // Keep existing if calculation fails
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'duration' ? parseInt(value) || 0 : 
                ['facultyId', 'subjectId', 'classSectionId'].includes(name) ? parseInt(value) || 0 : 
                value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.facultyId || !formData.subjectId || !formData.classSectionId) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.day || !formData.time) {
      setError('Please select day and time');
      return;
    }

    // Validate duration
    if (formData.duration <= 0) {
      setError('Duration must be greater than 0. Check your time range (start time cannot equal end time)');
      return;
    }

    if (formData.duration > 5) {
      setError('Duration cannot exceed 5 hours per subject per day');
      return;
    }

    const success = await onSubmit(formData);
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

      {/* Faculty Selection */}
      <div>
        <label htmlFor="facultyId" className="block text-sm font-medium text-gray-700">
          Faculty <span className="text-red-500">*</span>
        </label>
        <select
          id="facultyId"
          name="facultyId"
          value={formData.facultyId}
          onChange={handleChange}
          required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
        >
          <option value="">Select Faculty</option>
          {faculties.map((faculty) => (
            <option key={faculty.FacultyID} value={faculty.FacultyID}>
              {faculty.User.FirstName} {faculty.User.LastName} ({faculty.EmployeeID})
            </option>
          ))}
        </select>
      </div>

      {/* Subject Selection */}
      <div>
        <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          id="subjectId"
          name="subjectId"
          value={formData.subjectId}
          onChange={handleChange}
          required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
        >
          <option value="">Select Subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {/* Class Section Selection */}
      <div>
        <label htmlFor="classSectionId" className="block text-sm font-medium text-gray-700">
          Class Section <span className="text-red-500">*</span>
        </label>
        <select
          id="classSectionId"
          name="classSectionId"
          value={formData.classSectionId}
          onChange={handleChange}
          required
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
        >
          <option value="">Select Class Section</option>
          {classSections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Day Selection */}
        <div>
          <label htmlFor="day" className="block text-sm font-medium text-gray-700">
            Day <span className="text-red-500">*</span>
          </label>
          <select
            id="day"
            name="day"
            value={formData.day}
            onChange={handleChange}
            required
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
          >
            <option value="">Select Day</option>
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        {/* Time Input */}
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            placeholder="e.g., 08:00-09:00"
            required
            className="mt-1 block w-full border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm"
          />
          <p className="mt-1 text-xs text-blue-600">
            <i className="fas fa-magic mr-1"></i>
            Duration will be auto-calculated • Format: HH:MM-HH:MM (e.g., 08:00-09:00)
          </p>
        </div>
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
          Duration (hours) <span className="text-red-500">*</span>
          <span className="ml-2 text-xs font-normal text-blue-600">✨ Auto-calculated</span>
        </label>
        <input
          type="number"
          id="duration"
          name="duration"
          value={formData.duration}
          onChange={handleChange}
          min="0.5"
          max="5"
          step="0.5"
          required
            className="mt-1 block w-full border border-gray-300 bg-gray-50 text-gray-900 rounded-md shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Automatically calculated from time range. Maximum 5 hours per subject per day.
        </p>
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
              Saving...
            </span>
          ) : schedule ? (
            'Update Schedule'
          ) : (
            'Create Schedule'
          )}
        </button>
      </div>
    </form>
  );
}
