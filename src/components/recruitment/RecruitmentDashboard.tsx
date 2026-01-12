'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { 
  Users, 
  Briefcase, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  FileText,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Candidate, Vacancy } from './types';
import { formatDate, formatStatus } from './utils';

interface RecruitmentDashboardProps {
  candidates: Candidate[];
  vacancies: Vacancy[];
}

export const RecruitmentDashboard: React.FC<RecruitmentDashboardProps> = ({ 
  candidates, 
  vacancies 
}) => {
  // AI Screening statistics
  const [aiStats, setAiStats] = useState({
    totalScreened: 0,
    strongRecommend: 0,
    recommend: 0,
    averageScore: 0,
    topCandidates: [] as Array<{ name: string; score: number; candidateId: number }>,
  });

  useEffect(() => {
    const fetchAIStats = async () => {
      try {
        const response = await fetch('/api/ai/reports?type=recruitment-quality');
        if (response.ok) {
          const data = await response.json();
          setAiStats({
            totalScreened: data.total || 0,
            strongRecommend: data.recommendations?.strongRecommend || 0,
            recommend: data.recommendations?.recommend || 0,
            averageScore: data.averageScore || 0,
            topCandidates: data.screenings
              ?.filter((s: any) => s.recommendation === 'StrongRecommend' || s.recommendation === 'Recommend')
              .slice(0, 5)
              .map((s: any) => ({
                name: s.candidateName,
                score: s.overallScore || 0,
                candidateId: s.candidateId,
              })) || [],
          });
        }
      } catch (error) {
        console.error('Error fetching AI stats:', error);
      }
    };
    fetchAIStats();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCandidates = candidates.length;
    const activeCandidates = candidates.filter(c => c.Status !== 'Hired' && c.Status !== 'Withdrawn' && c.Status !== 'Returned').length;
    const hiredCandidates = candidates.filter(c => c.Status === 'Hired').length;
    const withdrawnCandidates = candidates.filter(c => c.Status === 'Withdrawn').length;
    
    const totalVacancies = vacancies.length;
    const activeVacancies = vacancies.filter(v => v.Status === 'Active').length;
    const filledVacancies = vacancies.filter(v => v.Status === 'Filled').length;
    const inactiveVacancies = vacancies.filter(v => v.Status === 'Inactive').length;
    const cancelledVacancies = vacancies.filter(v => v.Status === 'Cancelled').length;

    // Calculate hire rate
    const hireRate = totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0;

    // Get candidates by status
    const statusCounts: Record<string, number> = {};
    candidates.forEach((candidate) => {
      const status = formatStatus(candidate.Status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Get candidates by job title
    const jobTitleCounts: Record<string, number> = {};
    candidates.forEach((candidate) => {
      const jobTitle = candidate.Vacancy?.JobTitle || 'Unknown';
      jobTitleCounts[jobTitle] = (jobTitleCounts[jobTitle] || 0) + 1;
    });

    // Get vacancies by job title
    const vacancyJobTitleCounts: Record<string, number> = {};
    vacancies.forEach((vacancy) => {
      vacancyJobTitleCounts[vacancy.JobTitle] = (vacancyJobTitleCounts[vacancy.JobTitle] || 0) + 1;
    });

    // Top vacancies by candidate count
    const topVacancies = vacancies
      .map(v => ({
        ...v,
        candidateCount: v._count?.Candidates || 0
      }))
      .sort((a, b) => b.candidateCount - a.candidateCount)
      .slice(0, 5);

    // Candidates over time (last 6 months)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const monthlyCandidates: Record<string, number> = {};
    candidates
      .filter(c => new Date(c.DateApplied) >= sixMonthsAgo)
      .forEach((candidate) => {
        const date = new Date(candidate.DateApplied);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCandidates[monthKey] = (monthlyCandidates[monthKey] || 0) + 1;
      });

    // Recent candidates (last 10)
    const recentCandidates = [...candidates]
      .sort((a, b) => new Date(b.DateApplied).getTime() - new Date(a.DateApplied).getTime())
      .slice(0, 10);

    // Average time to hire (for hired candidates with interview dates)
    const hiredWithInterview = candidates.filter(
      c => c.Status === 'Hired' && c.InterviewDate
    );
    const avgTimeToHire = hiredWithInterview.length > 0
      ? hiredWithInterview.reduce((sum, c) => {
          const applied = new Date(c.DateApplied);
          const interviewed = new Date(c.InterviewDate!);
          const days = Math.ceil((interviewed.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / hiredWithInterview.length
      : 0;

    return {
      totalCandidates,
      activeCandidates,
      hiredCandidates,
      withdrawnCandidates,
      totalVacancies,
      activeVacancies,
      filledVacancies,
      inactiveVacancies,
      cancelledVacancies,
      hireRate,
      statusCounts,
      jobTitleCounts,
      vacancyJobTitleCounts,
      topVacancies,
      monthlyCandidates,
      recentCandidates,
      avgTimeToHire: Math.round(avgTimeToHire * 10) / 10,
    };
  }, [candidates, vacancies]);

  // Status distribution chart data
  const statusChartData = {
    labels: Object.keys(stats.statusCounts),
    datasets: [
      {
        data: Object.values(stats.statusCounts),
        backgroundColor: [
          '#3b82f6', // Blue - Application Initiated
          '#f97316', // Orange - Under Review
          '#eab308', // Yellow - Shortlisted
          '#8b5cf6', // Purple - Interview Scheduled
          '#06b6d4', // Cyan - Interview Completed
          '#10b981', // Green - Offered
          '#22c55e', // Green - Hired
          '#ef4444', // Red - Returned
          '#6b7280', // Gray - Withdrawn
        ],
        borderWidth: 1,
      },
    ],
  };

  // Vacancy status distribution chart data
  const vacancyStatusChartData = {
    labels: ['Active', 'Filled', 'Inactive', 'Cancelled'],
    datasets: [
      {
        data: [
          stats.activeVacancies,
          stats.filledVacancies,
          stats.inactiveVacancies,
          stats.cancelledVacancies
        ],
        backgroundColor: ['#22c55e', '#3b82f6', '#6b7280', '#ef4444'],
        borderWidth: 1,
      },
    ],
  };

  // Candidates by job title chart data
  const jobTitleChartData = {
    labels: Object.keys(stats.jobTitleCounts),
    datasets: [
      {
        label: 'Candidates',
        data: Object.values(stats.jobTitleCounts),
        backgroundColor: '#800000',
        borderRadius: 8,
      },
    ],
  };

  // Candidates over time chart data
  const monthlyLabels = Object.keys(stats.monthlyCandidates).sort();
  const timelineChartData = {
    labels: monthlyLabels.map((label) => {
      const [year, month] = label.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    }),
    datasets: [
      {
        label: 'Candidates',
        data: monthlyLabels.map((label) => stats.monthlyCandidates[label]),
        borderColor: '#800000',
        backgroundColor: 'rgba(128, 0, 0, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Candidates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCandidates}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active Candidates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Candidates</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.activeCandidates}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Hired Candidates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hired Candidates</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.hiredCandidates}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Hire Rate */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hire Rate</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {stats.hireRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Vacancy Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vacancies */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vacancies</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVacancies}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active Vacancies */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Vacancies</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeVacancies}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filled Vacancies */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Filled Vacancies</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.filledVacancies}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Average Time to Hire */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Time to Hire</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">
                {stats.avgTimeToHire > 0 ? `${stats.avgTimeToHire}` : 'N/A'}
              </p>
              {stats.avgTimeToHire > 0 && (
                <p className="text-xs text-gray-500 mt-1">days</p>
              )}
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Screening Insights */}
      {aiStats.totalScreened > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#800000]" />
            <h3 className="text-lg font-semibold text-gray-900">AI Screening Insights</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Screened</p>
              <p className="text-2xl font-bold text-[#800000]">{aiStats.totalScreened}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Strong Recommend</p>
              <p className="text-2xl font-bold text-green-600">{aiStats.strongRecommend}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Recommend</p>
              <p className="text-2xl font-bold text-blue-600">{aiStats.recommend}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {aiStats.averageScore.toFixed(1)}/100
              </p>
            </div>
          </div>
          {aiStats.topCandidates.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Top AI-Recommended Candidates</h4>
              <div className="space-y-2">
                {aiStats.topCandidates.map((candidate, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-900">{candidate.name}</span>
                    <span className="text-sm font-semibold text-[#800000]">
                      {candidate.score}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidates by Status */}
        {Object.keys(stats.statusCounts).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidates by Status</h3>
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
        )}

        {/* Vacancies by Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vacancies by Status</h3>
          <div className="h-64">
            <Pie
              data={vacancyStatusChartData}
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
      </div>

      {/* Category and Timeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidates by Job Title */}
        {Object.keys(stats.jobTitleCounts).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidates by Job Title</h3>
            <div className="h-64">
              <Bar
                data={jobTitleChartData}
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

        {/* Candidates Over Time */}
        {monthlyLabels.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidates Over Time (6 Months)</h3>
            <div className="h-64">
              <Line
                data={timelineChartData}
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

      {/* Bottom Row: Top Vacancies and Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vacancies by Candidates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Vacancies</h3>
            <Briefcase className="w-5 h-5 text-gray-400" />
          </div>
          {stats.topVacancies.length > 0 ? (
            <div className="space-y-3">
              {stats.topVacancies.map((vacancy, index) => (
                <div
                  key={vacancy.VacancyID}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-[#800000] text-white rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{vacancy.VacancyName}</p>
                      <p className="text-xs text-gray-500">{vacancy.JobTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {vacancy.candidateCount} candidate{vacancy.candidateCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Candidates</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          {stats.recentCandidates.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentCandidates.map((candidate) => (
                <div
                  key={candidate.CandidateID}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{candidate.FullName}</p>
                      <p className="text-xs text-gray-500">{candidate.Vacancy?.VacancyName || 'No vacancy'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      candidate.Status === 'Hired' ? 'bg-green-100 text-green-800' :
                      candidate.Status === 'InterviewScheduled' ? 'bg-blue-100 text-blue-800' :
                      candidate.Status === 'Shortlisted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {formatStatus(candidate.Status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{candidate.Email}</span>
                    <span className="text-xs text-gray-500">{formatDate(candidate.DateApplied)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No recent candidates</p>
          )}
        </div>
      </div>
    </div>
  );
};

