'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Sparkles, 
  TrendingUp, 
  BookOpen, 
  AlertTriangle, 
  Loader2,
  Users,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import type { DashboardInsights } from '@/types/aiAgent';

interface AIDashboardProps {
  userId?: string;
}

export function AIDashboard({ userId }: AIDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/dashboard-insights');
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
        <span className="ml-2 text-gray-600">Loading AI insights...</span>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No insights available</p>
        <button
          onClick={fetchInsights}
          className="mt-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#800000]" />
          <h2 className="text-2xl font-bold text-gray-900">AI Insights Dashboard</h2>
        </div>
        <button
          onClick={fetchInsights}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Candidates Screened */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-5 h-5 text-[#800000]" />
            <span className="text-xs text-gray-500">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{insights.candidatesScreened.today}</p>
          <p className="text-sm text-gray-600 mt-1">Candidates Screened</p>
          <div className="mt-2 text-xs text-gray-500">
            {insights.candidatesScreened.thisWeek} this week • {insights.candidatesScreened.thisMonth} this month
          </div>
        </div>

        {/* Promotion Ready */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{insights.promotionReady.count}</p>
          <p className="text-sm text-gray-600 mt-1">Promotion Ready Employees</p>
        </div>

        {/* Training Needs */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="text-xs text-red-600 font-semibold">
              {insights.trainingNeeds.highPriority} High Priority
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{insights.trainingNeeds.total}</p>
          <p className="text-sm text-gray-600 mt-1">Training Needs Identified</p>
        </div>

        {/* High Risk Employees */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-xs text-red-600 font-semibold">Alert</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{insights.highRiskEmployees.count}</p>
          <p className="text-sm text-gray-600 mt-1">High Risk Employees</p>
        </div>
      </div>

      {/* Promotion Ready Employees */}
      {insights.promotionReady.employees.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#800000]" />
            <h3 className="text-lg font-semibold text-gray-900">Promotion Ready Employees</h3>
          </div>
          <div className="space-y-2">
            {insights.promotionReady.employees.slice(0, 5).map((emp, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500">Employee ID: {emp.employeeId}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#800000]">{emp.score}/100</p>
                  <p className="text-xs text-gray-500">Eligibility Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Risk Employees */}
      {insights.highRiskEmployees.employees.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">High Risk Employees</h3>
          </div>
          <div className="space-y-2">
            {insights.highRiskEmployees.employees.map((emp, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  emp.riskLevel === 'Critical' || emp.riskLevel === 'High'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500">Employee ID: {emp.employeeId}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    emp.riskLevel === 'Critical' || emp.riskLevel === 'High'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`}>
                    {emp.riskScore}/100
                  </p>
                  <p className="text-xs text-gray-500">{emp.riskLevel} Risk</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Needs by Department */}
      {Object.keys(insights.trainingNeeds.byDepartment).length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#800000]" />
            <h3 className="text-lg font-semibold text-gray-900">Training Needs by Department</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(insights.trainingNeeds.byDepartment).map(([dept, count], i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="font-medium text-gray-900">{dept}</span>
                <span className="px-3 py-1 bg-[#800000] text-white rounded-full text-sm font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Recommendations */}
      {insights.recentRecommendations.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#800000]" />
            <h3 className="text-lg font-semibold text-gray-900">Recent AI Recommendations</h3>
          </div>
          <div className="space-y-2">
            {insights.recentRecommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{rec.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(rec.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

