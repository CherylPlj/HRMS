'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { TrendingUp, CheckCircle, AlertCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import type { PromotionAnalysisResult } from '@/types/aiAgent';

interface AIPromotionRecommendationsProps {
  employeeId: string;
  employeeName?: string;
  onRefresh?: () => void;
}

export function AIPromotionRecommendations({
  employeeId,
  employeeName,
  onRefresh,
}: AIPromotionRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromotionAnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzePromotion = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/promotion-analysis', {
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
      toast.success('Promotion analysis completed');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze promotion eligibility');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-analyze on mount
    analyzePromotion();
  }, [employeeId]);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Ready':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Consider':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'NeedsDevelopment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'NotReady':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'Ready':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Consider':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'NeedsDevelopment':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'NotReady':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="border rounded-lg p-3 md:p-4 bg-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#800000]" />
          <h3 className="font-semibold text-gray-900 text-sm md:text-base">Promotion Eligibility Analysis</h3>
          {employeeName && (
            <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">- {employeeName}</span>
          )}
        </div>
        <button
          onClick={analyzePromotion}
          disabled={loading}
          className="w-full sm:w-auto px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
          )}
          Refresh
        </button>
      </div>

      {loading && !result && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-[#800000]" />
          <span className="ml-2 text-xs md:text-sm text-gray-600">Analyzing promotion eligibility...</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Eligibility Score and Recommendation */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-2">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Eligibility Score</p>
                <p className="text-2xl md:text-3xl font-bold text-[#800000]">
                  {result.eligibilityScore}/100
                </p>
              </div>
              <div
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg border flex items-center gap-2 text-xs md:text-sm ${getRecommendationColor(
                  result.recommendation
                )}`}
              >
                {getRecommendationIcon(result.recommendation)}
                <span className="font-semibold">
                  {result.recommendation.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs md:text-sm text-[#800000] hover:underline"
          >
            {showDetails ? 'Hide' : 'Show'} Detailed Analysis
          </button>

          {showDetails && (
            <div className="space-y-4 border-t pt-4">
              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-700">
                    {result.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Development Areas */}
              {result.developmentAreas && result.developmentAreas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Development Areas
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-700">
                    {result.developmentAreas.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {result.nextSteps && result.nextSteps.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2 text-sm">Next Steps</h4>
                  <ol className="list-decimal list-inside space-y-2 text-xs md:text-sm text-gray-700">
                    {result.nextSteps.map((step, i) => (
                      <li key={i} className="pl-2">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Analysis */}
              {result.analysis && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">Analysis</h4>
                  <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 md:p-3 rounded">
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

