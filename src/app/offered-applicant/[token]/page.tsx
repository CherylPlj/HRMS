"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import {
  sanitizeString,
  sanitizeName,
  sanitizePhone,
  sanitizeUrl,
  sanitizeGovtId,
  maskGovtId,
  validateEmail,
  validatePhone,
  validateUrl,
  validateDateOfBirth,
  validateRequired,
  validateName,
  validateAddress,
  validateAtLeastOneGovtId,
  validateRelationship,
  validateEmergencyContactNotSelf
} from '@/lib/formValidation';

interface CandidateData {
  CandidateID: number;
  FullName: string;
  Email: string;
  ContactNumber?: string;
  Sex?: string;
  DateOfBirth?: string;
  Vacancy?: {
    VacancyID: number;
    VacancyName: string;
    JobTitle: string;
  };
  EmployeeInfoSubmitted: boolean;
  SubmittedEmployeeInfo?: any;
  InfoReturned?: boolean;
  InfoReturnedDate?: string;
  InfoReturnReason?: string;
}

interface EmployeeInfo {
  DateOfBirth: string;
  PlaceOfBirth: string;
  CivilStatus: string;
  Nationality: string;
  Religion: string;
  BloodType: string;
  PresentAddress: string;
  PermanentAddress: string;
  Phone: string;
  MessengerName: string;
  FBLink: string;
  SSSNumber: string;
  TINNumber: string;
  PhilHealthNumber: string;
  PagIbigNumber: string;
  GSISNumber: string;
  PRCLicenseNumber: string;
  PRCValidity: string;
  EmergencyContactName: string;
  EmergencyContactNumber: string;
  EmergencyContactRelationship: string;
}

