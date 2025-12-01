'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BookOpen, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import type { TrainingNeedsResult } from '@/types/aiAgent';

interface AITrainingRecommendationsProps {
  employeeId: string;
  employeeName?: string;
  onApprove?: (trainingTitle: string) => void;
}

export function AITrainingRecommendations({
  employeeId,
  employeeName,
  onApprove,
}: AITrainingRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrainingNeedsResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeTraining = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/training-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      toast.success('Training needs analysis completed');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze training needs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-analyze on mount
    analyzeTraining();
  }, [employeeId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#800000]" />
          <h3 className="font-semibold text-gray-900">Training Needs Analysis</h3>
          {employeeName && (
            <span className="text-sm text-gray-500">- {employeeName}</span>
          )}
        </div>
        <button
          onClick={analyzeTraining}
          disabled={loading}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {loading && !result && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#800000]" />
          <span className="ml-2 text-gray-600">Analyzing training needs...</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Skill Gaps Identified</p>
                <p className="text-2xl font-bold text-[#800000]">
                  {result.skillGaps?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Training Recommendations</p>
                <p className="text-2xl font-bold text-[#800000]">
                  {result.trainingRecommendations?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-[#800000] hover:underline"
          >
            {showDetails ? 'Hide' : 'Show'} Detailed Analysis
          </button>

          {showDetails && (
            <div className="space-y-4 border-t pt-4">
              {/* Skill Gaps */}
              {result.skillGaps && result.skillGaps.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Skill Gaps</h4>
                  <div className="space-y-3">
                    {result.skillGaps.map((gap, i) => (
                      <div
                        key={i}
                        className="border rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{gap.skill}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(
                              gap.priority
                            )}`}
                          >
                            {gap.priority}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Current: {gap.currentLevel}</span>
                          <span className="mx-2">→</span>
                          <span>Required: {gap.requiredLevel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Recommendations */}
              {result.trainingRecommendations && result.trainingRecommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Training Recommendations</h4>
                  <div className="space-y-3">
                    {result.trainingRecommendations.map((training, i) => (
                      <div
                        key={i}
                        className="border rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">{training.title}</h5>
                            {training.description && (
                              <p className="text-sm text-gray-600 mt-1">{training.description}</p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold border ml-2 ${getPriorityColor(
                              training.priority
                            )}`}
                          >
                            {training.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-sm text-gray-600">
                            <span>Estimated Hours: {training.estimatedHours}</span>
                          </div>
                          {onApprove && (
                            <button
                              onClick={() => onApprove(training.title)}
                              className="px-3 py-1.5 bg-[#800000] text-white rounded text-sm hover:bg-[#600000] transition-colors"
                            >
                              Approve Training
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis */}
              {result.analysis && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Analysis</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {result.analysis}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

