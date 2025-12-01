'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { EmployeeDisciplinaryHistory, DisciplinaryRecord } from '@/types/disciplinary';
import HistoryTable from './HistoryTable';
import CaseViewModal from './CaseViewModal';
import Pagination from './Pagination';
import { toast } from 'react-hot-toast';

interface DisciplinaryHistoryContentProps {
  employees?: { id: string; name: string }[];
  supervisors?: { id: string; name: string }[];
  categories?: string[];
  violationTypes?: { id: string; name: string; category: string; defaultSeverity: "Minor" | "Moderate" | "Major" }[];
}

const DisciplinaryHistoryContent: React.FC<DisciplinaryHistoryContentProps> = ({
  employees = [],
  supervisors = [],
  categories = [],
  violationTypes = [],
}) => {
  const [histories, setHistories] = useState<EmployeeDisciplinaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<DisciplinaryRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch employees with disciplinary records
  useEffect(() => {
    const fetchHistories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/disciplinary/history');
        if (!response.ok) throw new Error('Failed to fetch disciplinary histories');
        
        const data = await response.json();
        setHistories(data);
      } catch (err) {
        console.error('Error fetching disciplinary histories:', err);
        toast.error('Failed to load disciplinary histories');
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, []);

  // Filter histories
  const filteredHistories = useMemo(() => {
    let filtered = [...histories];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (history) =>
          history.employeeName.toLowerCase().includes(query) ||
          history.employeeId.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((history) => {
        if (statusFilter === 'ongoing') return history.ongoingCount > 0;
        if (statusFilter === 'pending') return history.pendingCount > 0;
        if (statusFilter === 'resolved') return history.resolvedCount > 0;
        return true;
      });
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter((history) => {
        const lastUpdated = new Date(history.lastUpdated).toISOString().split('T')[0];
        return lastUpdated === dateFilter;
      });
    }

    return filtered;
  }, [histories, searchQuery, statusFilter, dateFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredHistories.length / itemsPerPage);
  const paginatedHistories = filteredHistories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewCase = (record: DisciplinaryRecord) => {
    setViewingRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setViewingRecord(null);
  };

  const handleSubmitRecord = async () => {
    // Handle record update if needed
    handleCloseModal();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setDateFilter('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' || dateFilter;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Employee Disciplinary Records History
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage disciplinary records by employee
          </p>
        </div> */}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="ongoing">Has Ongoing Cases</option>
              <option value="pending">Has Pending Cases</option>
              <option value="resolved">Has Resolved Cases</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {/* Add department options here */}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {filteredHistories.length} employee(s) found
            </span>
            <button
              onClick={resetFilters}
              className="text-sm text-[#800000] hover:text-[#600000] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <HistoryTable 
        histories={paginatedHistories} 
        onViewCase={handleViewCase}
        startIndex={(currentPage - 1) * itemsPerPage}
      />

      {/* Pagination */}
      {filteredHistories.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredHistories.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={(newItemsPerPage) => {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1);
          }}
        />
      )}

      {/* View Case Modal */}
      {viewingRecord && (
        <CaseViewModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitRecord}
          record={viewingRecord}
          employees={employees}
          supervisors={supervisors}
          categories={categories}
          violationTypes={violationTypes}
        />
      )}
    </div>
  );
};

export default DisciplinaryHistoryContent;

