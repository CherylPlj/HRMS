'use client';

import React, { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import { DisciplinaryFilters as FilterType, SeverityLevel, DisciplinaryStatus } from '@/types/disciplinary';

interface DisciplinaryFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onReset: () => void;
  employees?: { id: string; name: string }[];
  supervisors?: { id: string; name: string }[];
  categories?: string[];
  violationTypes?: string[];
}

const DisciplinaryFilters: React.FC<DisciplinaryFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  employees = [],
  supervisors = [],
  categories = [],
  violationTypes = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterType, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '' && value !== 'all'
  );

  const severityOptions: (SeverityLevel | 'all')[] = ['all', 'Minor', 'Moderate', 'Major'];
  const statusOptions: (DisciplinaryStatus | 'all')[] = [
    'all',
    'Ongoing',
    'For_Review',
    'Resolved',
    'Closed',
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-[#800000] text-white text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-sm text-[#800000] hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category || 'all'}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity Level</label>
            <select
              value={filters.severity || 'all'}
              onChange={(e) => updateFilter('severity', e.target.value as SeverityLevel | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
            >
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  {severity === 'all' ? 'All Severities' : severity}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => updateFilter('status', e.target.value as DisciplinaryStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>

          {/* Violation Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Violation Type</label>
            <select
              value={filters.violationType || 'all'}
              onChange={(e) => updateFilter('violationType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
            >
              <option value="all">All Violations</option>
              {violationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={filters.employee || 'all'}
              onChange={(e) => updateFilter('employee', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
            >
              <option value="all">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supervisor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
            <select
              value={filters.supervisor || 'all'}
              onChange={(e) => updateFilter('supervisor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
            >
              <option value="all">All Supervisors</option>
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <div className="relative">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <div className="relative">
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent bg-white"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplinaryFilters;

