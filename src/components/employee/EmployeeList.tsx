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
    <div className="container mx-auto px-4 py-8">
      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-3">
          <button
            onClick={onAddEmployee}
            className="bg-[#800000] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <Plus size={16} /> Add Employee
          </button>
          <button
            onClick={onImportEmployees}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <Upload size={16} /> Import Employees
          </button>
          <button
            onClick={onExportEmployees}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Download size={16} /> Export Employees
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleView}
            disabled={isLoadingAll}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : viewMode === 'paginated' ? (
              <>
                <Eye size={16} /> Show All ({pagination.totalCount})
              </>
            ) : (
              <>
                <Eye size={16} /> Show Paginated
              </>
            )}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onQuickExport('csv')}
              disabled={isExporting}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
              className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
            <span className="text-sm text-gray-600">
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

