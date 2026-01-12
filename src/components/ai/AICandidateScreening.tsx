'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Sparkles, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [result, setResult] = useState<CandidateScreeningResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isExistingScreening, setIsExistingScreening] = useState(false);
  const hasFetchedRef = useRef(false);

  // Check for existing screening on mount (only once)
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasFetchedRef.current) {
      return;
    }

    const fetchExistingScreening = async () => {
      hasFetchedRef.current = true;
      try {
        const response = await fetch(
          `/api/ai/candidate-screening?candidateId=${candidateId}&vacancyId=${vacancyId}`
        );

        if (response.ok) {
          const data = await response.json();
          setResult(data);
          setIsExistingScreening(true);
          toast.success('Loaded existing screening results');
        } else if (response.status !== 404) {
          // 404 is expected if no screening exists, other errors should be logged
          console.error('Error fetching existing screening:', response.statusText);
        }
        // 404 is silently handled - it means no screening exists yet
      } catch (error) {
        console.error('Error fetching existing screening:', error);
      } finally {
        setCheckingExisting(false);
      }
    };

    fetchExistingScreening();
  }, [candidateId, vacancyId]);

  const handleScreen = async (isReScreen = false) => {
    setLoading(true);
    setIsExistingScreening(false);
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
      setIsExistingScreening(false);
      onComplete?.(data);
      toast.success(isReScreen ? 'Candidate re-screened successfully' : 'Candidate screened successfully');
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

  if (checkingExisting) {
    return (
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#800000]" />
          <span className="ml-2 text-gray-600">Checking for existing screening...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 md:p-4 bg-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#800000] shrink-0" />
          <h3 className="font-semibold text-gray-900 text-sm md:text-base truncate">AI Candidate Screening</h3>
          {candidateName && (
            <span className="text-xs md:text-sm text-gray-500 hidden sm:inline">- {candidateName}</span>
          )}
          {isExistingScreening && (
            <span className="text-[10px] md:text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded shrink-0">
              Existing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {result && isExistingScreening && (
            <button
              onClick={() => handleScreen(true)}
              disabled={loading}
              className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-2 transition-colors text-xs md:text-sm"
              title="Re-screen candidate"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                  <span className="hidden xs:inline">Re-screening...</span>
                  <span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Re-screen
                </>
              )}
            </button>
          )}
          {!result && (
            <button
              onClick={() => handleScreen(false)}
              disabled={loading}
              className="flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 bg-[#800000] text-white rounded hover:bg-[#600000] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-2 transition-colors text-xs md:text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                  <span className="hidden xs:inline">Screening...</span>
                  <span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Run AI Screening
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          {/* Screening timestamp for existing screenings */}
          {isExistingScreening && (result as any).screenedAt && (
            <div className="text-[10px] md:text-xs text-gray-500 bg-blue-50 px-2 md:px-3 py-1.5 md:py-2 rounded border border-blue-200">
              <span className="font-medium">Screened on:</span>{' '}
              {new Date((result as any).screenedAt).toLocaleString()}
            </div>
          )}
          
          {/* Overall Score and Recommendation */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-2">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Overall Score</p>
                <p className="text-2xl md:text-3xl font-bold text-[#800000]">
                  {result.overallScore}/100
                </p>
              </div>
              <div
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg border flex items-center gap-2 text-xs md:text-sm ${getRecommendationColor(
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider font-medium">Resume</p>
                <p className="text-base md:text-lg font-semibold">{result.resumeScore}/100</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider font-medium">Qualifications</p>
                <p className="text-base md:text-lg font-semibold">{result.qualificationScore}/100</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider font-medium">Experience</p>
                <p className="text-base md:text-lg font-semibold">{result.experienceScore}/100</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider font-medium">Skills</p>
                <p className="text-base md:text-lg font-semibold">{result.skillMatchScore}/100</p>
              </div>
            </div>
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs md:text-sm text-[#800000] hover:underline flex items-center gap-1"
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

              {/* Weaknesses */}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2 text-sm">
                    <XCircle className="w-4 h-4" />
                    Weaknesses
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-700">
                    {result.weaknesses.map((weakness, i) => (
                      <li key={i}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Qualifications */}
              {result.missingQualifications && result.missingQualifications.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Missing Qualifications
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-700">
                    {result.missingQualifications.map((qual, i) => (
                      <li key={i}>{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Interview Questions */}
              {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2 text-sm">Suggested Interview Questions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-xs md:text-sm text-gray-700">
                    {result.suggestedQuestions.map((question, i) => (
                      <li key={i} className="pl-2">{question}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Risk Factors */}
              {result.riskFactors && result.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-2 text-sm">Risk Factors</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-700">
                    {result.riskFactors.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Analysis */}
              {result.aiAnalysis && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">AI Analysis</h4>
                  <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-2 md:p-3 rounded">
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

