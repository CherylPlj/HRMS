/**
 * API service functions for performance module
 */

export interface PerformanceReviewResponse {
  id: string;
  employeeId: string;
  reviewerId: string;
  period?: string | null;
  startDate: string;
  endDate: string;
  kpiScore?: number | null;
  behaviorScore?: number | null;
  attendanceScore?: number | null;
  totalScore?: number | null;
  status: 'draft' | 'pending' | 'completed' | 'approved';
  remarks?: string | null;
  employeeComments?: string | null;
  goals?: any;
  achievements?: any;
  improvementAreas?: any;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  employee: {
    EmployeeID: string;
    FirstName: string;
    LastName: string;
    MiddleName?: string | null;
    Department?: string | null;
    Position?: string | null;
  };
  reviewer: {
    UserID: string;
    FirstName: string;
    LastName: string;
  };
  performanceGoals?: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
  }>;
}

export interface PerformanceReviewsResponse {
  reviews: PerformanceReviewResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface KPIResponse {
  id: string;
  name: string;
  description: string;
  category: 'kpi' | 'behavior' | 'attendance' | 'other';
  weight: number;
  maxScore: number;
  minScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KPIsResponse {
  kpis: KPIResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummaryResponse {
  averageKpiScore: number;
  averageTotalScore: number;
  totalReviews: number;
  completedReviews: number;
  employeesUpForPromotion: number;
  employeesNeedingTraining: number;
  topPerformers: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    department: string;
    position: string;
    totalScore: number;
    kpiScore: number;
    behaviorScore: number;
    attendanceScore: number;
    period?: string;
  }>;
  employeesNeedingImprovement: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    department: string;
    position: string;
    totalScore: number;
    kpiScore: number;
    behaviorScore: number;
    attendanceScore: number;
    improvementAreas: string[];
  }>;
}

/**
 * Transform backend response to frontend format
 */
export function transformPerformanceReview(review: PerformanceReviewResponse) {
  return {
    id: review.id,
    employeeId: review.employeeId,
    employeeName: `${review.employee.FirstName} ${review.employee.MiddleName || ''} ${review.employee.LastName}`.trim(),
    reviewerId: review.reviewerId,
    reviewerName: `${review.reviewer.FirstName} ${review.reviewer.LastName}`,
    period: review.period || '',
    startDate: review.startDate,
    endDate: review.endDate,
    kpiScore: review.kpiScore ? Number(review.kpiScore) : 0,
    behaviorScore: review.behaviorScore ? Number(review.behaviorScore) : 0,
    attendanceScore: review.attendanceScore ? Number(review.attendanceScore) : 0,
    totalScore: review.totalScore ? Number(review.totalScore) : 0,
    status: review.status,
    remarks: review.remarks || '',
    employeeComments: review.employeeComments || '',
    goals: review.goals,
    achievements: review.achievements,
    improvementAreas: review.improvementAreas,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

/**
 * Transform KPI response to frontend format
 */
export function transformKPI(kpi: KPIResponse) {
  return {
    id: kpi.id,
    name: kpi.name,
    description: kpi.description,
    category: kpi.category,
    weight: Number(kpi.weight),
    maxScore: Number(kpi.maxScore),
    minScore: Number(kpi.minScore),
    isActive: kpi.isActive,
    createdAt: kpi.createdAt,
    updatedAt: kpi.updatedAt,
  };
}

/**
 * Fetch performance reviews with filters
 */
export async function fetchPerformanceReviews(filters: {
  page?: number;
  limit?: number;
  employeeId?: string;
  reviewerId?: string;
  status?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  period?: string;
  search?: string;
}): Promise<PerformanceReviewsResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.employeeId) params.append('employeeId', filters.employeeId);
  if (filters.reviewerId) params.append('reviewerId', filters.reviewerId);
  if (filters.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
  if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
  if (filters.endDateFrom) params.append('endDateFrom', filters.endDateFrom);
  if (filters.endDateTo) params.append('endDateTo', filters.endDateTo);
  if (filters.period) params.append('period', filters.period);
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/performance/reviews?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch reviews' }));
    throw new Error(error.error || 'Failed to fetch performance reviews');
  }

  return response.json();
}

/**
 * Fetch a single performance review by ID
 */
export async function fetchPerformanceReview(id: string) {
  const response = await fetch(`/api/performance/reviews/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch review' }));
    throw new Error(error.error || 'Failed to fetch performance review');
  }

  const data = await response.json();
  return transformPerformanceReview(data);
}

/**
 * Create a new performance review
 */
export async function createPerformanceReview(data: {
  employeeId: string;
  reviewerId: string;
  period?: string;
  startDate: string;
  endDate: string;
  kpiScore?: number;
  behaviorScore?: number;
  attendanceScore?: number;
  totalScore?: number;
  status?: 'draft' | 'pending' | 'completed' | 'approved';
  remarks?: string;
  employeeComments?: string;
  goals?: any;
  achievements?: any;
  improvementAreas?: any;
}) {
  const response = await fetch('/api/performance/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create review' }));
    throw new Error(error.error || 'Failed to create performance review');
  }

  const review = await response.json();
  return transformPerformanceReview(review);
}

/**
 * Update a performance review
 */
export async function updatePerformanceReview(
  id: string,
  data: Partial<{
    reviewerId: string;
    period: string;
    startDate: string;
    endDate: string;
    kpiScore: number;
    behaviorScore: number;
    attendanceScore: number;
    totalScore: number;
    status: 'draft' | 'pending' | 'completed' | 'approved';
    remarks: string;
    employeeComments: string;
    goals: any;
    achievements: any;
    improvementAreas: any;
    reviewedAt: string;
    approvedAt: string;
  }>
) {
  const response = await fetch(`/api/performance/reviews/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update review' }));
    throw new Error(error.error || 'Failed to update performance review');
  }

  const review = await response.json();
  return transformPerformanceReview(review);
}

/**
 * Delete a performance review
 */
export async function deletePerformanceReview(id: string) {
  const response = await fetch(`/api/performance/reviews/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete review' }));
    throw new Error(error.error || 'Failed to delete performance review');
  }

  return response.json();
}

/**
 * Fetch KPIs with filters
 */
export async function fetchKPIs(filters: {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}): Promise<KPIsResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/performance/kpis?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch KPIs' }));
    throw new Error(error.error || 'Failed to fetch KPIs');
  }

  return response.json();
}

/**
 * Fetch a single KPI by ID
 */
export async function fetchKPI(id: string) {
  const response = await fetch(`/api/performance/kpis/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch KPI' }));
    throw new Error(error.error || 'Failed to fetch KPI');
  }

  const data = await response.json();
  return transformKPI(data);
}

/**
 * Create a new KPI
 */
export async function createKPI(data: {
  name: string;
  description: string;
  category: 'kpi' | 'behavior' | 'attendance' | 'other';
  weight: number;
  maxScore: number;
  minScore?: number;
  isActive?: boolean;
}) {
  const response = await fetch('/api/performance/kpis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create KPI' }));
    throw new Error(error.error || 'Failed to create KPI');
  }

  const kpi = await response.json();
  return transformKPI(kpi);
}

