'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Shield, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import type { DisciplinaryRiskResult } from '@/types/aiAgent';

interface AIDisciplinaryAlertsProps {
  employeeId: string;
  employeeName?: string;
  onAction?: (action: string) => void;
}

export function AIDisciplinaryAlerts({
  employeeId,
  employeeName,
  onAction,
}: AIDisciplinaryAlertsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DisciplinaryRiskResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const analyzeRisk = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/disciplinary-risk', {
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
      toast.success('Risk analysis completed');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze disciplinary risk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-analyze on mount
    analyzeRisk();
  }, [employeeId]);

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical':
      case 'High':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'Low':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="border rounded-lg p-3 md:p-4 bg-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 md:w-5 md:h-5 text-[#800000]" />
          <h3 className="font-semibold text-gray-900 text-sm md:text-base">Disciplinary Risk Analysis</h3>
          {employeeName && (
            <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">- {employeeName}</span>
          )}
        </div>
        <button
          onClick={analyzeRisk}
          disabled={loading}
          className="w-full sm:w-auto px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
          )}
          Refresh
        </button>
      </div>

      {loading && !result && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-[#800000]" />
          <span className="ml-2 text-xs md:text-sm text-gray-600">Analyzing risk...</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Risk Score and Level */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-2">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Risk Score</p>
                <p className="text-2xl md:text-3xl font-bold text-[#800000]">
                  {result.riskScore}/100
                </p>
              </div>
              <div
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg border flex items-center gap-2 text-xs md:text-sm ${getRiskLevelColor(
                  result.riskLevel
                )}`}
              >
                {getRiskLevelIcon(result.riskLevel)}
                <span className="font-semibold">
                  {result.riskLevel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Recommended Action (if high risk) */}
          {(result.riskLevel === 'High' || result.riskLevel === 'Critical') && result.recommendedAction && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start gap-2 md:gap-3">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-red-800 mb-1 text-sm md:text-base">Recommended Action</h4>
                  <p className="text-xs md:text-sm text-red-700 leading-relaxed">{result.recommendedAction}</p>
                  {onAction && (
                    <button
                      onClick={() => onAction(result.recommendedAction)}
                      className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded text-xs md:text-sm hover:bg-red-700 transition-colors shadow-sm font-medium w-full sm:w-auto"
                    >
                      Take Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs md:text-sm text-[#800000] hover:underline"
          >
            {showDetails ? 'Hide' : 'Show'} Detailed Analysis
          </button>

          {showDetails && (
            <div className="space-y-4 border-t pt-4">
              {/* Risk Factors */}
              {result.riskFactors && result.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Factors
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-700">
                    {result.riskFactors.map((factor, i) => (
                      <li key={i}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pattern Analysis */}
              {result.patternAnalysis && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">Pattern Analysis</h4>
                  <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 md:p-3 rounded">
                    {result.patternAnalysis}
                  </p>
                </div>
              )}

              {/* Recommended Action (full details) */}
              {result.recommendedAction && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">Recommended Action Details</h4>
                  <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 md:p-3 rounded">
                    {result.recommendedAction}
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

