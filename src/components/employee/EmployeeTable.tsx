'use client';

import React from 'react';
import { FaEye, FaEdit } from 'react-icons/fa';
import { Employee, Department } from './types';
import { formatDesignation } from './utils';
import DataRetentionInfo from './DataRetentionInfo';

interface EmployeeTableProps {
  employees: Employee[];
  departments: Department[];
  onEmployeeSelect: (employee: Employee) => void;
  onEmployeeEdit: (employee: Employee) => void;
  onPhotoClick: (e: React.MouseEvent, photoUrl: string, alt: string) => void;
  showDataRetention?: boolean;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  departments,
  onEmployeeSelect,
  onEmployeeEdit,
  onPhotoClick,
  showDataRetention = false,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Photo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Position
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Designation
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {employees.map((employee) => (
            <React.Fragment key={employee.id}>
              <tr 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onEmployeeSelect(employee)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (employee.photo) {
                        onPhotoClick(e, employee.photo, `${employee.firstName} ${employee.surname}`);
                      }
                    }}
                  >
                    {employee.photo ? (
                      <img 
                        src={employee.photo} 
                        alt={`${employee.firstName} ${employee.surname}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#800000]">
                        <span className="text-white font-medium">
                          {(employee.firstName || '').charAt(0)}{(employee.surname || '').charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.fullName || `${employee.firstName} ${employee.surname}`.trim()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {employee.employeeType}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.position}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDesignation(employee.designation)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.departmentName || 'No Department'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {employee.email || 'No email'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmployeeSelect(employee);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmployeeEdit(employee);
                      }}
                      className="text-[#800000] hover:text-red-800"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              {showDataRetention && (
                <tr>
                  <td colSpan={7} className="px-6 py-2">
                    <DataRetentionInfo employee={employee} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTable;

