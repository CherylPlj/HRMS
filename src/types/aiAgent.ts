/**
 * Type definitions for AI Agent features
 */

export interface CandidateScreeningResult {
  overallScore: number;
  resumeScore: number;
  qualificationScore: number;
  experienceScore: number;
  skillMatchScore: number;
  recommendation: 'StrongRecommend' | 'Recommend' | 'Consider' | 'Reject' | 'NeedsReview';
  strengths: string[];
  weaknesses: string[];
  missingQualifications: string[];
  suggestedQuestions: string[];
  riskFactors: string[];
  aiAnalysis: string;
}

export interface PromotionAnalysisResult {
  eligibilityScore: number;
  recommendation: 'Ready' | 'Consider' | 'NeedsDevelopment' | 'NotReady';
  strengths: string[];
  developmentAreas: string[];
  nextSteps: string[];
  analysis: string;
}

export interface TrainingNeedsResult {
  skillGaps: Array<{
    skill: string;
    currentLevel: string;
    requiredLevel: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
  }>;
  trainingRecommendations: Array<{
    title: string;
    description: string;
    estimatedHours: number;
    priority: string;
  }>;
  analysis: string;
}

export interface DisciplinaryRiskResult {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskFactors: string[];
  patternAnalysis: string;
  recommendedAction: string;
}

export type ReportType = 
  | 'training-needs'
  | 'promotion-readiness'
  | 'disciplinary-risk'
  | 'recruitment-quality';

export interface ReportFilters {
  departmentId?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
}

export interface DashboardInsights {
  candidatesScreened: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  promotionReady: {
    count: number;
    employees: Array<{
      employeeId: string;
      name: string;
      score: number;
    }>;
  };
  trainingNeeds: {
    total: number;
    highPriority: number;
    byDepartment: Record<string, number>;
  };
  highRiskEmployees: {
    count: number;
    employees: Array<{
      employeeId: string;
      name: string;
      riskLevel: string;
      riskScore: number;
    }>;
  };
  recentRecommendations: Array<{
    type: string;
    employeeId?: string;
    candidateId?: number;
    message: string;
    timestamp: Date;
  }>;
}

