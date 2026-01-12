// Utility functions for employee components

import { Employee } from './types';

/**
 * Get salary range for a given salary grade
 * Returns formatted range string or null if grade not found
 */
export const getSalaryGradeRange = (salaryGrade: string | null | undefined): string | null => {
  if (!salaryGrade || !salaryGrade.trim()) return null;
  
  const grade = salaryGrade.trim();
  
  // Extract numeric value from grade (handles formats like "1", "SG-18", "18", etc.)
  const numericMatch = grade.match(/\d+/);
  if (!numericMatch) return null;
  
  const numericGrade = parseInt(numericMatch[0], 10);
  
  // Salary grade ranges (Philippine Salary Standardization Law - can be updated with actual ranges)
  // Format: [min, max] in pesos
  const salaryRanges: Record<number, [number, number]> = {
    1: [12000, 18000],
    2: [13000, 19000],
    3: [14000, 20000],
    4: [15000, 21000],
    5: [16000, 22000],
    6: [17000, 23000],
    7: [18000, 24000],
    8: [19000, 25000],
    9: [20000, 26000],
    10: [21000, 27000],
    11: [23000, 29000],
    12: [25000, 31000],
    13: [27000, 33000],
    14: [29000, 35000],
    15: [31000, 37000],
    16: [33000, 39000],
    17: [35000, 41000],
    18: [37000, 43000],
    19: [39000, 45000],
    20: [41000, 47000],
    21: [43000, 49000],
    22: [45000, 51000],
    23: [47000, 53000],
    24: [49000, 55000],
    25: [51000, 57000],
    26: [53000, 59000],
    27: [55000, 61000],
    28: [57000, 63000],
    29: [59000, 65000],
    30: [61000, 67000],
  };
  
  const range = salaryRanges[numericGrade];
  if (!range) return null;
  
  const [min, max] = range;
  return `₱${min.toLocaleString('en-US')} - ₱${max.toLocaleString('en-US')}`;
};

export const calculateYearsOfService = (hireDate: string): string => {
  if (!hireDate) return 'N/A';
  const hire = new Date(hireDate);
  const now = new Date();
  const years = now.getFullYear() - hire.getFullYear();
  const months = now.getMonth() - hire.getMonth();
  
  if (months < 0) {
    return `${years - 1} years, ${12 + months} months`;
  }
  return `${years} years, ${months} months`;
};

export const formatDesignation = (designation: string | null): string => {
  if (!designation) return 'N/A';
  return designation.replace(/_/g, ' ');
};

export const filterEmployees = (
  employees: Employee[],
  searchTerm: string,
  departmentFilter: string,
  designationFilter: string,
  statusFilter: string,
  nameOrder: 'asc' | 'desc'
): Employee[] => {
  return employees
    .filter(employee => {
      const fullName = (employee.fullName || '').toLowerCase();
      const email = employee.email?.toLowerCase() || '';
      const position = employee.position?.toLowerCase() || '';
      const departmentId = employee.DepartmentID?.toString() || '';
      const designation = employee.designation?.toLowerCase() || '';
      const status = employee.status?.toLowerCase() || '';
      const searchQuery = searchTerm.toLowerCase();

      const matchesSearch = 
        fullName.includes(searchQuery) || 
        email.includes(searchQuery) || 
        position.includes(searchQuery);
      
      const matchesDepartment = 
        departmentFilter === 'all' || 
        departmentId === departmentFilter;
      
      const matchesDesignation = 
        designationFilter === 'all' || 
        designation === designationFilter.toLowerCase();

      const matchesStatus = 
        statusFilter === 'all' || 
        status === statusFilter.toLowerCase();

      return matchesSearch && matchesDepartment && matchesDesignation && matchesStatus;
    })
    .sort((a, b) => {
      if (nameOrder === 'asc') {
        const nameA = (a.firstName || '').toLowerCase();
        const nameB = (b.firstName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
    });
};

