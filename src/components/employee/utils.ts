// Utility functions for employee components

import { Employee } from './types';

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

