export type SeverityLevel = "Minor" | "Moderate" | "Major";
export type DisciplinaryStatus = "Ongoing" | "For_Review" | "Resolved" | "Closed";
export type EvidenceFileType = "image" | "pdf" | "file" | "document";

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: EvidenceFileType;
  url: string;
  uploadedAt?: string;
}

export interface DisciplinaryRecord {
  id: string;
  caseNo: string;
  dateTime: string;
  category: string;
  violation: string;
  employee: string;
  employeeId?: string;
  severity: SeverityLevel;
  evidence: EvidenceFile[];
  status: DisciplinaryStatus;
  resolution?: string;
  resolutionDate?: string;
  remarks?: string;
  interviewNotes?: string;
  hrRemarks?: string;
  recommendedPenalty?: string;
  digitalAcknowledgment?: boolean;
  acknowledgedAt?: string;
  supervisor?: string;
  supervisorId?: string;
  createdAt?: string;
  updatedAt?: string;
  offenseCount?: number;
}

export interface EmployeeDisciplinaryHistory {
  employeeId: string;
  employeeName: string;
  totalCases: number;
  ongoingCount: number;
  pendingCount: number;
  resolvedCount: number;
  lastUpdated: string;
  offenses: DisciplinaryRecord[];
}

export interface DisciplinaryFilters {
  category?: string;
  severity?: SeverityLevel | "all";
  status?: DisciplinaryStatus | "all";
  employee?: string;
  supervisor?: string;
  violationType?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface ViolationType {
  id: string;
  name: string;
  category: string;
  defaultSeverity: SeverityLevel;
}

