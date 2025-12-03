'use client';

import React, { useMemo } from 'react';
import { Pie, Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
  Users, 
  UserCheck, 
  UserX,
  TrendingUp,
  Building,
  Calendar,
  AlertCircle,
  Briefcase,
  Award
} from 'lucide-react';
import { Employee } from './types';

interface EmployeeDashboardProps {
  employees: Employee[];
  departments: Array<{ id: number; name: string }>;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ 
  employees, 
  departments 
}) => {
  const stats = useMemo(() => {
    const now = new Date();
    const total = employees.length;
    
    // Employment status breakdown
    const regular = employees.filter(e => e.status === 'Regular' || e.status === 'Active' || e.status === 'regular').length;
    const probationary = employees.filter(e => e.status === 'Probationary' || e.status === 'probationary').length;
    const resigned = employees.filter(e => e.status === 'Resigned' || e.status === 'resigned').length;
    const hired = employees.filter(e => e.status === 'Hired' || e.status === 'hired').length;
    
    // Department distribution
    const departmentCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const deptName = emp.departmentName || emp.Department?.DepartmentName || 'No Department';
      departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
    });

    // Designation/Position distribution
    const designationCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const designation = emp.designation || 'N/A';
      const normalizedDesignation = designation.replace(/_/g, ' ');
      designationCounts[normalizedDesignation] = (designationCounts[normalizedDesignation] || 0) + 1;
    });

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentHires = employees.filter(emp => {
      if (!emp.hireDate) return false;
      const hireDate = new Date(emp.hireDate);
      if (isNaN(hireDate.getTime())) return false;
      return hireDate >= thirtyDaysAgo;
    }).length;

    // Employees needing attention (incomplete profiles)
    const needsAttention = employees.filter(emp => {
      // Check for missing critical information
      return !emp.email || 
             !emp.phone || 
             !emp.ContactInfo?.PresentAddress || 
             !emp.birthDate ||
             !emp.GovernmentID?.SSSNumber;
    }).slice(0, 10);

    // Employees approaching data retention expiry (2.5+ years since resignation)
    const approachingRetentionExpiry = employees.filter(emp => {
      const resignationDate = (emp as any).ResignationDate || (emp as any).EmploymentDetail?.ResignationDate;
      if (!resignationDate) return false;
      const resignDate = new Date(resignationDate);
      if (isNaN(resignDate.getTime())) return false;
      const daysSinceResignation = Math.floor((now.getTime() - resignDate.getTime()) / (1000 * 60 * 60 * 24));
      const yearsSinceResignation = daysSinceResignation / 365;
      return yearsSinceResignation >= 2.5 && yearsSinceResignation < 3;
    }).slice(0, 10);

    // Employees with expired data retention (3+ years since resignation)
    const expiredRetention = employees.filter(emp => {
      const resignationDate = (emp as any).ResignationDate || (emp as any).EmploymentDetail?.ResignationDate;
      if (!resignationDate) return false;
      const resignDate = new Date(resignationDate);
      if (isNaN(resignDate.getTime())) return false;
      const daysSinceResignation = Math.floor((now.getTime() - resignDate.getTime()) / (1000 * 60 * 60 * 24));
      const yearsSinceResignation = daysSinceResignation / 365;
      return yearsSinceResignation >= 3;
    }).slice(0, 10);

    // Top departments by employee count
    const topDepartments = Object.entries(departmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Monthly hiring trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 12);
    
    const monthlyHires: Record<string, number> = {};
    const monthlyResignations: Record<string, number> = {};
    
    employees.forEach(emp => {
      if (emp.hireDate) {
        const hireDate = new Date(emp.hireDate);
        if (!isNaN(hireDate.getTime()) && hireDate >= twelveMonthsAgo) {
          const monthKey = `${hireDate.getFullYear()}-${String(hireDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyHires[monthKey] = (monthlyHires[monthKey] || 0) + 1;
        }
      }
      const resignationDate = (emp as any).ResignationDate || (emp as any).EmploymentDetail?.ResignationDate;
      if (resignationDate) {
        const resignDate = new Date(resignationDate);
        if (!isNaN(resignDate.getTime()) && resignDate >= twelveMonthsAgo) {
          const monthKey = `${resignDate.getFullYear()}-${String(resignDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyResignations[monthKey] = (monthlyResignations[monthKey] || 0) + 1;
        }
      }
    });

    // Recent employee additions (last 10)
    const recentEmployees = [...employees]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    // Employee type distribution
    const employeeTypeCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const type = emp.employeeType || 'Regular';
      employeeTypeCounts[type] = (employeeTypeCounts[type] || 0) + 1;
    });

    // Average years of service
    const employeesWithHireDate = employees.filter(e => {
      if (!e.hireDate) return false;
      const hireDate = new Date(e.hireDate);
      return !isNaN(hireDate.getTime());
    });
    const avgYearsOfService = employeesWithHireDate.length > 0
      ? employeesWithHireDate.reduce((sum, emp) => {
          const hireDate = new Date(emp.hireDate!);
          const years = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return sum + years;
        }, 0) / employeesWithHireDate.length
      : 0;

    return {
      total,
      regular,
      probationary,
      resigned,
      hired,
      recentHires,
      departmentCounts,
      designationCounts,
      employeeTypeCounts,
      topDepartments,
      monthlyHires,
      monthlyResignations,
      recentEmployees,
      needsAttention,
      avgYearsOfService: Math.round(avgYearsOfService * 10) / 10,
      approachingRetentionExpiry,
      expiredRetention,
      now
    };
  }, [employees, departments]);

  // Status distribution chart data
  const statusChartData = {
    labels: ['Regular', 'Probationary', 'Hired', 'Resigned'],
    datasets: [
      {
        data: [stats.regular, stats.probationary, stats.hired, stats.resigned],
        backgroundColor: ['#22c55e', '#fbbf24', '#3b82f6', '#ef4444'],
        borderWidth: 1,
      },
    ],
  };

  // Department distribution chart data
  const departmentLabels = Object.keys(stats.departmentCounts);
  const departmentChartData = {
    labels: departmentLabels,
    datasets: [
      {
        data: Object.values(stats.departmentCounts),
        backgroundColor: [
          '#800000',
          '#dc2626',
          '#f97316',
          '#eab308',
          '#22c55e',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Designation distribution chart data
  const designationLabels = Object.keys(stats.designationCounts).slice(0, 8); // Top 8
  const designationChartData = {
    labels: designationLabels,
    datasets: [
      {
        label: 'Employees',
        data: designationLabels.map(label => stats.designationCounts[label] || 0),
        backgroundColor: '#800000',
        borderColor: '#800000',
        borderWidth: 1,
      },
    ],
  };

  // Monthly trends chart data
  const monthlyLabels = Object.keys(stats.monthlyHires)
    .concat(Object.keys(stats.monthlyResignations))
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();
  
  const timelineChartData = {
    labels: monthlyLabels.map(label => {
      const [year, month] = label.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'New Hires',
        data: monthlyLabels.map(label => stats.monthlyHires[label] || 0),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Resignations',
        data: monthlyLabels.map(label => stats.monthlyResignations[label] || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Regular Employees</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.regular}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Probationary</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.probationary}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Hires (30 days)</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.recentHires}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{departments.length}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Building className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Years of Service</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.avgYearsOfService}</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-3">
              <Award className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resigned</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.resigned}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employment Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Status Distribution</h3>
          <div className="h-[250px] flex items-center justify-center">
            <Pie 
              data={statusChartData} 
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                      boxWidth: 15,
                      padding: 15,
                      usePointStyle: true
                    }
                  } 
                } 
              }} 
            />
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
          <div className="h-[250px] flex items-center justify-center">
            {departmentLabels.length > 0 ? (
              <Pie 
                data={departmentChartData} 
                options={{ 
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { 
                      display: true, 
                      position: 'bottom',
                      labels: {
                        boxWidth: 15,
                        padding: 15,
                        usePointStyle: true
                      }
                    } 
                  } 
                }} 
              />
            ) : (
              <p className="text-gray-500">No department data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Designation Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Designations</h3>
        <div className="h-[300px]">
          {designationLabels.length > 0 ? (
            <Bar 
              data={designationChartData} 
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    display: false
                  } 
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No designation data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hiring Trends (Last 12 Months)</h3>
        <div className="h-[300px]">
          {monthlyLabels.length > 0 ? (
            <Line 
              data={timelineChartData} 
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    display: true, 
                    position: 'top',
                  } 
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }} 
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No data available for the last 12 months</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Departments and Recent Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Departments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-[#800000]" />
            Top Departments by Employee Count
          </h3>
          <div className="space-y-3">
            {stats.topDepartments.length > 0 ? (
              stats.topDepartments.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#800000] text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{dept.name}</p>
                      <p className="text-sm text-gray-500">{dept.count} employees</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#800000]">{dept.count}</p>
                    <p className="text-xs text-gray-500">
                      {stats.total > 0 ? Math.round((dept.count / stats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No department data available</p>
            )}
          </div>
        </div>

        {/* Recent Employees */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#800000]" />
            Recent Employee Additions
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {stats.recentEmployees.length > 0 ? (
              stats.recentEmployees.map((emp) => (
                <div key={emp.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                      {emp.photo ? (
                        <img 
                          src={emp.photo} 
                          alt={emp.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-medium text-sm">
                          {(emp.firstName || '').charAt(0)}{(emp.surname || '').charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{emp.fullName || `${emp.firstName} ${emp.surname}`.trim()}</p>
                      <p className="text-sm text-gray-500">
                        {emp.position || 'N/A'} • {emp.departmentName || 'No Department'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      emp.status === 'Regular' || emp.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : emp.status === 'Probationary'
                        ? 'bg-yellow-100 text-yellow-800'
                        : emp.status === 'Resigned'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {emp.status || 'N/A'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent employees</p>
            )}
          </div>
        </div>
      </div>

      {/* Employees Needing Attention */}
      {stats.needsAttention.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Employees Needing Attention (Incomplete Profiles)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.needsAttention.map((emp) => {
              const missingFields = [];
              if (!emp.email) missingFields.push('Email');
              if (!emp.phone) missingFields.push('Phone');
              if (!emp.ContactInfo?.PresentAddress) missingFields.push('Address');
              if (!emp.birthDate) missingFields.push('Date of Birth');
              if (!emp.GovernmentID?.SSSNumber) missingFields.push('Government IDs');

              return (
                <div key={emp.employeeId} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-gray-900">{emp.fullName || `${emp.firstName} ${emp.surname}`.trim()}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {emp.position || 'N/A'} • {emp.departmentName || 'No Department'}
                  </p>
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Missing:</p>
                    <p className="text-xs text-yellow-700 font-medium">
                      {missingFields.slice(0, 3).join(', ')}
                      {missingFields.length > 3 && ` +${missingFields.length - 3} more`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Retention Compliance Warnings */}
      {(stats.approachingRetentionExpiry.length > 0 || stats.expiredRetention.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Data Retention Compliance (DPA Philippines)
          </h3>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Data Privacy Act (Philippines) & DOLE Requirements:</strong> Employee records must be retained for a minimum of 3 years from resignation/retirement date. After 3 years, data should be securely disposed of per DPA requirements.
            </p>
          </div>

          {stats.expiredRetention.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold text-red-600 mb-2">
                ⚠️ Expired Retention Period ({stats.expiredRetention.length} employees)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.expiredRetention.map((emp: Employee) => {
                  const resignationDate = (emp as any).ResignationDate || (emp as any).EmploymentDetail?.ResignationDate;
                  const resignDate = new Date(resignationDate);
                  if (isNaN(resignDate.getTime())) return null;
                  const daysSinceResignation = Math.floor((stats.now.getTime() - resignDate.getTime()) / (1000 * 60 * 60 * 24));
                  const yearsSinceResignation = (daysSinceResignation / 365).toFixed(1);

                  return (
                    <div key={emp.employeeId} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-gray-900">{emp.fullName || `${emp.firstName} ${emp.surname}`.trim()}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {emp.position || 'N/A'} • {emp.departmentName || 'No Department'}
                      </p>
                      <div className="mt-2">
                        <p className="text-xs text-red-700 font-semibold">
                          Resigned: {resignDate.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-red-700 font-semibold mt-1">
                          Retention: {yearsSinceResignation} years (EXPIRED - Data should be disposed)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stats.approachingRetentionExpiry.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-yellow-600 mb-2">
                ⚠️ Approaching Retention Limit ({stats.approachingRetentionExpiry.length} employees)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.approachingRetentionExpiry.map((emp: Employee) => {
                  const resignationDate = (emp as any).ResignationDate || (emp as any).EmploymentDetail?.ResignationDate;
                  const resignDate = new Date(resignationDate);
                  if (isNaN(resignDate.getTime())) return null;
                  const daysSinceResignation = Math.floor((stats.now.getTime() - resignDate.getTime()) / (1000 * 60 * 60 * 24));
                  const yearsSinceResignation = (daysSinceResignation / 365).toFixed(1);
                  const daysRemaining = Math.max(0, (3 * 365) - daysSinceResignation);

                  return (
                    <div key={emp.employeeId} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-medium text-gray-900">{emp.fullName || `${emp.firstName} ${emp.surname}`.trim()}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {emp.position || 'N/A'} • {emp.departmentName || 'No Department'}
                      </p>
                      <div className="mt-2">
                        <p className="text-xs text-yellow-700 font-semibold">
                          Resigned: {resignDate.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-yellow-700 font-semibold mt-1">
                          Retention: {yearsSinceResignation} years ({Math.ceil(daysRemaining)} days remaining)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;

