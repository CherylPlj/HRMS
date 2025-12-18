'use client';

import React, { useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
  FileText, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Users,
  Award,
  AlertTriangle
} from 'lucide-react';
import { DisciplinaryRecord } from '@/types/disciplinary';
import StatusTag from './StatusTag';
import SeverityTag from './SeverityTag';

interface DisciplinaryDashboardProps {
  records: DisciplinaryRecord[];
  stats?: any;
}

const DisciplinaryDashboard: React.FC<DisciplinaryDashboardProps> = ({ records, stats: externalStats }) => {
  // Calculate statistics - use external stats if available, otherwise calculate from records
  const stats = useMemo(() => {
    if (externalStats) {
      return {
        total: externalStats.totalRecords,
        ongoing: externalStats.statusBreakdown.ongoing,
        forReview: externalStats.statusBreakdown.forReview,
        resolved: externalStats.statusBreakdown.resolved,
        closed: externalStats.statusBreakdown.closed,
        minor: externalStats.severityBreakdown.minor,
        moderate: externalStats.severityBreakdown.moderate,
        major: externalStats.severityBreakdown.major,
        categoryCounts: externalStats.categoryBreakdown.reduce((acc: Record<string, number>, item: any) => {
          acc[item.category] = item.count;
          return acc;
        }, {}),
        // Calculate other stats from records if needed
        resolutionRate: externalStats.totalRecords > 0 
          ? ((externalStats.statusBreakdown.resolved + externalStats.statusBreakdown.closed) / externalStats.totalRecords) * 100 
          : 0,
        topEmployees: [], // Will be calculated from records
        monthlyCases: {} as Record<string, number>, // Will be calculated from records
        recentCases: records.slice(0, 10),
        avgResolutionDays: 0, // Can be calculated if needed
      };
    }

    const total = records.length;
    const ongoing = records.filter((r) => r.status === 'Ongoing').length;
    const forReview = records.filter((r) => r.status === 'For_Review').length;
    const resolved = records.filter((r) => r.status === 'Resolved').length;
    const closed = records.filter((r) => r.status === 'Closed').length;
    
    const minor = records.filter((r) => r.severity === 'Minor').length;
    const moderate = records.filter((r) => r.severity === 'Moderate').length;
    const major = records.filter((r) => r.severity === 'Major').length;

    // Calculate resolution rate (resolved + closed / total)
    const resolutionRate = total > 0 ? ((resolved + closed) / total) * 100 : 0;

    // Get cases by category
    const categoryCounts: Record<string, number> = {};
    records.forEach((record) => {
      categoryCounts[record.category] = (categoryCounts[record.category] || 0) + 1;
    });

    // Get top employees with most cases
    const employeeCounts: Record<string, { name: string; count: number; employeeId: string }> = {};
    records.forEach((record) => {
      const key = record.employeeId || record.employee;
      if (!employeeCounts[key]) {
        employeeCounts[key] = {
          name: record.employee,
          count: 0,
          employeeId: record.employeeId || '',
        };
      }
      employeeCounts[key].count += 1;
    });
    const topEmployees = Object.values(employeeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Cases over time (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const monthlyCases: Record<string, number> = {};
    records
      .filter((r) => new Date(r.dateTime) >= sixMonthsAgo)
      .forEach((record) => {
        const date = new Date(record.dateTime);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCases[monthKey] = (monthlyCases[monthKey] || 0) + 1;
      });

    // Recent cases (last 10)
    const recentCases = [...records]
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 10);

    // Average resolution time (for resolved/closed cases)
    const resolvedCases = records.filter(
      (r) => (r.status === 'Resolved' || r.status === 'Closed') && r.resolutionDate
    );
    const avgResolutionDays = resolvedCases.length > 0
      ? resolvedCases.reduce((sum, r) => {
          const created = new Date(r.dateTime);
          const resolved = new Date(r.resolutionDate!);
          const days = Math.ceil((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / resolvedCases.length
      : 0;

    return {
      total,
      ongoing,
      forReview,
      resolved,
      closed,
      minor,
      moderate,
      major,
      resolutionRate,
      categoryCounts,
      topEmployees,
      monthlyCases,
      recentCases,
      avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
    };
  }, [records, externalStats]);

  // Status distribution chart data
  const statusChartData = {
    labels: ['Ongoing', 'For Review', 'Resolved', 'Closed'],
    datasets: [
      {
        data: [stats.ongoing, stats.forReview, stats.resolved, stats.closed],
        backgroundColor: ['#f97316', '#3b82f6', '#22c55e', '#6b7280'],
        borderWidth: 1,
      },
    ],
  };

  // Category distribution chart data
  const categoryChartData = {
    labels: Object.keys(stats.categoryCounts),
    datasets: [
      {
        label: 'Cases',
        data: Object.values(stats.categoryCounts),
        backgroundColor: '#800000',
        borderRadius: 8,
      },
    ],
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Ongoing Cases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ongoing Cases</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.ongoing}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.resolutionRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Average Resolution Days */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Resolution</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {stats.avgResolutionDays > 0 ? `${stats.avgResolutionDays}` : 'N/A'}
              </p>
              {stats.avgResolutionDays > 0 && (
                <p className="text-xs text-gray-500 mt-1">days</p>
              )}
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cases by Status</h3>
          <div className="h-64">
            <Pie
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Cases by Category */}
        {Object.keys(stats.categoryCounts).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cases by Category</h3>
            <div className="h-64">
              <Bar
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Top Employees and Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Employees with Most Cases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Employees</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          {stats.topEmployees.length > 0 ? (
            <div className="space-y-3">
              {stats.topEmployees.map((emp, index) => (
                <div
                  key={emp.employeeId || emp.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-[#800000] text-white rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      {emp.count} case{emp.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Recent Cases */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Cases</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          {stats.recentCases.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentCases.map((record) => (
                <div
                  key={record.id}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{record.caseNo}</p>
                      <p className="text-xs text-gray-500">{record.employee}</p>
                    </div>
                    <SeverityTag severity={record.severity} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <StatusTag status={record.status} />
                    <span className="text-xs text-gray-500">{formatDate(record.dateTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No recent cases</p>
          )}
        </div>
      </div>

      {/* Status Breakdown Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.ongoing}</p>
              <p className="text-sm text-gray-600">Ongoing</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.forReview}</p>
              <p className="text-sm text-gray-600">For Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
              <p className="text-sm text-gray-600">Closed</p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default DisciplinaryDashboard;

