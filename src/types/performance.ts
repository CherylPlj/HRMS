export interface PerformanceReview {
  id: string
  employeeId: string
  employeeName: string
  reviewerId: string
  reviewerName: string
  period: string
  startDate: string
  endDate: string
  kpiScore: number
  behaviorScore: number
  attendanceScore: number
  totalScore: number
  status: 'draft' | 'pending' | 'completed' | 'approved'
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface Employee {
  id: string
  name: string
  department: string
  position: string
  email: string
}

export interface TrainingRecommendation {
  id: string
  employeeId: string
  employeeName: string
  department: string
  position: string
  recommendedTraining: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  estimatedDuration: string
}

export interface PromotionRecommendation {
  id: string
  employeeId: string
  employeeName: string
  department: string
  currentPosition: string
  currentSalaryGrade: string
  proposedPosition: string
  proposedSalaryGrade: string
  promotionReason: string
  performanceScore: number
  yearsInPosition: number
}

export interface PerformanceSummary {
  averageKpiScore: number
  employeesUpForPromotion: number
  employeesNeedingTraining: number
  totalReviewsThisQuarter: number
}

export interface TopPerformer {
  id: string
  employeeName: string
  department: string
  position: string
  totalScore: number
  kpiScore: number
  behaviorScore: number
  attendanceScore: number
}

export interface EmployeeNeedingImprovement {
  id: string
  employeeName: string
  department: string
  position: string
  totalScore: number
  kpiScore: number
  behaviorScore: number
  attendanceScore: number
  improvementAreas: string[]
}

export interface KPI {
  id: string
  name: string
  description: string
  category: 'kpi' | 'behavior' | 'attendance' | 'other'
  weight: number // Percentage weight in total score calculation
  maxScore: number
  minScore: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