const OfferedApplicantPage = () => {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [infoReturned, setInfoReturned] = useState(false);
  const [returnReason, setReturnReason] = useState<string | null>(null);
  const [wasResubmission, setWasResubmission] = useState(false);
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [consentGiven, setConsentGiven] = useState(false);

  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    DateOfBirth: '',
    PlaceOfBirth: '',
    CivilStatus: '',
    Nationality: '',
    Religion: '',
    BloodType: '',
    PresentAddress: '',
    PermanentAddress: '',
    Phone: '',
    MessengerName: '',
    FBLink: '',
    SSSNumber: '',
    TINNumber: '',
    PhilHealthNumber: '',
    PagIbigNumber: '',
    GSISNumber: '',
    PRCLicenseNumber: '',
    PRCValidity: '',
    EmergencyContactName: '',
    EmergencyContactNumber: '',
    EmergencyContactRelationship: ''
  });

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/candidates/offered/${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load candidate information');
          return;
        }

        const data = await response.json();
        setCandidate(data.candidate);

        // Check if info was returned
        if (data.candidate.InfoReturned) {
          setInfoReturned(true);
          setReturnReason(data.candidate.InfoReturnReason || null);
          // Allow editing even if returned, so load submitted info
          if (data.candidate.SubmittedEmployeeInfo) {
            // Filter out Address field if it exists (legacy data)
            const { Address, ...submittedInfo } = data.candidate.SubmittedEmployeeInfo;
            setEmployeeInfo(submittedInfo);
          }
        }

        // Check if already submitted (and not returned)
        if (data.candidate.EmployeeInfoSubmitted && !data.candidate.InfoReturned) {
          setAlreadySubmitted(true);
          if (data.candidate.SubmittedEmployeeInfo) {
            // Filter out Address field if it exists (legacy data)
            const { Address, ...submittedInfo } = data.candidate.SubmittedEmployeeInfo;
            setEmployeeInfo(submittedInfo);
          }
        } else if (data.candidate.DateOfBirth && !data.candidate.SubmittedEmployeeInfo) {
          // Pre-fill date of birth from candidate data only if no submitted info exists
          setEmployeeInfo(prev => ({
            ...prev,
            DateOfBirth: new Date(data.candidate.DateOfBirth).toISOString().split('T')[0]
          }));
        }
      } catch (err) {
        console.error('Error fetching candidate data:', err);
        setError('Failed to load candidate information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCandidateData();
    }
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let sanitizedValue = value;
    
    // Apply appropriate sanitization based on field type
    switch (name) {
      case 'EmergencyContactName':
      case 'PlaceOfBirth':
      case 'Nationality':
      case 'Religion':
        sanitizedValue = sanitizeName(value);
        break;
      case 'Phone':
      case 'EmergencyContactNumber':
        sanitizedValue = sanitizePhone(value);
        break;
      case 'FBLink':
        sanitizedValue = sanitizeUrl(value);
        break;
      case 'MessengerName':
        sanitizedValue = sanitizeString(value, 100);
        break;
      case 'SSSNumber':
      case 'TINNumber':
      case 'PhilHealthNumber':
      case 'PagIbigNumber':
      case 'GSISNumber':
      case 'PRCLicenseNumber':
        sanitizedValue = sanitizeGovtId(value);
        break;
      case 'PresentAddress':
      case 'PermanentAddress':
        sanitizedValue = sanitizeString(value, 500);
        break;
      default:
        sanitizedValue = sanitizeString(value);
    }
    
    setEmployeeInfo(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate required fields
    const dobValidation = validateDateOfBirth(employeeInfo.DateOfBirth);
    if (!dobValidation.valid) errors.DateOfBirth = dobValidation.error || '';
    
    const placeOfBirthValidation = validateRequired(employeeInfo.PlaceOfBirth, 'Place of Birth');
    if (!placeOfBirthValidation.valid) errors.PlaceOfBirth = placeOfBirthValidation.error || '';
    
    const civilStatusValidation = validateRequired(employeeInfo.CivilStatus, 'Civil Status');
    if (!civilStatusValidation.valid) errors.CivilStatus = civilStatusValidation.error || '';
    
    const nationalityValidation = validateRequired(employeeInfo.Nationality, 'Nationality');
    if (!nationalityValidation.valid) errors.Nationality = nationalityValidation.error || '';
    
    const presentAddressValidation = validateAddress(employeeInfo.PresentAddress, 'Present Address');
    if (!presentAddressValidation.valid) errors.PresentAddress = presentAddressValidation.error || '';
    
    const permanentAddressValidation = validateAddress(employeeInfo.PermanentAddress, 'Permanent Address');
    if (!permanentAddressValidation.valid) errors.PermanentAddress = permanentAddressValidation.error || '';
    
    const phoneValidation = validatePhone(employeeInfo.Phone);
    if (!phoneValidation.valid) errors.Phone = phoneValidation.error || '';
    
    // Validate optional URL fields
    if (employeeInfo.FBLink) {
      const fbLinkValidation = validateUrl(employeeInfo.FBLink, true);
      if (!fbLinkValidation.valid) errors.FBLink = fbLinkValidation.error || '';
    }
    
    // Validate at least one government ID
    const govtIdValidation = validateAtLeastOneGovtId({
      SSSNumber: employeeInfo.SSSNumber,
      TINNumber: employeeInfo.TINNumber,
      PhilHealthNumber: employeeInfo.PhilHealthNumber,
      PagIbigNumber: employeeInfo.PagIbigNumber,
      GSISNumber: employeeInfo.GSISNumber,
      PRCLicenseNumber: employeeInfo.PRCLicenseNumber
    });
    if (!govtIdValidation.valid) errors.GovtIds = govtIdValidation.error || '';
    
    // Validate emergency contact
    const emergencyNameValidation = validateName(employeeInfo.EmergencyContactName, 'Emergency Contact Name');
    if (!emergencyNameValidation.valid) errors.EmergencyContactName = emergencyNameValidation.error || '';
    
    const emergencyPhoneValidation = validatePhone(employeeInfo.EmergencyContactNumber);
    if (!emergencyPhoneValidation.valid) errors.EmergencyContactNumber = emergencyPhoneValidation.error || '';
    
    const relationshipValidation = validateRelationship(employeeInfo.EmergencyContactRelationship);
    if (!relationshipValidation.valid) errors.EmergencyContactRelationship = relationshipValidation.error || '';
    
    // Validate emergency contact is not self
    if (candidate) {
      const selfValidation = validateEmergencyContactNotSelf(candidate.FullName, employeeInfo.EmergencyContactName);
      if (!selfValidation.valid) errors.EmergencyContactName = selfValidation.error || '';
    }
    
    // Validate consent
    if (!consentGiven) {
      errors.consent = 'You must acknowledge and consent to the privacy notice before proceeding';
    }
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast.error('Please correct the errors in the form before proceeding');
      return false;
    }
    
    return true;
  };

  const handleContinueToReview = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (alreadySubmitted && !infoReturned) {
      toast.error('Employee information has already been submitted.');
      return;
    }
    
    if (!consentGiven) {
      toast.error('Please read and acknowledge the privacy notice before proceeding');
      return;
    }
    
    if (validateForm()) {
      setShowReviewStep(true);
    }
  };

  const handleSubmit = async () => {
    if (alreadySubmitted && !infoReturned) {
      toast.error('Employee information has already been submitted.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Final sanitization before submission
      const sanitizedInfo = {
        ...employeeInfo,
        PlaceOfBirth: sanitizeName(employeeInfo.PlaceOfBirth),
        Nationality: sanitizeName(employeeInfo.Nationality),
        Religion: employeeInfo.Religion ? sanitizeName(employeeInfo.Religion) : '',
        PresentAddress: sanitizeString(employeeInfo.PresentAddress, 500),
        PermanentAddress: sanitizeString(employeeInfo.PermanentAddress, 500),
        Phone: sanitizePhone(employeeInfo.Phone),
        MessengerName: sanitizeString(employeeInfo.MessengerName, 100),
        FBLink: employeeInfo.FBLink ? sanitizeUrl(employeeInfo.FBLink) : '',
        SSSNumber: sanitizeGovtId(employeeInfo.SSSNumber),
        TINNumber: sanitizeGovtId(employeeInfo.TINNumber),
        PhilHealthNumber: sanitizeGovtId(employeeInfo.PhilHealthNumber),
        PagIbigNumber: sanitizeGovtId(employeeInfo.PagIbigNumber),
        GSISNumber: sanitizeGovtId(employeeInfo.GSISNumber),
        PRCLicenseNumber: sanitizeGovtId(employeeInfo.PRCLicenseNumber),
        EmergencyContactName: sanitizeName(employeeInfo.EmergencyContactName),
        EmergencyContactNumber: sanitizePhone(employeeInfo.EmergencyContactNumber),
        EmergencyContactRelationship: sanitizeName(employeeInfo.EmergencyContactRelationship)
      };
      
      const response = await fetch('/api/candidates/submit-employee-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          employeeInfo: sanitizedInfo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to submit employee information');
        return;
      }

      const isResubmission = infoReturned;
      setWasResubmission(isResubmission);
      setShowSuccessModal(true);
      setShowReviewStep(false);
      setAlreadySubmitted(true);
      if (infoReturned) {
        setInfoReturned(false);
        setReturnReason(null);
      }
      toast.success(isResubmission 
        ? 'Employee information has been resubmitted successfully!' 
        : 'Employee information submitted successfully!');
    } catch (err) {
      console.error('Error submitting employee information:', err);
      toast.error('Failed to submit employee information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact HR at sjsfihrms@gmail.com
          </p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-[#800000] text-white rounded-t-lg p-6 mb-6">
          <h1 className="text-2xl font-bold">Congratulations on Your Offer!</h1>
          <p className="mt-2">Please complete your employee information to proceed with onboarding</p>
        </div>

        {/* Purpose Statement */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Why We Collect This Information</h3>
          <p className="text-blue-800 text-sm mb-2">
            The information you provide is essential for:
          </p>
          <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
            <li><strong>Legal compliance:</strong> Government IDs (SSS, TIN, PhilHealth, Pag-IBIG) are required for contribution remittances and tax reporting</li>
            <li><strong>Identity verification:</strong> During background checks and employment verification processes</li>
            <li><strong>Payroll processing:</strong> Accurate personal and contact information for salary and benefits administration</li>
            <li><strong>Emergency contact:</strong> To ensure your safety and reach your designated contact person in case of emergencies</li>
            <li><strong>HR administration:</strong> Maintaining accurate employee records as required by labor laws and company policies</li>
          </ul>
        </div>

        {/* Candidate Information Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <p className="mt-1 text-gray-900">{candidate.FullName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{candidate.Email}</p>
            </div>
            {candidate.ContactNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                <p className="mt-1 text-gray-900">{candidate.ContactNumber}</p>
              </div>
            )}
            {candidate.Vacancy && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <p className="mt-1 text-gray-900">{candidate.Vacancy.VacancyName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Employee Information Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {infoReturned && returnReason && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Information Returned for Review</h3>
              <p className="text-yellow-800 mb-2">
                Your submitted information has been returned with the following feedback:
              </p>
              <div className="bg-white p-3 rounded border border-yellow-300 mb-2">
                <p className="text-gray-800 font-medium">{returnReason}</p>
              </div>
              <p className="text-yellow-800 text-sm">
                Please review the feedback above, make the necessary corrections, and resubmit your information.
              </p>
            </div>
          )}
          {alreadySubmitted && !infoReturned && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                <strong>✓ Employee information has been submitted.</strong> Our HR team will review your information and contact you soon.
              </p>
            </div>
          )}

          <h2 className="text-lg font-semibold mb-6 text-gray-800">Employee Information Form</h2>
          
          <form onSubmit={handleContinueToReview} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="DateOfBirth"
                    value={employeeInfo.DateOfBirth}
                    onChange={handleInputChange}
                    required
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.DateOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.DateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.DateOfBirth}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="PlaceOfBirth"
                    value={employeeInfo.PlaceOfBirth}
                    onChange={handleInputChange}
                    required
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.PlaceOfBirth ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.PlaceOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.PlaceOfBirth}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Civil Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="CivilStatus"
                    value={employeeInfo.CivilStatus}
                    onChange={handleInputChange}
                    required
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.CivilStatus ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Select --</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                  {formErrors.CivilStatus && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.CivilStatus}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="Nationality"
                    value={employeeInfo.Nationality}
                    onChange={handleInputChange}
                    required
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.Nationality ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.Nationality && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.Nationality}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                  <input
                    type="text"
                    name="Religion"
                    value={employeeInfo.Religion}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                  <select
                    name="BloodType"
                    value={employeeInfo.BloodType}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  >
                    <option value="">-- Select --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Present Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="PresentAddress"
                    value={employeeInfo.PresentAddress}
                    onChange={handleInputChange}
                    required
                    disabled={alreadySubmitted && !infoReturned}
                    rows={3}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.PresentAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.PresentAddress && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.PresentAddress}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permanent Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="PermanentAddress"
                    value={employeeInfo.PermanentAddress}
                    onChange={handleInputChange}
                    required
                    disabled={alreadySubmitted && !infoReturned}
                    rows={3}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.PermanentAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.PermanentAddress && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.PermanentAddress}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="Phone"
                    value={employeeInfo.Phone}
                    onChange={handleInputChange}
                    required
                    placeholder="+639123456789 or 09123456789"
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.Phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.Phone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.Phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Messenger Name
                  </label>
                  <input
                    type="text"
                    name="MessengerName"
                    value={employeeInfo.MessengerName}
                    onChange={handleInputChange}
                    placeholder="e.g., John Doe"
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook Profile Link
                  </label>
                  <input
                    type="url"
                    name="FBLink"
                    value={employeeInfo.FBLink}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/yourprofile"
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.FBLink ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.FBLink && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.FBLink}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Government IDs Section */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Government IDs</h3>
              <p className="text-sm text-gray-600 mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
                <strong className="text-yellow-800">Required:</strong> Please provide at least one government ID (SSS, TIN, PhilHealth, Pag-IBIG, GSIS, or PRC License Number) for legal compliance and contribution remittance purposes.
              </p>
              {formErrors.GovtIds && (
                <p className="mt-1 text-sm text-red-600 mb-4">{formErrors.GovtIds}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSS Number</label>
                  <input
                    type="text"
                    name="SSSNumber"
                    value={employeeInfo.SSSNumber}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIN Number</label>
                  <input
                    type="text"
                    name="TINNumber"
                    value={employeeInfo.TINNumber}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PhilHealth Number</label>
                  <input
                    type="text"
                    name="PhilHealthNumber"
                    value={employeeInfo.PhilHealthNumber}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pag-IBIG Number</label>
                  <input
                    type="text"
                    name="PagIbigNumber"
                    value={employeeInfo.PagIbigNumber}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSIS Number</label>
                  <input
                    type="text"
                    name="GSISNumber"
                    value={employeeInfo.GSISNumber}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PRC License Number</label>
                  <input
                    type="text"
                    name="PRCLicenseNumber"
                    value={employeeInfo.PRCLicenseNumber}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PRC Validity</label>
                  <input
                    type="date"
                    name="PRCValidity"
                    value={employeeInfo.PRCValidity}
                    onChange={handleInputChange}
                    disabled={alreadySubmitted && !infoReturned}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-gray-700 border-b pb-2">Emergency Contact</h3>
              <p className="text-sm text-gray-600 mb-4 bg-blue-50 border border-blue-200 rounded p-3">
                <strong className="text-blue-800">Important:</strong> Please provide a contact person other than yourself. This information is used for your safety and to reach someone in case of emergencies.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="EmergencyContactName"
                    value={employeeInfo.EmergencyContactName}
                    onChange={handleInputChange}
                    required
                    placeholder="Full Name"
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.EmergencyContactName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.EmergencyContactName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.EmergencyContactName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship <span className="text-red-500">*</span>
                  </label>
                  {employeeInfo.EmergencyContactRelationship === 'Other' ? (
                    <input
                      type="text"
                      name="EmergencyContactRelationship"
                      value={employeeInfo.EmergencyContactRelationship}
                      onChange={handleInputChange}
                      placeholder="Specify relationship (e.g., Cousin, Neighbor, etc.)"
                      required
                      disabled={alreadySubmitted && !infoReturned}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                        formErrors.EmergencyContactRelationship ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  ) : (
                    <select
                      name="EmergencyContactRelationship"
                      value={employeeInfo.EmergencyContactRelationship}
                      onChange={handleInputChange}
                      required
                      disabled={alreadySubmitted && !infoReturned}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                        formErrors.EmergencyContactRelationship ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Select Relationship --</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                      <option value="Relative">Relative</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other (specify)</option>
                    </select>
                  )}
                  {formErrors.EmergencyContactRelationship && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.EmergencyContactRelationship}</p>
                  )}
                  {employeeInfo.EmergencyContactRelationship && employeeInfo.EmergencyContactRelationship !== 'Other' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeInfo(prev => ({ ...prev, EmergencyContactRelationship: 'Other' }));
                      }}
                      className="mt-2 text-sm text-[#800000] hover:underline"
                      disabled={alreadySubmitted && !infoReturned}
                    >
                      Not listed? Click to specify custom relationship
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="EmergencyContactNumber"
                    value={employeeInfo.EmergencyContactNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="+639123456789 or 09123456789"
                    disabled={alreadySubmitted && !infoReturned}
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000] disabled:bg-gray-100 ${
                      formErrors.EmergencyContactNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.EmergencyContactNumber && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.EmergencyContactNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            {(!alreadySubmitted || infoReturned) && (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                <h3 className="text-md font-semibold mb-4 text-gray-800">Privacy Notice & Data Protection</h3>
                <div className="text-sm text-gray-700 space-y-3 max-h-96 overflow-y-auto mb-4">
                  <div>
                    <strong>What Data We Collect:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li>Personal information (date of birth, place of birth, civil status, nationality, religion, blood type)</li>
                      <li>Contact information (addresses, phone number, messenger name, Facebook link)</li>
                      <li>Government identification numbers (SSS, TIN, PhilHealth, Pag-IBIG, GSIS, PRC License)</li>
                      <li>Emergency contact information (name, relationship, phone number)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Purpose of Collection:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><strong>SSS Number:</strong> For SSS contribution remittance and social security benefits</li>
                      <li><strong>TIN Number:</strong> For tax reporting and withholding tax calculations</li>
                      <li><strong>PhilHealth Number:</strong> For PhilHealth contribution remittance and health insurance coverage</li>
                      <li><strong>Pag-IBIG Number:</strong> For Pag-IBIG contribution remittance and housing loan eligibility</li>
                      <li><strong>GSIS Number:</strong> For GSIS contribution remittance (if applicable)</li>
                      <li><strong>PRC License:</strong> For professional license verification and compliance</li>
                      <li><strong>Emergency Contact:</strong> For identity verification during background checks and emergency situations</li>
                      <li><strong>Contact Information:</strong> For payroll processing, HR administration, and communication</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Who Has Access:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li>Authorized HR personnel for employment processing and record management</li>
                      <li>Payroll department for salary and benefits administration</li>
                      <li>Government agencies as required by law (for contribution remittances and tax reporting)</li>
                      <li>Background check service providers (for verification purposes only)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Data Retention:</strong>
                    <p className="ml-2 mt-1">
                      Your personal information will be retained for the duration of your employment and for a period of 7 years after termination as required by Philippine labor laws and regulations. Government ID numbers will be retained as long as legally required for contribution remittance and tax reporting purposes.
                    </p>
                  </div>
                  <div>
                    <strong>Data Security:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li><strong>Encryption in Transit:</strong> All data transmission is protected using SSL/TLS encryption (HTTPS) to ensure secure communication between your browser and our servers.</li>
                      <li><strong>Encryption at Rest:</strong> Sensitive Personally Identifiable Information (SPI), including government IDs, is stored in an encrypted database to protect your data even when not in use.</li>
                      <li>Access to your information is restricted to authorized personnel only, and all access is logged and monitored.</li>
                      <li>We implement industry-standard security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information.</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Your Rights:</strong>
                    <p className="ml-2 mt-1">
                      You have the right to access, correct, or update your personal information at any time. You may also request information about how your data is being used. For inquiries or concerns, please contact HR at sjsfihrms@gmail.com.
                    </p>
                  </div>
                </div>
                <div className="flex items-start mt-4">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    disabled={alreadySubmitted && !infoReturned}
                    className="mt-1 mr-3 h-4 w-4 text-[#800000] focus:ring-[#800000] border-gray-300 rounded"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700">
                    <strong>I acknowledge that I have read and understood the Privacy Notice above.</strong> I consent to the collection, processing, and storage of my personal information for the purposes stated above. I understand that my data will be protected with appropriate security measures including SSL/TLS encryption in transit and encryption at rest for sensitive information.
                  </label>
                </div>
                {!consentGiven && formErrors.consent && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.consent}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            {(!alreadySubmitted || infoReturned) && (
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#800000] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#600000] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Continue to Review'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Review Step Modal */}
      {showReviewStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="sticky top-0 bg-white border-b p-6 z-10">
              <h2 className="text-2xl font-bold text-gray-900">Review Your Information</h2>
              <p className="text-gray-600 mt-2">Please review all information carefully before submitting. You can go back to make changes if needed.</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personal Information Review */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Date of Birth</label>
                    <p className="font-medium">{employeeInfo.DateOfBirth || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Place of Birth</label>
                    <p className="font-medium">{employeeInfo.PlaceOfBirth || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Civil Status</label>
                    <p className="font-medium">{employeeInfo.CivilStatus || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nationality</label>
                    <p className="font-medium">{employeeInfo.Nationality || 'Not provided'}</p>
                  </div>
                  {employeeInfo.Religion && (
                    <div>
                      <label className="text-sm text-gray-600">Religion</label>
                      <p className="font-medium">{employeeInfo.Religion}</p>
                    </div>
                  )}
                  {employeeInfo.BloodType && (
                    <div>
                      <label className="text-sm text-gray-600">Blood Type</label>
                      <p className="font-medium">{employeeInfo.BloodType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Review */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Present Address</label>
                    <p className="font-medium">{employeeInfo.PresentAddress || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Permanent Address</label>
                    <p className="font-medium">{employeeInfo.PermanentAddress || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone Number</label>
                    <p className="font-medium">{employeeInfo.Phone || 'Not provided'}</p>
                  </div>
                  {employeeInfo.MessengerName && (
                    <div>
                      <label className="text-sm text-gray-600">Messenger Name</label>
                      <p className="font-medium">{employeeInfo.MessengerName}</p>
                    </div>
                  )}
                  {employeeInfo.FBLink && (
                    <div>
                      <label className="text-sm text-gray-600">Facebook Profile Link</label>
                      <p className="font-medium break-all">
                        <a href={employeeInfo.FBLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {employeeInfo.FBLink}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Government IDs Review */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Government IDs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employeeInfo.SSSNumber && (
                    <div>
                      <label className="text-sm text-gray-600">SSS Number</label>
                      <p className="font-medium">{maskGovtId(employeeInfo.SSSNumber)}</p>
                    </div>
                  )}
                  {employeeInfo.TINNumber && (
                    <div>
                      <label className="text-sm text-gray-600">TIN Number</label>
                      <p className="font-medium">{maskGovtId(employeeInfo.TINNumber)}</p>
                    </div>
                  )}
                  {employeeInfo.PhilHealthNumber && (
                    <div>
                      <label className="text-sm text-gray-600">PhilHealth Number</label>
                      <p className="font-medium">{maskGovtId(employeeInfo.PhilHealthNumber)}</p>
                    </div>
                  )}
                  {employeeInfo.PagIbigNumber && (
                    <div>
                      <label className="text-sm text-gray-600">Pag-IBIG Number</label>
                      <p className="font-medium">{maskGovtId(employeeInfo.PagIbigNumber)}</p>
                    </div>
                  )}
                  {employeeInfo.GSISNumber && (
                    <div>
                      <label className="text-sm text-gray-600">GSIS Number</label>
                      <p className="font-medium">{maskGovtId(employeeInfo.GSISNumber)}</p>
                    </div>
                  )}
                  {employeeInfo.PRCLicenseNumber && (
                    <div>
                      <label className="text-sm text-gray-600">PRC License Number</label>
                      <p className="font-medium">{maskGovtId(employeeInfo.PRCLicenseNumber)}</p>
                    </div>
                  )}
                  {employeeInfo.PRCValidity && (
                    <div>
                      <label className="text-sm text-gray-600">PRC Validity</label>
                      <p className="font-medium">{employeeInfo.PRCValidity}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact Review */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Name</label>
                    <p className="font-medium">{employeeInfo.EmergencyContactName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Relationship</label>
                    <p className="font-medium">{employeeInfo.EmergencyContactRelationship || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Contact Number</label>
                    <p className="font-medium">{employeeInfo.EmergencyContactNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex justify-end gap-4">
              <button
                onClick={() => setShowReviewStep(false)}
                disabled={submitting}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:bg-gray-200"
              >
                Back to Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    {infoReturned ? 'Resubmitting...' : 'Submitting...'}
                  </>
                ) : (
                  infoReturned ? 'Resubmit Information' : 'Submit Information'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Information {wasResubmission ? 'Resubmitted' : 'Submitted'} Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                {wasResubmission 
                  ? 'Thank you for resubmitting your employee information. Our HR team will review your updated information and contact you soon regarding the next steps.'
                  : 'Thank you for submitting your employee information. Our HR team will review your information and contact you soon regarding the next steps.'}
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setWasResubmission(false);
                }}
                className="bg-[#800000] text-white px-6 py-2 rounded-lg hover:bg-[#600000] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferedApplicantPage;

