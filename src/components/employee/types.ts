// Shared types for employee components

export interface EmployeeFormState {
  EmployeeID: string;
  UserID: string;
  LastName: string;
  FirstName: string;
  MiddleName: string;
  ExtensionName: string;
  Sex: string;
  Photo: string;
  DateOfBirth: string;
  PlaceOfBirth: string;
  CivilStatus: string;
  Nationality: string;
  Religion: string;
  Email: string;
  Phone: string;
  Address: string;
  PresentAddress: string;
  PermanentAddress: string;
  
  // Government IDs
  SSSNumber: string;
  TINNumber: string;
  PhilHealthNumber: string;
  PagIbigNumber: string;
  GSISNumber: string;
  PRCLicenseNumber: string;
  PRCValidity: string;

  EmploymentStatus: string;
  HireDate: string;
  ResignationDate: string | null;
  Designation: string | null;
  Position: string;
  DepartmentID: number | null;
  ContractID: number | null;
  EmergencyContactName: string;
  EmergencyContactNumber: string;
  EmployeeType: string;
  SalaryGrade: string;
  SalaryAmount: number | null;

  Education?: Education[];
  EmploymentHistory?: EmploymentHistory[];
  MedicalInfo?: MedicalInfo;

  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Education {
  level: string;
  schoolName: string;
  course?: string;
  yearGraduated?: number;
  honors?: string;
}

export interface EmploymentHistory {
  schoolName: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  reasonForLeaving?: string;
}

export interface MedicalInfo {
  medicalNotes?: string;
  lastCheckup?: Date;
  vaccination?: string;
  allergies?: string;
}

export interface Employee {
  employeeId: string;
  id: string;
  firstName: string;
  surname: string;
  middleName: string;
  nameExtension: string;
  fullName: string;
  birthDate: string;
  birthPlace: string;
  sex: string;
  civilStatus: string;
  email: string;
  position: string;
  designation: string;
  departmentId: number;
  departmentName: string;
  photo: string;
  status: string;
  employeeType: string;
  phone: string;
  hireDate: string;
  salaryGrade: string;
  DepartmentID?: number;
  Department?: {
    DepartmentID: number;
    DepartmentName: string;
  };
  EmploymentDetail?: any;
  ContactInfo?: any;
  GovernmentID?: any;
  Family?: any[];
  Skills?: any[];
  trainings?: any[];
  MedicalInfo?: any;
  Education?: Education[];
  EmploymentHistory?: EmploymentHistory[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Department {
  id: number;
  name: string;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportColumnSection {
  title: string;
  keys: string[];
}

