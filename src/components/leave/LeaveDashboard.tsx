import React, { useMemo } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
    Calendar, 
    Clock, 
    CheckCircle, 
    XCircle,
    TrendingUp,
    Users,
    FileText
} from 'lucide-react';
import { LeaveStatus } from '@prisma/client';
import type { TransformedLeave } from './types';
import { formatDate } from './utils';

interface LeaveDashboardProps {
    leaves: TransformedLeave[];
    isLoading?: boolean;
}

const LeaveDashboard: React.FC<LeaveDashboardProps> = ({ leaves, isLoading = false }) => {
    const stats = useMemo(() => {
        const total = leaves.length;
        const pending = leaves.filter((l) => l.Status === LeaveStatus.Pending).length;
        const approved = leaves.filter((l) => l.Status === LeaveStatus.Approved).length;
        const returned = leaves.filter((l) => l.Status === LeaveStatus.Returned).length;
        
        // Calculate approval rate
        const processed = approved + returned;
        const approvalRate = processed > 0 ? (approved / processed) * 100 : 0;

        // Leave type distribution
        const leaveTypeCounts: Record<string, number> = {};
        const undertimeCount = leaves.filter((l) => l.RequestType === 'Undertime').length;
        leaveTypeCounts['Undertime'] = undertimeCount;
        
        leaves.forEach((leave) => {
            if (leave.RequestType === 'Leave' && leave.LeaveType) {
                leaveTypeCounts[leave.LeaveType] = (leaveTypeCounts[leave.LeaveType] || 0) + 1;
            }
        });

        // Top employees by leave requests
        const employeeCounts: Record<string, { name: string; count: number; department: string }> = {};
        leaves.forEach((leave) => {
            const key = leave.Faculty?.UserID || leave.Faculty?.Name || 'Unknown';
            if (!employeeCounts[key]) {
                employeeCounts[key] = {
                    name: leave.Faculty?.Name || 'Unknown',
                    count: 0,
                    department: leave.Faculty?.Department || 'N/A'
                };
            }
            employeeCounts[key].count += 1;
        });
        const topEmployees = Object.values(employeeCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Monthly trends (last 6 months)
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        const monthlyLeaves: Record<string, number> = {};
        const monthlyApproved: Record<string, number> = {};
        const monthlyReturned: Record<string, number> = {};
        
        leaves
            .filter((l) => new Date(l.CreatedAt) >= sixMonthsAgo)
            .forEach((leave) => {
                const date = new Date(leave.CreatedAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyLeaves[monthKey] = (monthlyLeaves[monthKey] || 0) + 1;
                
                if (leave.Status === LeaveStatus.Approved) {
                    monthlyApproved[monthKey] = (monthlyApproved[monthKey] || 0) + 1;
                } else if (leave.Status === LeaveStatus.Returned) {
                    monthlyReturned[monthKey] = (monthlyReturned[monthKey] || 0) + 1;
                }
            });

        // Recent leaves (last 10)
        const recentLeaves = [...leaves]
            .sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime())
            .slice(0, 10);

        // Average processing time (for approved/returned)
        const processedLeaves = leaves.filter(
            (l) => l.Status === LeaveStatus.Approved || l.Status === LeaveStatus.Returned
        );
        let avgProcessingDays = 0;
        if (processedLeaves.length > 0) {
            const totalDays = processedLeaves.reduce((sum, leave) => {
                const created = new Date(leave.CreatedAt);
                const updated = leave.UpdatedAt ? new Date(leave.UpdatedAt) : new Date();
                const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0);
            avgProcessingDays = Math.round((totalDays / processedLeaves.length) * 10) / 10;
        }

        return {
            total,
            pending,
            approved,
            returned,
            approvalRate: Math.round(approvalRate * 10) / 10,
            leaveTypeCounts,
            topEmployees,
            monthlyLeaves,
            monthlyApproved,
            monthlyReturned,
            recentLeaves,
            avgProcessingDays
        };
    }, [leaves]);

    // Status distribution chart data
    const statusChartData = {
        labels: ['Pending', 'Approved', 'Returned'],
        datasets: [
            {
                data: [stats.pending, stats.approved, stats.returned],
                backgroundColor: ['#fbbf24', '#22c55e', '#ef4444'],
                borderWidth: 1,
            },
        ],
    };

    // Leave type distribution chart data
    const leaveTypeLabels = Object.keys(stats.leaveTypeCounts);
    const leaveTypeChartData = {
        labels: leaveTypeLabels,
        datasets: [
            {
                data: Object.values(stats.leaveTypeCounts),
                backgroundColor: [
                    '#800000',
                    '#dc2626',
                    '#f97316',
                    '#eab308',
                    '#22c55e',
                    '#3b82f6',
                    '#8b5cf6',
                ],
                borderWidth: 1,
            },
        ],
    };

    // Monthly trends chart data
    const monthlyLabels = Object.keys(stats.monthlyLeaves).sort();
    const timelineChartData = {
        labels: monthlyLabels.map(label => {
            const [year, month] = label.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [
            {
                label: 'Total Requests',
                data: monthlyLabels.map(label => stats.monthlyLeaves[label] || 0),
                borderColor: '#800000',
                backgroundColor: 'rgba(128, 0, 0, 0.1)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Approved',
                data: monthlyLabels.map(label => stats.monthlyApproved[label] || 0),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Returned',
                data: monthlyLabels.map(label => stats.monthlyReturned[label] || 0),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true,
            },
        ],
    };

    // Skeleton loader for stat cards
    const StatCardSkeleton = () => (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="bg-gray-100 rounded-full p-3">
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Statistics Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </div>
                {/* Additional Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </div>
                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                        <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                        <div className="h-[250px] bg-gray-100 rounded"></div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                        <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                        <div className="h-[250px] bg-gray-100 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Requests</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-3">
                            <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
                        </div>
                        <div className="bg-yellow-100 rounded-full p-3">
                            <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Approved</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
                        </div>
                        <div className="bg-green-100 rounded-full p-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Returned</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{stats.returned}</p>
                        </div>
                        <div className="bg-red-100 rounded-full p-3">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.approvalRate}%</p>
                        </div>
                        <div className="bg-green-100 rounded-full p-3">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Avg. Processing Time</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.avgProcessingDays} days</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-3">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Top Employee</p>
                            <p className="text-lg font-semibold text-gray-900 mt-2">
                                {stats.topEmployees.length > 0 ? stats.topEmployees[0].name : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500">
                                {stats.topEmployees.length > 0 ? `${stats.topEmployees[0].count} requests` : ''}
                            </p>
                        </div>
                        <div className="bg-purple-100 rounded-full p-3">
                            <Users className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
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

                {/* Leave Type Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Type Distribution</h3>
                    <div className="h-[250px] flex items-center justify-center">
                        {leaveTypeLabels.length > 0 ? (
                            <Pie 
                                data={leaveTypeChartData} 
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
                            <p className="text-gray-500">No leave type data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends (Last 6 Months)</h3>
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
                            <p className="text-gray-500">No data available for the last 6 months</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row: Top Employees and Recent Leaves */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Employees */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#800000]" />
                        Top Employees by Leave Requests
                    </h3>
                    <div className="space-y-3">
                        {stats.topEmployees.length > 0 ? (
                            stats.topEmployees.map((employee, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#800000] text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{employee.name}</p>
                                            <p className="text-sm text-gray-500">{employee.department}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-[#800000]">{employee.count}</p>
                                        <p className="text-xs text-gray-500">requests</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">No employee data available</p>
                        )}
                    </div>
                </div>

                {/* Recent Leaves */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#800000]" />
                        Recent Leave Requests
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {stats.recentLeaves.length > 0 ? (
                            stats.recentLeaves.map((leave) => (
                                <div key={leave.LeaveID} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{leave.Faculty?.Name || 'Unknown'}</p>
                                        <p className="text-sm text-gray-500">
                                            {leave.LeaveType || leave.RequestType} • {formatDate(leave.CreatedAt)}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                        leave.Status === LeaveStatus.Approved 
                                            ? 'bg-green-100 text-green-800'
                                            : leave.Status === LeaveStatus.Returned
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {leave.Status}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-4">No recent leaves</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveDashboard;

