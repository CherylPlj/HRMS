'use client';

import React, { useState, useEffect } from 'react';
import SectionAssignmentForm from '@/components/section/SectionAssignmentForm';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
  } | null;
}

interface ClassSection {
  id: number;
  name: string;
  gradeLevel?: string | null;
  section?: string | null;
  schoolYear?: string | null;
  semester?: string | null;
  adviserFacultyId?: number | null;
  homeroomTeacherId?: number | null;
  sectionHeadId?: number | null;
  adviserFaculty?: Faculty | null;
  homeroomTeacher?: Faculty | null;
  sectionHead?: Faculty | null;
}

export default function SectionAssignmentsTab() {
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState<ClassSection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/class-sections?includeAssignments=true');
      if (!response.ok) {
        throw new Error('Failed to fetch sections');
      }
      const data = await response.json();
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to load section assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingSection(null);
    setShowModal(true);
  };

  const handleEdit = (section: ClassSection) => {
    setEditingSection(section);
    setShowModal(true);
  };

  const handleSubmit = async (data: {
    sectionId: number;
    adviserFacultyId: number | null;
    homeroomTeacherId: number | null;
    sectionHeadId: number | null;
  }) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/class-sections/${data.sectionId}/assignments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adviserFacultyId: data.adviserFacultyId,
          homeroomTeacherId: data.homeroomTeacherId,
          sectionHeadId: data.sectionHeadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update assignments');
      }

      setToast({ message: 'Section assignments updated successfully!', type: 'success' });
      await fetchSections();
      setShowModal(false);
      setEditingSection(null);
      return true;
    } catch (err: any) {
      console.error('Error updating assignments:', err);
      setError(err.message || 'Failed to update assignments');
      setToast({ message: err.message || 'Failed to update assignments', type: 'error' });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSection(null);
    setError(null);
  };

  // Filter sections
  const filteredSections = sections.filter((section) => {
    const matchesSearch = 
      section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.adviserFaculty?.User?.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.adviserFaculty?.User?.LastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.homeroomTeacher?.User?.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.homeroomTeacher?.User?.LastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.sectionHead?.User?.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.sectionHead?.User?.LastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGradeLevel = filterGradeLevel === 'all' || section.gradeLevel === filterGradeLevel;

    return matchesSearch && matchesGradeLevel;
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGradeLevel]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSections = filteredSections.slice(startIndex, endIndex);

  // Get unique grade levels for filter
  const gradeLevels = Array.from(new Set(sections.map(s => s.gradeLevel).filter(Boolean))).sort();

  // Calculate stats
  const totalSections = sections.length;
  const sectionsWithAdviser = sections.filter(s => s.adviserFacultyId).length;
  const sectionsWithHomeroom = sections.filter(s => s.homeroomTeacherId).length;
  const sectionsWithHead = sections.filter(s => s.sectionHeadId).length;

  const formatTeacherName = (faculty: Faculty | null | undefined) => {
    if (!faculty) return 'Not Assigned';
    return `${faculty.User.FirstName} ${faculty.User.LastName}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-red-50 rounded-lg">
                <svg className="h-6 w-6 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sections</dt>
                  <dd className="text-2xl font-bold text-gray-900">{totalSections}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">With Adviser</dt>
                  <dd className="text-2xl font-bold text-gray-900">{sectionsWithAdviser}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-indigo-50 rounded-lg">
                <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">With Homeroom</dt>
                  <dd className="text-2xl font-bold text-gray-900">{sectionsWithHomeroom}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-purple-50 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">With Section Head</dt>
                  <dd className="text-2xl font-bold text-gray-900">{sectionsWithHead}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] sm:text-sm"
                placeholder="Search by section name or teacher..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="filterGradeLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Grade Level
            </label>
            <div className="relative">
              <select
                id="filterGradeLevel"
                value={filterGradeLevel}
                onChange={(e) => setFilterGradeLevel(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md appearance-none"
              >
                <option value="all">All Grade Levels</option>
                {gradeLevels.map((level) => (
                  <option key={level} value={level || ''}>
                    {level}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-gray-900">Section Assignments</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {filteredSections.length}
            </span>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Assign Teachers
          </button>
        </div>

        {filteredSections.length === 0 ? (
          <div className="bg-white p-12 text-center">
            <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No sections found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {sections.length === 0
                ? 'No sections available. Create sections first.'
                : 'No sections match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adviser
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Homeroom Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section Head
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSections.map((section) => (
                  <tr key={section.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{section.name}</div>
                      {section.schoolYear && (
                        <div className="text-sm text-gray-500">{section.schoolYear}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{section.gradeLevel || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatTeacherName(section.adviserFaculty)}</div>
                      {section.adviserFaculty && (
                        <div className="text-sm text-gray-500">{section.adviserFaculty.User.Email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatTeacherName(section.homeroomTeacher)}</div>
                      {section.homeroomTeacher && (
                        <div className="text-sm text-gray-500">{section.homeroomTeacher.User.Email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatTeacherName(section.sectionHead)}</div>
                      {section.sectionHead && (
                        <div className="text-sm text-gray-500">{section.sectionHead.User.Email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(section)}
                        className="text-[#800000] hover:text-[#600018]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination - Always Visible */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-gray-500">
              Showing {filteredSections.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredSections.length)} of {filteredSections.length} entries
            </span>
          </div>

          {totalPages > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded border ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {(() => {
                const pages: (number | string)[] = [];
                const maxVisiblePages = 5;

                if (totalPages <= maxVisiblePages) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  if (currentPage <= 3) {
                    for (let i = 1; i <= 4; i++) {
                      pages.push(i);
                    }
                    pages.push('ellipsis');
                    pages.push(totalPages);
                  } else if (currentPage >= totalPages - 2) {
                    pages.push(1);
                    pages.push('ellipsis');
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);
                    pages.push('ellipsis');
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                      pages.push(i);
                    }
                    pages.push('ellipsis');
                    pages.push(totalPages);
                  }
                }

                return pages.map((page, index) => {
                  if (page === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }

                  const pageNumber = page as number;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-3 py-1 rounded border ${
                        currentPage === pageNumber
                          ? 'bg-[#800000] text-white border-[#800000]'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                });
              })()}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded border ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSection ? 'Edit Section Assignments' : 'Assign Teachers to Section'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SectionAssignmentForm
                section={editingSection}
                onSubmit={handleSubmit}
                onCancel={handleCloseModal}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
