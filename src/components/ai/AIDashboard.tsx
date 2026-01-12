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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* <Sparkles className="w-6 h-6 text-[#800000]" /> */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">AI Insights</h2>
        </div>
        <button
          onClick={fetchInsights}
          className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
        >
          <Loader2 className={`w-3.5 h-3.5 md:w-4 md:h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Candidates Screened */}
        <div className="bg-white border rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#800000]" />
            <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Today</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{insights.candidatesScreened.today}</p>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Candidates Screened</p>
          <div className="mt-2 text-[10px] md:text-xs text-gray-400">
            {insights.candidatesScreened.thisWeek} this week • {insights.candidatesScreened.thisMonth} this month
          </div>
        </div>

        {/* Training Needs */}
        <div className="bg-white border rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            <span className="text-[10px] md:text-xs text-red-600 font-semibold uppercase tracking-wider">
              {insights.trainingNeeds.highPriority} High Priority
            </span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{insights.trainingNeeds.total}</p>
          <p className="text-xs md:text-sm text-gray-600 mt-1">Training Needs Identified</p>
        </div>
      </div>

      {/* Grid for charts and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Training Needs by Department */}
        {Object.keys(insights.trainingNeeds.byDepartment).length > 0 && (
          <div className="bg-white border rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-[#800000]" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Needs by Department</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(insights.trainingNeeds.byDepartment).map(([dept, count], i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 md:p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-xs md:text-sm font-medium text-gray-900 truncate pr-2">{dept}</span>
                  <span className="px-2.5 py-0.5 bg-[#800000] text-white rounded-full text-[10px] md:text-xs font-semibold shrink-0">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Recommendations */}
        {insights.recentRecommendations.length > 0 && (
          <div className="bg-white border rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#800000]" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Recent AI Recommendations</h3>
            </div>
            <div className="space-y-2">
              {insights.recentRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 md:p-3 bg-gray-50 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-gray-900 line-clamp-2">{rec.message}</p>
                    <p className="text-[10px] md:text-xs text-gray-400 mt-1">
                      {new Date(rec.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

