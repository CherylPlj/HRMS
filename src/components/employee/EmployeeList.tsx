'use client';

import React from 'react';
import { Plus, Upload, Download, Eye, FileSpreadsheet, FileText } from 'lucide-react';
import { Employee, Department, Pagination as PaginationType } from './types';
import EmployeeFilters from './EmployeeFilters';
import EmployeeTable from './EmployeeTable';
import Pagination from './Pagination';
import { filterEmployees } from './utils';

interface EmployeeListProps {
  employees: Employee[];
  allEmployees: Employee[];
  departments: Department[];
  pagination: PaginationType;
  viewMode: 'paginated' | 'all';
  isLoading: boolean;
  isLoadingAll: boolean;
  isExporting: boolean;
  searchTerm: string;
  departmentFilter: string;
  designationFilter: string;
  statusFilter: string;
  nameOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onDesignationFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onNameOrderChange: (value: 'asc' | 'desc') => void;
  onEmployeeSelect: (employee: Employee) => void;
  onEmployeeEdit: (employee: Employee) => void;
  onPhotoClick: (e: React.MouseEvent, photoUrl: string, alt: string) => void;
  onPageChange: (page: number) => void;
  onToggleView: () => void;
  onAddEmployee: () => void;
  onImportEmployees: () => void;
  onExportEmployees: () => void;
  onQuickExport: (format: 'csv' | 'pdf') => void;
  showDataRetention?: boolean;
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  allEmployees,
  departments,
  pagination,
  viewMode,
  isLoading,
  isLoadingAll,
  isExporting,
  searchTerm,
  departmentFilter,
  designationFilter,
  statusFilter,
  nameOrder,
  onSearchChange,
  onDepartmentFilterChange,
  onDesignationFilterChange,
  onStatusFilterChange,
  onNameOrderChange,
  onEmployeeSelect,
  onEmployeeEdit,
  onPhotoClick,
  onPageChange,
  onToggleView,
  onAddEmployee,
  onImportEmployees,
  onExportEmployees,
  onQuickExport,
  showDataRetention = false,
}) => {
  const currentEmployees = viewMode === 'all' ? allEmployees : employees;
  const filteredEmployees = filterEmployees(
    currentEmployees,
    searchTerm,
    departmentFilter,
    designationFilter,
    statusFilter,
    nameOrder
  );

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={onAddEmployee}
            className="bg-[#800000] text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
          >
            <Plus size={16} /> <span className="whitespace-nowrap">Add Employee</span>
          </button>
          <button
            onClick={onImportEmployees}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
          >
            <Upload size={16} /> <span className="whitespace-nowrap">Import</span>
          </button>
          <button
            onClick={onExportEmployees}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm sm:text-base flex-1 sm:flex-none justify-center"
          >
            <Download size={16} /> <span className="whitespace-nowrap">Export</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleView}
            disabled={isLoadingAll}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-1 sm:flex-none justify-center"
          >
            {isLoadingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : viewMode === 'paginated' ? (
              <>
                <Eye size={16} /> <span className="whitespace-nowrap">Show All ({pagination.totalCount})</span>
              </>
            ) : (
              <>
                <Eye size={16} /> <span className="whitespace-nowrap">Show Paginated</span>
              </>
            )}
          </button>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <button
              onClick={() => onQuickExport('csv')}
              disabled={isExporting}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex-1 justify-center"
              title="Export current view as CSV"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              CSV
            </button>
            <button
              onClick={() => onQuickExport('pdf')}
              disabled={isExporting}
              className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex-1 justify-center"
              title="Export current view as PDF"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <FileText className="w-4 h-4" />
              )}
              PDF
            </button>
          </div>
          {viewMode === 'all' && (
            <span className="text-xs sm:text-sm text-gray-600 w-full sm:w-auto text-center sm:text-left">
              Showing all {allEmployees.length} employees
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <EmployeeFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={onDepartmentFilterChange}
        designationFilter={designationFilter}
        onDesignationFilterChange={onDesignationFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        nameOrder={nameOrder}
        onNameOrderChange={onNameOrderChange}
        departments={departments}
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
            <span className="ml-2 text-gray-600">Loading employees...</span>
          </div>
        ) : (
          <>
            <EmployeeTable
              employees={filteredEmployees}
              departments={departments}
              onEmployeeSelect={onEmployeeSelect}
              onEmployeeEdit={onEmployeeEdit}
              onPhotoClick={onPhotoClick}
              showDataRetention={showDataRetention}
            />
            {viewMode === 'paginated' && (
              <Pagination pagination={pagination} onPageChange={onPageChange} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeList;