/**
 * Update a KPI
 */
export async function updateKPI(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    category: 'kpi' | 'behavior' | 'attendance' | 'other';
    weight: number;
    maxScore: number;
    minScore: number;
    isActive: boolean;
  }>
) {
  const response = await fetch(`/api/performance/kpis/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update KPI' }));
    throw new Error(error.error || 'Failed to update KPI');
  }

  const kpi = await response.json();
  return transformKPI(kpi);
}

/**
 * Delete a KPI
 */
export async function deleteKPI(id: string) {
  const response = await fetch(`/api/performance/kpis/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete KPI' }));
    throw new Error(error.error || 'Failed to delete KPI');
  }

  return response.json();
}

/**
 * Fetch dashboard summary statistics
 */
export async function fetchDashboardSummary(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DashboardSummaryResponse> {
  const params = new URLSearchParams();
  if (filters?.employeeId) params.append('employeeId', filters.employeeId);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(`/api/performance/dashboard?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch statistics' }));
    throw new Error(error.error || 'Failed to fetch dashboard summary');
  }

  return response.json();
}

/**
 * Fetch employee performance history
 */
export async function fetchEmployeePerformanceHistory(employeeId: string) {
  const response = await fetch(`/api/performance/employee/${employeeId}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch history' }));
    throw new Error(error.error || 'Failed to fetch employee performance history');
  }

  const data = await response.json();
  return {
    ...data,
    reviews: data.reviews.map((review: PerformanceReviewResponse) => transformPerformanceReview(review)),
  };
}

