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
    sectionIds: number[];
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
  const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>(section?.id ? [section.id] : []);
  const [adviserFacultyId, setAdviserFacultyId] = useState<number | null>(section?.adviserFacultyId || null);

  const [sections, setSections] = useState<ClassSection[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!section;
  const MAX_SECTIONS = 4;

  useEffect(() => {
    loadFormData();
  }, []);

  useEffect(() => {
    if (section) {
      setSelectedSectionIds([section.id]);
      setAdviserFacultyId(section.adviserFacultyId || null);
    }
  }, [section]);

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

  const handleSectionToggle = (sectionId: number) => {
    setError(null);
    setSelectedSectionIds(prev => {
      if (prev.includes(sectionId)) {
        // Unselect section
        return prev.filter(id => id !== sectionId);
      } else {
        // Select section (max 4)
        if (prev.length >= MAX_SECTIONS) {
          setError(`Maximum ${MAX_SECTIONS} sections can be selected at once`);
          return prev;
        }
        return [...prev, sectionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSectionIds.length === sections.length) {
      // Deselect all
      setSelectedSectionIds([]);
    } else {
      // Select up to MAX_SECTIONS
      const availableIds = sections.slice(0, MAX_SECTIONS).map(s => s.id);
      setSelectedSectionIds(availableIds);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedSectionIds.length === 0) {
      setError('Please select at least one section');
      return;
    }

    if (!adviserFacultyId) {
      setError('Please select an adviser');
      return;
    }

    const success = await onSubmit({
      sectionIds: selectedSectionIds,
      adviserFacultyId,
      homeroomTeacherId: null, // Always send null for homeroom teacher
      sectionHeadId: null, // Always send null for section head
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

      {/* Section Selection - Multiple with checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Sections <span className="text-red-500">*</span>
          </label>
          {!isEditMode && sections.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs text-[#800000] hover:text-[#600018] font-medium px-2 py-1"
            >
              {selectedSectionIds.length === Math.min(sections.length, MAX_SECTIONS) ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">Select up to {MAX_SECTIONS} sections</p>
        {!isEditMode && (
          <div className="mt-2 max-h-64 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50 space-y-2">
            {sections.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No sections available</p>
            ) : (
              <div className="space-y-2">
                {sections.map((s) => {
                  const isSelected = selectedSectionIds.includes(s.id);
                  const isDisabled = !isSelected && selectedSectionIds.length >= MAX_SECTIONS;
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors border ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                          : isSelected
                          ? 'bg-[#800000]/10 hover:bg-[#800000]/20 border-[#800000]/30'
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSectionToggle(s.id)}
                        disabled={isDisabled || isEditMode}
                        className="h-4 w-4 text-[#800000] focus:ring-[#800000] border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 mt-0.5"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {s.name} {s.gradeLevel ? `(${s.gradeLevel})` : ''}
                        </div>
                        {s.adviserFaculty && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            Current: {s.adviserFaculty.User.FirstName} {s.adviserFaculty.User.LastName}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {isEditMode && (
          <div className="mt-2 p-3 border border-gray-300 rounded-md bg-gray-50">
            <p className="text-sm text-gray-900">{section?.name} {section?.gradeLevel ? `(${section.gradeLevel})` : ''}</p>
          </div>
        )}
        {selectedSectionIds.length > 0 && (
          <p className="mt-2 text-xs text-gray-600">
            {selectedSectionIds.length} section{selectedSectionIds.length !== 1 ? 's' : ''} selected
            {selectedSectionIds.length >= MAX_SECTIONS && (
              <span className="text-amber-600 ml-1">(Maximum reached)</span>
            )}
          </p>
        )}
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
            'Update Assignment'
          ) : (
            `Assign Adviser to ${selectedSectionIds.length > 0 ? `${selectedSectionIds.length} ` : ''}Section${selectedSectionIds.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </form>
  );
}
