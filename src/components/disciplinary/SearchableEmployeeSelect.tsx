'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
}

interface SearchableEmployeeSelectProps {
  employees: Employee[];
  value: string;
  onChange: (employeeId: string, employeeName: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableEmployeeSelect: React.FC<SearchableEmployeeSelectProps> = ({
  employees,
  value,
  onChange,
  error,
  required = false,
  placeholder = 'Search or select employee...',
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    employees.find((emp) => emp.id === value) || null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (!selectedEmployee) {
          setSearchQuery('');
        } else {
          setSearchQuery(selectedEmployee.name);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedEmployee]);

  // Update selected employee when value prop changes
  useEffect(() => {
    const employee = employees.find((emp) => emp.id === value);
    if (employee) {
      setSelectedEmployee(employee);
      setSearchQuery(employee.name);
    } else if (!value) {
      setSelectedEmployee(null);
      setSearchQuery('');
    }
  }, [value, employees]);

  const handleSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchQuery(employee.name);
    setIsOpen(false);
    onChange(employee.id, employee.name);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setSelectedEmployee(null);
    setSearchQuery('');
    onChange('', '');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsOpen(true);
    
    // Clear selection if search doesn't match selected employee
    if (selectedEmployee && !query.toLowerCase().includes(selectedEmployee.name.toLowerCase())) {
      setSelectedEmployee(null);
      onChange('', '');
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && filteredEmployees.length === 1) {
      // Auto-select if only one option
      handleSelect(filteredEmployees[0]);
      e.preventDefault();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full pl-10 pr-20 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedEmployee && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Toggle dropdown"
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredEmployees.length > 0 ? (
            <ul className="py-1">
              {filteredEmployees.map((employee) => (
                <li
                  key={employee.id}
                  onClick={() => handleSelect(employee)}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                    selectedEmployee?.id === employee.id ? 'bg-[#800000] text-white' : 'text-gray-900'
                  }`}
                >
                  {employee.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="text-sm">No employees found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Hidden input for form validation */}
      {required && (
        <input
          type="hidden"
          value={selectedEmployee?.id || ''}
          required
        />
      )}
    </div>
  );
};

export default SearchableEmployeeSelect;

