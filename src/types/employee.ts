export interface MedicalInfo {
  medicalNotes?: string;
  lastCheckup?: Date;
  vaccination?: string;
  allergies?: string;

  // Disability Information
  hasDisability: boolean;
  disabilityType?: string;
  disabilityDetails?: string;
  accommodationsNeeded?: string;
  pwdIdNumber?: string;
  pwdIdValidity?: Date;
  disabilityCertification?: string;
  disabilityPercentage?: number;
  assistiveTechnology?: string;
  mobilityAids?: string;
  communicationNeeds?: string;
  workplaceModifications?: string;
  emergencyProtocol?: string;

  // Medical Information
  bloodPressure?: string;
  height?: number;
  weight?: number;
  emergencyProcedures?: string;
  primaryPhysician?: string;
  physicianContact?: string;
  healthInsuranceProvider?: string;
  healthInsuranceNumber?: string;
  healthInsuranceExpiryDate?: Date;
}

export interface GovernmentIDs {
  SSSNumber?: string;
  TINNumber?: string;
  PhilHealthNumber?: string;
  PagIbigNumber?: string;
  GSISNumber?: string;
  PRCLicenseNumber?: string;
  PRCValidity?: string;
  BIRNumber?: string;
  PassportNumber?: string;
  PassportValidity?: string;
}

export interface Employee {
  EmployeeID: string;
  UserID?: string;
  FacultyID?: number;
  LastName?: string;
  FirstName?: string;
  MiddleName?: string;
  ExtensionName?: string;
  Sex?: string;
  Photo?: string;
  DateOfBirth: Date;
  PlaceOfBirth?: string;
  CivilStatus?: string;
  Nationality?: string;
  Religion?: string;
  BloodType?: string;

  // Relations
  governmentIds?: GovernmentIDs;
  medicalInfo?: MedicalInfo;

  // Other fields as needed
  createdAt: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
} 