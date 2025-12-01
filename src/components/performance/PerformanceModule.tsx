'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { TrendingUp, BookOpen, Users, Search, Filter } from 'lucide-react';
import { AIPromotionRecommendations } from '../ai/AIPromotionRecommendations';
import { AITrainingRecommendations } from '../ai/AITrainingRecommendations';

interface Employee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Position?: string;
  Department?: {
    DepartmentName: string;
  };
  employmentDetails?: {
    SalaryGrade?: string;
    SalaryAmount?: number;
  };
}

export function PerformanceModule() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.FirstName} ${emp.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.EmployeeID.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      !filterDepartment || emp.Department?.DepartmentName === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const departments = Array.from(
    new Set(employees.map((e) => e.Department?.DepartmentName).filter(Boolean))
  );

  const selectedEmployeeData = employees.find((e) => e.EmployeeID === selectedEmployee);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Module</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track promotions, training needs, and employee development
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#800000]" />
                Employees
              </h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No employees found</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEmployees.map((employee) => (
                    <button
                      key={employee.EmployeeID}
                      onClick={() => setSelectedEmployee(employee.EmployeeID)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        selectedEmployee === employee.EmployeeID
                          ? 'bg-[#800000] text-white'
                          : ''
                      }`}
                    >
                      <div className="font-medium">
                        {employee.FirstName} {employee.LastName}
                      </div>
                      <div
                        className={`text-sm ${
                          selectedEmployee === employee.EmployeeID
                            ? 'text-white/80'
                            : 'text-gray-500'
                        }`}
                      >
                        {employee.Position || 'No position'}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          selectedEmployee === employee.EmployeeID
                            ? 'text-white/70'
                            : 'text-gray-400'
                        }`}
                      >
                        {employee.Department?.DepartmentName || 'No department'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="lg:col-span-2">
          {selectedEmployee ? (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {selectedEmployeeData?.FirstName} {selectedEmployeeData?.LastName}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Position:</span>
                    <span className="ml-2 font-medium">
                      {selectedEmployeeData?.Position || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Department:</span>
                    <span className="ml-2 font-medium">
                      {selectedEmployeeData?.Department?.DepartmentName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Salary Grade:</span>
                    <span className="ml-2 font-medium">
                      {selectedEmployeeData?.employmentDetails?.SalaryGrade || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Salary:</span>
                    <span className="ml-2 font-medium">
                      {selectedEmployeeData?.employmentDetails?.SalaryAmount
                        ? `₱${selectedEmployeeData.employmentDetails.SalaryAmount.toLocaleString()}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Promotion Analysis */}
              <AIPromotionRecommendations
                employeeId={selectedEmployee}
                employeeName={`${selectedEmployeeData?.FirstName} ${selectedEmployeeData?.LastName}`}
              />

              {/* Training Recommendations */}
              <AITrainingRecommendations
                employeeId={selectedEmployee}
                employeeName={`${selectedEmployeeData?.FirstName} ${selectedEmployeeData?.LastName}`}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select an Employee
              </h3>
              <p className="text-gray-600">
                Choose an employee from the list to view AI-powered promotion and training
                recommendations
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

