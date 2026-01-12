'use client';

import React, { useState } from 'react';
import { ScheduleProvider, useSchedule, Schedule } from '@/contexts/ScheduleContext';
import ScheduleTable from '@/components/schedule/ScheduleTable';
import ScheduleModal from '@/components/schedule/ScheduleModal';
import DeleteConfirmModal from '@/components/schedule/DeleteConfirmModal';
import ImportCSVModal from '@/components/schedule/ImportCSVModal';
import FacultyScheduleView from '@/components/schedule/FacultyScheduleView';
import Toast from '@/components/Toast';
import FacultySubjectLoadsTab from '@/components/schedule/FacultySubjectLoadsTab';
import SectionAssignmentsTab from '@/components/section/SectionAssignmentsTab';

function SchedulePageContent() {
  const {
    schedules,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    clearError,
  } = useSchedule();

  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [view, setView] = useState<'all' | 'faculty'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterFaculty, setFilterFaculty] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  React.useEffect(() => {
    fetchSchedules();
  }, []);

  const handleAddNew = () => {
    setEditingSchedule(null);
    setShowModal(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowModal(true);
  };

  const handleDeleteClick = (schedule: Schedule) => {
    setScheduleToDelete(schedule);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    setDeleting(true);
    const success = await deleteSchedule(scheduleToDelete.id);
    setDeleting(false);
    
    if (success) {
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      setToast({ message: 'Schedule deleted successfully!', type: 'success' });
      await fetchSchedules();
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setScheduleToDelete(null);
  };

  const handleImportCSV = async (schedules: any[]) => {
    try {
      const response = await fetch('/api/schedules/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedules),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      // Refresh schedules after import
      await fetchSchedules();
      
      return result;
    } catch (error) {
      console.error('Error importing schedules:', error);
      throw error;
    }
  };

  const handleSubmit = async (data: any) => {
    let success = false;
    let createdCount = 0;
    let failedCount = 0;

    if (editingSchedule) {
      // Edit mode - single schedule
      success = await updateSchedule(editingSchedule.id, data);
      if (success) {
        setToast({ message: 'Schedule updated successfully!', type: 'success' });
      }
    } else {
      // New mode - check if it's an array (multiple schedules) or single schedule
      if (Array.isArray(data)) {
        // Create multiple schedules
        for (const scheduleData of data) {
          const result = await createSchedule(scheduleData);
          if (result) {
            createdCount++;
          } else {
            failedCount++;
          }
        }
        if (createdCount > 0) {
          const message = failedCount > 0
            ? `${createdCount} schedule(s) created successfully. ${failedCount} failed.`
            : `${createdCount} schedule(s) created successfully!`;
          setToast({ message, type: failedCount > 0 ? 'error' : 'success' });
          success = failedCount === 0;
        } else {
          setToast({ message: 'Failed to create schedules. Please check for conflicts.', type: 'error' });
          success = false;
        }
      } else {
        // Single schedule creation (backward compatibility)
        success = await createSchedule(data);
        if (success) {
          setToast({ message: 'Schedule created successfully!', type: 'success' });
        }
      }
    }

    if (success || createdCount > 0) {
      setShowModal(false);
      setEditingSchedule(null);
      await fetchSchedules();
    }

    return success;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    clearError();
  };

  const handleViewFacultySchedule = (facultyId: number) => {
    setSelectedFacultyId(facultyId);
    setView('faculty');
  };

  const handleBackToAll = () => {
    setView('all');
    setSelectedFacultyId(null);
  };

  // Filter and search schedules
  const filteredSchedules = schedules.filter((schedule) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      schedule.faculty?.User?.FirstName?.toLowerCase().includes(searchLower) ||
      schedule.faculty?.User?.LastName?.toLowerCase().includes(searchLower) ||
      schedule.subject?.name?.toLowerCase().includes(searchLower) ||
      schedule.classSection?.name?.toLowerCase().includes(searchLower);

    // Day filter
    const matchesDay = filterDay === 'all' || schedule.day === filterDay;

    // Faculty filter
    const matchesFaculty = filterFaculty === 'all' || schedule.facultyId === filterFaculty;

    return matchesSearch && matchesDay && matchesFaculty;
  });

  // Get unique faculties for filter dropdown
  const uniqueFaculties = Array.from(
    new Map(
      schedules
        .filter(s => s.faculty?.User)
        .map(s => [
          s.facultyId,
          { id: s.facultyId, name: `${s.faculty!.User.FirstName} ${s.faculty!.User.LastName}` }
        ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterDay('all');
    setFilterFaculty('all');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSchedules = filteredSchedules.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDay, filterFaculty]);

  // Calculate stats
  const totalSchedules = schedules.length;
  const uniqueFacultyCount = new Set(schedules.map(s => s.facultyId)).size;
  const uniqueSubjectsCount = new Set(schedules.map(s => s.subjectId)).size;

  return (
    <div className="w-full">
      {/* Stats Cards Row */}
      {view === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Total Schedules */}
          <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-red-50 rounded-lg">
                  <svg
                    className="h-6 w-6 text-[#800000]"
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
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Schedules
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">{schedules.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Unique Faculty */}
          <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Unique Faculty
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {new Set(schedules.map((s) => s.facultyId)).size}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Unique Subjects */}
          <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-indigo-50 rounded-lg">
                  <svg
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Unique Subjects
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {new Set(schedules.map((s) => s.subjectId)).size}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      {view === 'all' && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Box */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#800000] focus:border-[#800000] sm:text-sm"
                  placeholder="Search by faculty, subject, or section..."
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Day Filter */}
            <div>
              <label htmlFor="filterDay" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Day
              </label>
              <select
                id="filterDay"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
              >
                <option value="all">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            {/* Faculty Filter */}
            <div>
              <label htmlFor="filterFaculty" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Faculty
              </label>
              <select
                id="filterFaculty"
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-[#800000] focus:border-[#800000] sm:text-sm rounded-md"
              >
                <option value="all">All Faculty</option>
                {uniqueFaculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Summary and Clear Button */}
          {(searchTerm || filterDay !== 'all' || filterFaculty !== 'all') && (
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                Showing {filteredSchedules.length} of {schedules.length} schedules
              </div>
              <button
                onClick={handleClearFilters}
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                <svg
                  className="h-4 w-4 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {view === 'faculty' && selectedFacultyId ? (
        <div>
          <button
            onClick={handleBackToAll}
            className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to All Schedules
          </button>
          <FacultyScheduleView facultyId={selectedFacultyId} />
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900">All Schedules</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {schedules.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                <svg className="h-4 w-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import CSV
              </button>
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Schedule
              </button>
            </div>
          </div>
          {filteredSchedules.length === 0 && schedules.length > 0 ? (
            <div className="bg-white p-12 text-center">
              <div className="mx-auto h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No schedules found</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
                No schedules match your current filters. Try adjusting your search or filters.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#800000] hover:bg-[#600018] transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          ) : (
            <>
              <ScheduleTable
                schedules={paginatedSchedules}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                loading={loading}
              />
              
              {/* Pagination */}
              {filteredSchedules.length > 0 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
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
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
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
                                  currentPage === page
                                    ? 'z-10 bg-[#800000] text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800000]'
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
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
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <ScheduleModal
        isOpen={showModal}
        onClose={handleCloseModal}
        schedule={editingSchedule}
        onSubmit={handleSubmit}
        loading={loading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete Schedule"
        message={
          scheduleToDelete
            ? `Are you sure you want to delete the schedule for ${scheduleToDelete.subject?.name || 'this subject'} (${scheduleToDelete.classSection?.name || ''}) on ${scheduleToDelete.day} at ${scheduleToDelete.time}? This action cannot be undone.`
            : 'Are you sure you want to delete this schedule?'
        }
      />

      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCSV}
      />

      {/* Success/Error Toast */}
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

function CombinedSchedulesAndLoadsPage() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'loads' | 'assignments'>('schedules');

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`${
              activeTab === 'schedules'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedules
            </div>
          </button>
          <button
            onClick={() => setActiveTab('loads')}
            className={`${
              activeTab === 'loads'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Subject Loads
            </div>
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`${
              activeTab === 'assignments'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Section Assignments
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'schedules' ? (
        <ScheduleProvider>
          <SchedulePageContent />
        </ScheduleProvider>
      ) : activeTab === 'loads' ? (
        <FacultySubjectLoadsTab />
      ) : (
        <SectionAssignmentsTab />
      )}
    </div>
  );
}

export default CombinedSchedulesAndLoadsPage;
