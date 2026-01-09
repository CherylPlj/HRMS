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
  // { id: 'performance', label: 'Performance History', icon: TrendingUp },
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
  { key: 'Email', label: 'Email' },
  { key: 'Phone', label: 'Phone' },
  { key: 'Position', label: 'Position' },
  { key: 'Designation', label: 'Designation' },
  { key: 'Department', label: 'Department' },
  { key: 'EmploymentStatus', label: 'Employment Status' },
  { key: 'HireDate', label: 'Hire Date' },
  { key: 'ResignationDate', label: 'Resignation Date' },
  { key: 'SalaryGrade', label: 'Salary Grade' },
  { key: 'SalaryAmount', label: 'Salary Amount' },
  { key: 'EmployeeType', label: 'Employee Type' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'updatedAt', label: 'Updated At' },
];

export const exportColumnSections: ExportColumnSection[] = [
  {
    title: 'Personal Information',
    keys: [
      'FirstName', 'LastName', 'MiddleName', 'ExtensionName',
      'Sex', 'DateOfBirth'
    ],
  },
  {
    title: 'Contact Information',
    keys: [
      'Email', 'Phone'
    ],
  },
  {
    title: 'Employment Details',
    keys: [
      'Position', 'Designation', 'Department', 'EmploymentStatus', 'HireDate', 'ResignationDate',
      'SalaryGrade', 'SalaryAmount', 'EmployeeType'
    ],
  },
];

export const excludedColumns = [
  'EmployeeID', 
  'UserID', 
  'createdAt', 
  'updatedAt',
  'Religion',
  'BloodType',
  // Sensitive information excluded from export
  'PlaceOfBirth',
  'CivilStatus',
  'Nationality',
  'PresentAddress',
  'PermanentAddress',
  'EmergencyContactName',
  'EmergencyContactNumber',
  // Government IDs excluded for privacy
  'SSSNumber',
  'TINNumber',
  'PhilHealthNumber',
  'PagIbigNumber',
  'GSISNumber',
  'PRCLicenseNumber',
  'PRCValidity',
];

