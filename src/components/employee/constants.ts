// Constants for employee components

import { UserCircle, IdCard, Phone, Users, GraduationCap, Briefcase, TrendingUp, Heart, MoreHorizontal } from 'lucide-react';
import { ExportColumn, ExportColumnSection } from './types';

export const tabs = [
  { id: 'personal', label: 'Personal Information', icon: UserCircle },
  { id: 'government', label: 'Government IDs', icon: IdCard },
  { id: 'contact', label: 'Contact Information', icon: Phone },
  { id: 'family', label: 'Family Background', icon: Users },
  { id: 'education', label: 'Educational Background', icon: GraduationCap },
  { id: 'work', label: 'Employment History', icon: Briefcase },
  { id: 'performance', label: 'Performance History', icon: TrendingUp },
  { id: 'medical', label: 'Medical Information', icon: Heart },
  { id: 'other', label: 'Other Information', icon: MoreHorizontal },
];

export const allExportColumns: ExportColumn[] = [
  { key: 'EmployeeID', label: 'Employee ID' },
  { key: 'UserID', label: 'User ID' },
  { key: 'FirstName', label: 'First Name' },
  { key: 'LastName', label: 'Last Name' },
  { key: 'MiddleName', label: 'Middle Name' },
  { key: 'ExtensionName', label: 'Extension Name' },
  { key: 'Sex', label: 'Sex' },
  { key: 'DateOfBirth', label: 'Date of Birth' },
  { key: 'PlaceOfBirth', label: 'Place of Birth' },
  { key: 'CivilStatus', label: 'Civil Status' },
  { key: 'Nationality', label: 'Nationality' },
  { key: 'Email', label: 'Email' },
  { key: 'Phone', label: 'Phone' },
  { key: 'PresentAddress', label: 'Present Address' },
  { key: 'PermanentAddress', label: 'Permanent Address' },
  { key: 'Position', label: 'Position' },
  { key: 'Designation', label: 'Designation' },
  { key: 'Department', label: 'Department' },
  { key: 'EmploymentStatus', label: 'Employment Status' },
  { key: 'HireDate', label: 'Hire Date' },
  { key: 'ResignationDate', label: 'Resignation Date' },
  { key: 'SalaryGrade', label: 'Salary Grade' },
  { key: 'EmployeeType', label: 'Employee Type' },
  { key: 'SSSNumber', label: 'SSS Number' },
  { key: 'TINNumber', label: 'TIN Number' },
  { key: 'PhilHealthNumber', label: 'PhilHealth Number' },
  { key: 'PagIbigNumber', label: 'Pag-IBIG Number' },
  { key: 'GSISNumber', label: 'GSIS Number' },
  { key: 'PRCLicenseNumber', label: 'PRC License Number' },
  { key: 'PRCValidity', label: 'PRC Validity' },
  { key: 'EmergencyContactName', label: 'Emergency Contact Name' },
  { key: 'EmergencyContactNumber', label: 'Emergency Contact Number' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

export const exportColumnSections: ExportColumnSection[] = [
  {
    title: 'Personal Information',
    keys: [
      'FirstName', 'LastName', 'MiddleName', 'ExtensionName',
      'Sex', 'DateOfBirth', 'PlaceOfBirth', 'CivilStatus', 'Nationality'
    ],
  },
  {
    title: 'Contact Information',
    keys: [
      'Email', 'Phone', 'PresentAddress', 'PermanentAddress', 'EmergencyContactName', 'EmergencyContactNumber'
    ],
  },
  {
    title: 'Employment Details',
    keys: [
      'Position', 'Designation', 'Department', 'EmploymentStatus', 'HireDate', 'ResignationDate',
      'SalaryGrade', 'EmployeeType'
    ],
  },
  {
    title: 'Government IDs',
    keys: [
      'SSSNumber', 'TINNumber', 'PhilHealthNumber', 'PagIbigNumber', 'GSISNumber', 'PRCLicenseNumber', 'PRCValidity'
    ],
  },
];

export const excludedColumns = ['EmployeeID', 'UserID', 'createdAt', 'updatedAt', 'Religion', 'BloodType'];

