import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Department } from './types';

interface FacultyFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDepartment: number | 'all';
  onDepartmentChange: (value: number | 'all') => void;
  selectedStatus: string | 'all';
  onStatusChange: (value: string) => void;
  departments: Department[];
}

const FacultyFilters: React.FC<FacultyFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedDepartment,
  onDepartmentChange,
  selectedStatus,
  onStatusChange,
  departments
}) => {
  return (
    <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
      <div className="relative w-full md:w-80">
        <input
          type="text"
          placeholder="Search faculty..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base bg-white"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-grow">
        <div className="flex-1 min-w-[140px] relative">
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2 pr-8 pl-3 text-sm sm:text-base appearance-none bg-white"
            title="Select Department"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.DepartmentID} value={dept.DepartmentID}>
                {dept.DepartmentName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
        <div className="flex-1 min-w-[140px] relative">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2 pr-8 pl-3 text-sm sm:text-base appearance-none bg-white"
            title="Select Employment Status"
          >
            <option value="all">All Employment Statuses</option>
            <option value="Regular">Regular</option>
            <option value="Under Probation">Under Probation</option>
            <option value="Resigned">Resigned</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default FacultyFilters;

