'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Department } from './types';

interface EmployeeFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  designationFilter: string;
  onDesignationFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  nameOrder: 'asc' | 'desc';
  onNameOrderChange: (value: 'asc' | 'desc') => void;
  departments: Department[];
}

const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  searchTerm,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  designationFilter,
  onDesignationFilterChange,
  statusFilter,
  onStatusFilterChange,
  nameOrder,
  onNameOrderChange,
  departments,
}) => {
  return (
    <div className="mb-8 flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
          />
        </div>
      </div>
      <div className="relative">
        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
          className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id.toString()}>
              {dept.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={designationFilter}
          onChange={(e) => onDesignationFilterChange(e.target.value)}
          className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
        >
          <option value="all">All Designations</option>
          <option value="president">President</option>
          <option value="admin_officer">Admin Officer</option>
          <option value="vice_president">Vice President</option>
          <option value="registrar">Registrar</option>
          <option value="faculty">Faculty</option>
          <option value="principal">Principal</option>
          <option value="cashier">Cashier</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="Regular">Regular</option>
          <option value="Probationary">Probationary</option>
          <option value="Hired">Hired</option>
          <option value="Resigned">Resigned</option>
          <option value="Retired">Retired</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={nameOrder}
          onChange={e => onNameOrderChange(e.target.value as 'asc' | 'desc')}
          className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
          title="Order by Name"
        >
          <option value="desc">Latest Added</option>
          <option value="asc">Name A-Z</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
};

export default EmployeeFilters;

