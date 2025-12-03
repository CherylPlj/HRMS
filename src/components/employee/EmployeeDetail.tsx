'use client';

import React, { useState } from 'react';
import { Employee, Department, Education } from './types';
import { tabs } from './constants';
import { calculateYearsOfService, formatDesignation } from './utils';
import MedicalTab from '../tabs/MedicalTab';
import SkillsTab from '../tabs/SkillsTab';
import CertificatesTab from '../tabs/CertificatesTab';
import WorkExperienceTab from '../tabs/WorkExperienceTab';
import PromotionHistoryTab from '../tabs/PromotionHistoryTab';
import ContactInfoTab from '../tabs/ContactInfoTab';
import GovernmentIDsTab from '../tabs/GovernmentIDsTab';
import PerformanceHistoryTab from '../tabs/PerformanceHistoryTab';
import { maskSalaryAmount } from '@/utils/salaryMasking';

interface EmployeeDetailProps {
  employee: Employee;
  departments: Department[];
  onBack: () => void;
  onPhotoClick: (e: React.MouseEvent, photoUrl: string, alt: string) => void;
}

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  departments,
  onBack,
  onPhotoClick,
}) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [showSalary, setShowSalary] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Employees
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-800">
            {employee?.fullName || `${employee?.firstName || ''} ${employee?.surname || ''}`.trim()}
          </h1>
        </div>
      </div>

      {/* Employee Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-start space-x-6 mb-6">
          <div
            className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (employee?.photo) {
                onPhotoClick(e, employee.photo, `${employee?.firstName || ''} ${employee?.surname || ''}`);
              }
            }}
          >
            {employee?.photo ? (
              <img 
                src={employee?.photo} 
                alt={`${employee?.firstName || ''} ${employee?.surname || ''}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#800000]">
                <span className="text-white font-medium">
                  {(employee?.firstName || '').charAt(0)}{(employee?.surname || '').charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              {employee?.fullName || `${employee?.firstName || ''} ${employee?.surname || ''}`.trim()}
            </h2>
            <p className="text-gray-500">{employee?.position}</p>
            <p className="text-gray-500">{departments.find(dept => dept.id === employee?.DepartmentID)?.name || 'No Department'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500">Position</label>
            <p className="text-lg font-semibold text-gray-800">{employee?.position}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Designation</label>
            <p className="text-lg font-semibold text-gray-800">{formatDesignation(employee?.designation)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Department</label>
            <p className="text-lg font-semibold text-gray-800">{departments.find(dept => dept.id === employee?.DepartmentID)?.name || 'No Department'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email</label>
            <p className="text-lg font-semibold text-gray-800">{employee?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Status</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              employee?.status === 'Active' || employee?.status === 'Regular'
                ? 'bg-green-100 text-green-800'
                : employee?.status === 'Resigned'
                ? 'bg-red-100 text-red-800'
                : employee?.status === 'Probationary'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {employee?.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-[#800000] text-[#800000]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Surname</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.surname}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">First Name</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Middle Name</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.middleName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Name Extension</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.nameExtension || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.birthDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Place of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.birthPlace}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Sex</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.sex}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Civil Status</label>
                  <p className="mt-1 text-sm text-gray-900">{employee?.civilStatus}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'government' && (
            <div className="space-y-6">
              <GovernmentIDsTab 
                employeeId={employee?.employeeId || ''}
                governmentIDs={{
                  SSSNumber: employee?.GovernmentID?.SSSNumber || null,
                  TINNumber: employee?.GovernmentID?.TINNumber || null,
                  PhilHealthNumber: employee?.GovernmentID?.PhilHealthNumber || null,
                  PagIbigNumber: employee?.GovernmentID?.PagIbigNumber || null,
                  GSISNumber: employee?.GovernmentID?.GSISNumber || null,
                  PRCLicenseNumber: employee?.GovernmentID?.PRCLicenseNumber || null,
                  PRCValidity: employee?.GovernmentID?.PRCValidity || null,
                }}
                isEditing={false}
                onInputChange={() => {}}
              />
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-6">
              <ContactInfoTab 
                employeeId={employee?.employeeId || ''}
                contactInfo={{
                  Email: employee?.ContactInfo?.Email || null,
                  Phone: employee?.ContactInfo?.Phone || null,
                  PresentAddress: employee?.ContactInfo?.PresentAddress || null,
                  PermanentAddress: employee?.ContactInfo?.PermanentAddress || null,
                  EmergencyContactName: employee?.ContactInfo?.EmergencyContactName || null,
                  EmergencyContactNumber: employee?.ContactInfo?.EmergencyContactNumber || null,
                }}
                isEditing={false}
                onInputChange={() => {}}
              />
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Family Background</h3>
              <div className="space-y-4">
                {employee?.Family?.map((member: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Type</label>
                        <p className="mt-1 text-sm text-gray-900">{member.type || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Name</label>
                        <p className="mt-1 text-sm text-gray-900">{member.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Occupation</label>
                        <p className="mt-1 text-sm text-gray-900">{member.occupation || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Contact Number</label>
                        <p className="mt-1 text-sm text-gray-900">{member.contactNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Dependent</label>
                        <p className="mt-1 text-sm text-gray-900">{member.isDependent ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!employee?.Family || employee?.Family.length === 0) && (
                  <p className="text-gray-500 italic">No family background information available.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Educational Background</h3>
              <div className="space-y-4">
                {employee?.Education?.map((edu: Education, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Level</label>
                        <p className="mt-1 text-sm text-gray-900">{edu.level || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">School Name</label>
                        <p className="mt-1 text-sm text-gray-900">{edu.schoolName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Course</label>
                        <p className="mt-1 text-sm text-gray-900">{edu.course || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Year Graduated</label>
                        <p className="mt-1 text-sm text-gray-900">{edu.yearGraduated || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Honors</label>
                        <p className="mt-1 text-sm text-gray-900">{edu.honors || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!employee?.Education || employee?.Education.length === 0) && (
                  <p className="text-gray-500 italic">No educational records found.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'work' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Employment Details at SJSFI</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="text-md font-medium text-blue-900 mb-3">Current Position</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Position</label>
                      <p className="mt-1 text-sm text-blue-900">{employee?.position || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Designation</label>
                      <p className="mt-1 text-sm text-blue-900">{formatDesignation(employee?.designation) || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Employment Status</label>
                      <p className="mt-1 text-sm text-blue-900">{employee?.status || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Hire Date</label>
                      <p className="mt-1 text-sm text-blue-900">{employee?.hireDate || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Years of Service</label>
                      <p className="mt-1 text-sm text-blue-900">{calculateYearsOfService(employee?.hireDate || '')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Salary Grade</label>
                      <p className="mt-1 text-sm text-blue-900">{employee?.salaryGrade || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700">Salary Amount</label>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm text-blue-900">
                          {maskSalaryAmount(
                            employee?.EmploymentDetail?.SalaryAmount || 
                            (employee as any)?.employmentDetails?.SalaryAmount || 
                            null,
                            showSalary
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSalary(!showSalary)}
                          className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded p-1 transition-colors"
                          aria-label={showSalary ? 'Hide salary' : 'Show salary'}
                          title={showSalary ? 'Hide salary' : 'Show salary'}
                        >
                          {showSalary ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Position & Salary History</h4>
                  <PromotionHistoryTab employeeId={employee?.employeeId || ''} />
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Previous Employment History</h3>
                <WorkExperienceTab employeeId={employee?.employeeId || ''} />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <PerformanceHistoryTab employeeId={employee?.employeeId || ''} />
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <MedicalTab 
                employeeId={employee?.employeeId || ''}
              />
            </div>
          )}

          {activeTab === 'other' && (
            <div className="space-y-8">
              <div>
                <SkillsTab employeeId={employee?.employeeId || ''} />
              </div>
              <div className="border-t pt-6">
                <CertificatesTab employeeId={employee?.employeeId || ''} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;

