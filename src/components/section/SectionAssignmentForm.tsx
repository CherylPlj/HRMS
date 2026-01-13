'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Faculty {
  FacultyID: number;
  EmployeeID: string;
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
}

interface ClassSection {
  id: number;
  name: string;
  gradeLevel?: string | null;
  adviserFacultyId?: number | null;
  homeroomTeacherId?: number | null;
  sectionHeadId?: number | null;
  adviserFaculty?: Faculty | null;
  homeroomTeacher?: Faculty | null;
  sectionHead?: Faculty | null;
}

interface SectionAssignmentFormProps {
  section?: ClassSection | null;
  onSubmit: (data: {
    sectionId: number;
    adviserFacultyId: number | null;
    homeroomTeacherId: number | null;
    sectionHeadId: number | null;
  }) => Promise<boolean>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function SectionAssignmentForm({
  section,
  onSubmit,
  onCancel,
  loading = false,
}: SectionAssignmentFormProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<number | ''>(section?.id || '');
  const [adviserFacultyId, setAdviserFacultyId] = useState<number | null>(section?.adviserFacultyId || null);
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<number | null>(section?.homeroomTeacherId || null);
  const [sectionHeadId, setSectionHeadId] = useState<number | null>(section?.sectionHeadId || null);

  const [sections, setSections] = useState<ClassSection[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!section;

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (section) {
      setSelectedSectionId(section.id);
      setAdviserFacultyId(section.adviserFacultyId || null);
      setHomeroomTeacherId(section.homeroomTeacherId || null);
      setSectionHeadId(section.sectionHeadId || null);
    }
  }, [section]);

  // Fetch assignments when a section is selected (for create mode)
  useEffect(() => {
    if (!isEditMode) {
      if (selectedSectionId && typeof selectedSectionId === 'number' && selectedSectionId > 0) {
        fetchSectionAssignments(selectedSectionId);
      } else {
        // Clear assignments if no section is selected
        setAdviserFacultyId(null);
        setHomeroomTeacherId(null);
        setSectionHeadId(null);
      }
    }
  }, [selectedSectionId, isEditMode]);

  const loadFormData = async () => {
    setLoadingData(true);
    try {
      const [sectionsRes, facultiesRes] = await Promise.all([
        fetch('/api/class-sections'),
        fetch('/api/faculty'),
      ]);

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setSections(sectionsData);
      }

      if (facultiesRes.ok) {
        const facultiesData = await facultiesRes.json();
        setFaculties(facultiesData);
      }
    } catch (err) {
      console.error('Error loading form data:', err);
      setError('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSectionAssignments = async (sectionId: number) => {
    try {
      const response = await fetch(`/api/class-sections/${sectionId}/assignments`);
      if (response.ok) {
        const data = await response.json();
        // Update the form fields with existing assignments
        setAdviserFacultyId(data.adviser?.facultyId || null);
        setHomeroomTeacherId(data.homeroomTeacher?.facultyId || null);
        setSectionHeadId(data.sectionHead?.facultyId || null);
      }
    } catch (err) {
      console.error('Error fetching section assignments:', err);
      // Don't show error to user, just log it
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSectionId) {
      setError('Please select a section');
      return;
    }

    const success = await onSubmit({
      sectionId: typeof selectedSectionId === 'number' ? selectedSectionId : 0,
      adviserFacultyId,
      homeroomTeacherId,
      sectionHeadId,
    });

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
        <label htmlFor="sectionId" className="block text-sm font-medium text-gray-700">
          Section <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <select
            id="sectionId"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value ? parseInt(e.target.value) : '')}
            required
            disabled={isEditMode}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
          >
            <option value="">Select Section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.gradeLevel ? `(${s.gradeLevel})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Adviser Assignment */}
      <div>
        <label htmlFor="adviserFacultyId" className="block text-sm font-medium text-gray-700 mb-1">
          Class Adviser
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Assign a teacher as the class adviser for forms, clearance, and student concerns routing
        </p>
        <div className="relative">
          <select
            id="adviserFacultyId"
            value={adviserFacultyId || ''}
            onChange={(e) => setAdviserFacultyId(e.target.value ? parseInt(e.target.value) : null)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
          >
            <option value="">No Adviser Assigned</option>
            {faculties.map((faculty) => {
              const designation = faculty.Employee?.EmploymentDetail?.Designation;
              const designationText = designation ? ` - ${designation.replace(/_/g, ' ')}` : '';
              return (
                <option key={faculty.FacultyID} value={faculty.FacultyID}>
                  {faculty.User.FirstName} {faculty.User.LastName}{designationText}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Homeroom Teacher Assignment */}
      <div>
        <label htmlFor="homeroomTeacherId" className="block text-sm font-medium text-gray-700 mb-1">
          Homeroom Teacher
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Assign a teacher as the homeroom teacher for daily class management
        </p>
        <div className="relative">
          <select
            id="homeroomTeacherId"
            value={homeroomTeacherId || ''}
            onChange={(e) => setHomeroomTeacherId(e.target.value ? parseInt(e.target.value) : null)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
          >
            <option value="">No Homeroom Teacher Assigned</option>
            {faculties.map((faculty) => {
              const designation = faculty.Employee?.EmploymentDetail?.Designation;
              const designationText = designation ? ` - ${designation.replace(/_/g, ' ')}` : '';
              return (
                <option key={faculty.FacultyID} value={faculty.FacultyID}>
                  {faculty.User.FirstName} {faculty.User.LastName}{designationText}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Section Head Assignment */}
      <div>
        <label htmlFor="sectionHeadId" className="block text-sm font-medium text-gray-700 mb-1">
          Section Head
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Assign a teacher as the section head for administrative oversight
        </p>
        <div className="relative">
          <select
            id="sectionHeadId"
            value={sectionHeadId || ''}
            onChange={(e) => setSectionHeadId(e.target.value ? parseInt(e.target.value) : null)}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
          >
            <option value="">No Section Head Assigned</option>
            {faculties.map((faculty) => {
              const designation = faculty.Employee?.EmploymentDetail?.Designation;
              const designationText = designation ? ` - ${designation.replace(/_/g, ' ')}` : '';
              return (
                <option key={faculty.FacultyID} value={faculty.FacultyID}>
                  {faculty.User.FirstName} {faculty.User.LastName}{designationText}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
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
              {isEditMode ? 'Updating...' : 'Assigning...'}
            </span>
          ) : isEditMode ? (
            'Update Assignments'
          ) : (
            'Assign Teachers'
          )}
        </button>
      </div>
    </form>
  );
}
