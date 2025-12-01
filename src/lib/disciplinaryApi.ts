/**
 * API service functions for disciplinary actions module
 */

export interface DisciplinaryRecordResponse {
  id: string;
  caseNo: string;
  dateTime: string;
  category: string;
  violation: string;
  severity: 'Minor' | 'Moderate' | 'Major';
  status: 'Ongoing' | 'For_Review' | 'Resolved' | 'Closed';
  resolution?: string | null;
  resolutionDate?: string | null;
  remarks?: string | null;
  interviewNotes?: string | null;
  hrRemarks?: string | null;
  recommendedPenalty?: string | null;
  digitalAcknowledgment: boolean;
  acknowledgedAt?: string | null;
  offenseCount: number;
  createdAt: string;
  updatedAt: string;
  employee: {
    EmployeeID: string;
    FirstName: string;
    LastName: string;
    MiddleName?: string | null;
  };
  supervisor?: {
    UserID: string;
    FirstName: string;
    LastName: string;
  } | null;
  evidence: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  actions?: Array<{
    id: string;
    actionType: string;
    status: string;
    effectiveDate: string;
    endDate?: string | null;
  }>;
}

export interface DisciplinaryRecordsResponse {
  records: DisciplinaryRecordResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface DashboardStatistics {
  totalRecords: number;
  statusBreakdown: {
    ongoing: number;
    forReview: number;
    resolved: number;
    closed: number;
  };
  severityBreakdown: {
    minor: number;
    moderate: number;
    major: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
  recentRecords: number;
}

/**
 * Convert Supabase evidence URL to proxy URL for proper encoding
 */
export function getEvidenceProxyUrl(fileUrl: string): string {
  if (!fileUrl || !fileUrl.includes('supabase.co')) {
    return fileUrl;
  }

  try {
    // Extract file path from Supabase URL
    // Format: https://[project].supabase.co/storage/v1/object/public/disciplinary-evidence/[path]
    const urlMatch = fileUrl.match(/\/disciplinary-evidence\/(.+)$/);
    if (urlMatch && urlMatch[1]) {
      const filePath = urlMatch[1];
      // Use proxy endpoint with properly encoded path
      return `/api/disciplinary/evidence/${encodeURIComponent(filePath)}`;
    }
  } catch (error) {
    console.error('Error converting evidence URL to proxy URL:', error);
  }

  // Fallback to original URL
  return fileUrl;
}

/**
 * Transform backend response to frontend format
 */
export function transformDisciplinaryRecord(record: DisciplinaryRecordResponse) {
  return {
    id: record.id,
    caseNo: record.caseNo,
    dateTime: record.dateTime,
    category: record.category,
    violation: record.violation,
    employee: `${record.employee.FirstName} ${record.employee.MiddleName || ''} ${record.employee.LastName}`.trim(),
    employeeId: record.employee.EmployeeID,
    severity: record.severity,
    status: record.status === 'For_Review' ? 'For Review' : record.status,
    evidence: record.evidence.map((ev) => ({
      id: ev.id,
      fileName: ev.fileName,
      fileType: ev.fileType as 'image' | 'pdf' | 'file' | 'document',
      url: getEvidenceProxyUrl(ev.fileUrl), // Use proxy URL for proper encoding
      uploadedAt: ev.uploadedAt,
    })),
    resolution: record.resolution,
    resolutionDate: record.resolutionDate,
    remarks: record.remarks,
    interviewNotes: record.interviewNotes,
    hrRemarks: record.hrRemarks,
    recommendedPenalty: record.recommendedPenalty,
    digitalAcknowledgment: record.digitalAcknowledgment,
    acknowledgedAt: record.acknowledgedAt,
    supervisor: record.supervisor
      ? `${record.supervisor.FirstName} ${record.supervisor.LastName}`
      : undefined,
    supervisorId: record.supervisor?.UserID,
    offenseCount: record.offenseCount,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Fetch disciplinary records with filters
 */
export async function fetchDisciplinaryRecords(filters: {
  page?: number;
  limit?: number;
  category?: string;
  severity?: string;
  status?: string;
  employeeId?: string;
  supervisorId?: string;
  violation?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<DisciplinaryRecordsResponse> {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.category) params.append('category', filters.category);
  if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
  if (filters.status && filters.status !== 'all') {
    // Convert frontend status to backend format
    const backendStatus = filters.status === 'For Review' ? 'For_Review' : filters.status;
    params.append('status', backendStatus);
  }
  if (filters.employeeId) params.append('employeeId', filters.employeeId);
  if (filters.supervisorId) params.append('supervisorId', filters.supervisorId);
  if (filters.violation) params.append('violation', filters.violation);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/disciplinary?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch records' }));
    throw new Error(error.error || 'Failed to fetch disciplinary records');
  }

  return response.json();
}

/**
 * Fetch a single disciplinary record by ID
 */
export async function fetchDisciplinaryRecord(id: string) {
  const response = await fetch(`/api/disciplinary/${id}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch record' }));
    throw new Error(error.error || 'Failed to fetch disciplinary record');
  }

  const data = await response.json();
  return transformDisciplinaryRecord(data);
}

/**
 * Create a new disciplinary record
 */
export async function createDisciplinaryRecord(data: {
  employeeId: string;
  supervisorId?: string;
  category: string;
  violation: string;
  severity: 'Minor' | 'Moderate' | 'Major';
  status?: 'Ongoing' | 'For_Review' | 'Resolved' | 'Closed';
  dateTime?: string;
  resolution?: string;
  resolutionDate?: string;
  remarks?: string;
  interviewNotes?: string;
  hrRemarks?: string;
  recommendedPenalty?: string;
  offenseCount?: number;
}) {
  const response = await fetch('/api/disciplinary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create record' }));
    throw new Error(error.error || 'Failed to create disciplinary record');
  }

  const record = await response.json();
  return transformDisciplinaryRecord(record);
}

/**
 * Update a disciplinary record
 */
export async function updateDisciplinaryRecord(
  id: string,
  data: Partial<{
    supervisorId: string;
    category: string;
    violation: string;
    severity: 'Minor' | 'Moderate' | 'Major';
    status: 'Ongoing' | 'For_Review' | 'Resolved' | 'Closed';
    dateTime: string;
    resolution: string;
    resolutionDate: string;
    remarks: string;
    interviewNotes: string;
    hrRemarks: string;
    recommendedPenalty: string;
    offenseCount: number;
  }>
) {
  // Convert frontend status to backend format
  const updateData: any = { ...data };
  if (updateData.status === 'For Review') {
    updateData.status = 'For_Review';
  }

  const response = await fetch(`/api/disciplinary/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update record' }));
    throw new Error(error.error || 'Failed to update disciplinary record');
  }

  const record = await response.json();
  return transformDisciplinaryRecord(record);
}

/**
 * Delete a disciplinary record
 */
export async function deleteDisciplinaryRecord(id: string) {
  const response = await fetch(`/api/disciplinary/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete record' }));
    throw new Error(error.error || 'Failed to delete disciplinary record');
  }

  return response.json();
}

/**
 * Acknowledge a disciplinary record
 */
export async function acknowledgeDisciplinaryRecord(id: string) {
  const response = await fetch(`/api/disciplinary/${id}/acknowledge`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to acknowledge record' }));
    throw new Error(error.error || 'Failed to acknowledge disciplinary record');
  }

  const record = await response.json();
  return transformDisciplinaryRecord(record);
}

/**
 * Fetch employee disciplinary history
 */
export async function fetchEmployeeDisciplinaryHistory(employeeId: string) {
  const response = await fetch(`/api/disciplinary/employee/${employeeId}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch history' }));
    throw new Error(error.error || 'Failed to fetch employee disciplinary history');
  }

  const data = await response.json();
  return {
    ...data,
    offenses: data.offenses.map((record: DisciplinaryRecordResponse) => transformDisciplinaryRecord(record)),
  };
}

/**
 * Upload evidence file
 */
export async function uploadEvidence(
  recordId: string,
  file: File,
  description?: string
) {
  const formData = new FormData();
  formData.append('file', file);
  if (description) {
    formData.append('description', description);
  }

  const response = await fetch(`/api/disciplinary/${recordId}/evidence`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to upload evidence' }));
    throw new Error(error.error || 'Failed to upload evidence');
  }

  return response.json();
}

/**
 * Delete evidence
 */
export async function deleteEvidence(evidenceId: string) {
  const response = await fetch(`/api/disciplinary/evidence/${evidenceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete evidence' }));
    throw new Error(error.error || 'Failed to delete evidence');
  }

  return response.json();
}

/**
 * Fetch dashboard statistics
 */
export async function fetchDashboardStatistics(): Promise<DashboardStatistics> {
  const response = await fetch('/api/disciplinary/dashboard');
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch statistics' }));
    throw new Error(error.error || 'Failed to fetch dashboard statistics');
  }

  return response.json();
}

/**
 * Fetch categories
 */
export async function fetchCategories(): Promise<string[]> {
  const response = await fetch('/api/disciplinary/categories');
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch categories' }));
    throw new Error(error.error || 'Failed to fetch categories');
  }

  return response.json();
}

/**
 * Fetch supervisors
 */
export async function fetchSupervisors(): Promise<Array<{ id: string; name: string; email?: string }>> {
  const response = await fetch('/api/disciplinary/supervisors');
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch supervisors' }));
    throw new Error(error.error || 'Failed to fetch supervisors');
  }

  return response.json();
}

/**
 * Fetch violation types
 */
export async function fetchViolationTypes(filters?: { category?: string; isActive?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

  const response = await fetch(`/api/disciplinary/violation-types?${params.toString()}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch violation types' }));
    throw new Error(error.error || 'Failed to fetch violation types');
  }

  const data = await response.json();
  // Transform to include category name
  return data.map((vt: any) => ({
    ...vt,
    category: vt.category?.name || vt.category || '',
  }));
}

