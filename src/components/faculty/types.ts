export interface Faculty {
  FacultyID: number;
  UserID: string;
  Position: string;
  DepartmentID: number;
  EmploymentStatus: string;
  ResignationDate: string | null;
  Phone: string | null;
  Address: string | null;
  HireDate: string | null;
  DateOfBirth: string | null;
  Gender: 'Male' | 'Female' | 'Other' | null;
  MaritalStatus: string | null;
  Nationality: string | null;
  EmergencyContact: string | null;
  User: {
    UserID: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Status: string;
    Photo: string;
    isDeleted: string;
  };
  Department: {
    DepartmentID: number;
    DepartmentName: string;
  };
}

export interface NewFaculty {
  FirstName: string;
  LastName: string;
  Email: string;
  Position: string;
  DepartmentId: number;
  EmploymentStatus: string;
  HireDate: string;
  DateOfBirth: string;
  Phone: string | null;
  Address: string | null;
  Photo: string;
}

export interface Notification {
  type: 'success' | 'error';
  message: string;
}

export interface DocumentFacultyRow {
  DocumentID: number;
  FacultyID: number;
  DocumentTypeID: number;
  UploadDate: string;
  SubmissionStatus: string;
  file?: string;
  facultyName: string;
  documentTypeName: string;
  FilePath?: string;
  FileUrl?: string;
  DownloadUrl?: string;
  Faculty: {
    User: {
      FirstName: string;
      LastName: string;
      Email: string;
    };
  };
  DocumentType: {
    DocumentTypeID: number;
    DocumentTypeName: string;
  };
}

export interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
  AllowedFileTypes: string[] | null;
  Template: string | null;
}

export interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

