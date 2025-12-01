'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Sparkles, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { CandidateScreeningResult } from '@/types/aiAgent';

interface AICandidateScreeningProps {
  candidateId: number;
  vacancyId: number;
  candidateName?: string;
  onComplete?: (result: CandidateScreeningResult) => void;
}

export function AICandidateScreening({
  candidateId,
  vacancyId,
  candidateName,
  onComplete,
}: AICandidateScreeningProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CandidateScreeningResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleScreen = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/candidate-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, vacancyId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Screening failed');
      }

      const data = await response.json();
      setResult(data);
      onComplete?.(data);
      toast.success('Candidate screened successfully');
    } catch (error) {
      console.error('Screening error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to screen candidate');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'StrongRecommend':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Recommend':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Consider':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Reject':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'NeedsReview':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'StrongRecommend':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'Recommend':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'Consider':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'Reject':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatRecommendation = (recommendation: string) => {
    return recommendation
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#800000]" />
          <h3 className="font-semibold text-gray-900">AI Candidate Screening</h3>
          {candidateName && (
            <span className="text-sm text-gray-500">- {candidateName}</span>
          )}
        </div>
        <button
          onClick={handleScreen}
          disabled={loading}
          className="px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Screening...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Run AI Screening
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          {/* Overall Score and Recommendation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600">Overall Score</p>
                <p className="text-3xl font-bold text-[#800000]">
                  {result.overallScore}/100
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${getRecommendationColor(
                  result.recommendation
                )}`}
              >
                {getRecommendationIcon(result.recommendation)}
                <span className="font-semibold">
                  {formatRecommendation(result.recommendation)}
                </span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div>
                <p className="text-xs text-gray-500">Resume</p>
                <p className="text-lg font-semibold">{result.resumeScore}/100</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Qualifications</p>
                <p className="text-lg font-semibold">{result.qualificationScore}/100</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Experience</p>
                <p className="text-lg font-semibold">{result.experienceScore}/100</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Skills</p>
                <p className="text-lg font-semibold">{result.skillMatchScore}/100</p>
              </div>
            </div>
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-[#800000] hover:underline flex items-center gap-1"
          >
            {showDetails ? 'Hide' : 'Show'} Detailed Analysis
          </button>

          {showDetails && (
            <div className="space-y-4 border-t pt-4">
              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {result.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Weaknesses
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {result.weaknesses.map((weakness, i) => (
                      <li key={i}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Qualifications */}
              {result.missingQualifications && result.missingQualifications.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Missing Qualifications
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {result.missingQualifications.map((qual, i) => (
                      <li key={i}>{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Interview Questions */}
              {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">Suggested Interview Questions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    {result.suggestedQuestions.map((question, i) => (
                      <li key={i} className="pl-2">{question}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Risk Factors */}
              {result.riskFactors && result.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2">Risk Factors</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {result.riskFactors.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Analysis */}
              {result.aiAnalysis && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">AI Analysis</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {result.aiAnalysis}
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

