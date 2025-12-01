export interface Vacancy {
  VacancyID: number;
  JobTitle: 'HR_Manager' | 'Faculty' | 'Registrar' | 'Cashier' | 'Other';
  VacancyName: string;
  Description?: string;
  HiringManager: string;
  Status: 'Active' | 'Inactive' | 'Filled' | 'Cancelled';
  DateCreated: string;
  DatePosted?: string;
  NumberOfPositions: number;
  _count?: {
    Candidates: number;
  }
}

export interface Candidate {
  CandidateID: number;
  VacancyID: number;
  LastName: string;
  FirstName: string;
  MiddleName?: string;
  ExtensionName?: string;
  FullName: string;
  Email: string;
  ContactNumber?: string;
  Sex?: string;
  DateOfBirth?: string;
  Phone?: string;
  DateApplied: string;
  InterviewDate?: string;
  Status: string;
  Resume?: string;
  ResumeUrl?: string;
  Vacancy?: Vacancy;
}

