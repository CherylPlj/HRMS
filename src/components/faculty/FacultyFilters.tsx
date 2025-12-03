import React from 'react';
import { Search } from 'lucide-react';
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
    <div className="mb-6 flex items-center gap-4">
      <div className="relative w-80">
        <input
          type="text"
          placeholder="Search faculty..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      <div className="flex items-center gap-4 flex-grow">
        <div className="w-64">
          <select
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
            title="Select Department"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.DepartmentID} value={dept.DepartmentID}>
                {dept.DepartmentName}
              </option>
            ))}
          </select>
        </div>
        <div className="w-64">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring-[#800000] py-2"
            title="Select Employment Status"
          >
            <option value="all">All Employment Statuses</option>
            <option value="Regular">Regular</option>
            <option value="Under Probation">Under Probation</option>
            <option value="Resigned">Resigned</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FacultyFilters;

