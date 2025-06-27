"use client";

import React, { useEffect, useState } from 'react';
import { FaUserCircle, FaIdCard, FaPhone, FaUsers, FaGraduationCap, FaBriefcase, FaHandsHelping, FaBook, FaInfoCircle, FaPlus, FaUpload, FaEdit, FaEye, FaCamera, FaHeartbeat, FaEllipsisH } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import EducationTab from './tabs/EducationTab';
import FamilyTab from './tabs/FamilyTab';
import WorkExperienceTab from './tabs/WorkExperienceTab';
import SkillsTab from './tabs/SkillsTab';
import CertificatesTab from './tabs/CertificatesTab';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FacultyDetails {
  // Personal Details
  EmployeeID: string;
  UserID: string;
  FacultyID: number | null;
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
  BloodType: string;
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

  // Employment Details
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

  // Family Background
  SpouseName?: string;
  SpouseOccupation?: string;
  Children?: {
    Name: string;
    DateOfBirth: string;
  }[];

  // Educational Background
  CollegeName?: string;
  CollegeDegree?: string;
  CollegeYearGraduated?: number;
  GraduateSchoolName?: string;
  GraduateDegree?: string;
  GraduateYearCompleted?: number;

  // Work Experience
  WorkExperience?: {
    Company: string;
    Position: string;
    StartDate: string;
    EndDate?: string;
    Responsibilities?: string;
  }[];

  // Medical Information
  MedicalCondition?: string;
  Allergies?: string;
  LastMedicalCheckup?: string;

  // Other Information
  AdditionalInfo?: string;

  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface PublicMetadata {
  Department?: string;
  Role?: string;
  facultyData?: {
    Position: string;
    DepartmentID: number;
    DepartmentName: string;
    EmploymentStatus: string;
    HireDate: string;
    ResignationDate?: string;
    DateOfBirth: string;
    Phone?: string;
    Address?: string;
    EmergencyContact?: string;
  };
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface ValidationErrors {
  Phone?: string;
  PresentAddress?: string;
  PermanentAddress?: string;
  EmergencyContactName?: string;
  EmergencyContactNumber?: string;
  Email?: string;
}

type EmergencyContact = {
  Name: string;
  Relationship: string;
  HomeTelephone?: string;
  Mobile?: string;
  WorkTelephone?: string;
};

type Dependent = {
  Name: string;
  Relationship: string;
  DateOfBirth: string;
};

interface ComponentWithBackButton {
  onBack: () => void;
}

const PersonalData: React.FC<ComponentWithBackButton> = ({ onBack }) => {
  const { user } = useUser();
  const [facultyDetails, setFacultyDetails] = useState<FacultyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<FacultyDetails | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [activeTab, setActiveTab] = useState('personal');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isEmergencyContactModalOpen, setIsEmergencyContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<{
    index: number;
    contact: EmergencyContact | null;
  }>({ index: -1, contact: null });
  const [isDependentModalOpen, setIsDependentModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<{
    index: number;
    dependent: Dependent | null;
  }>({ index: -1, dependent: null });

  interface ClerkUserData {
    firstName: string;
    lastName: string;
    emailAddresses: { emailAddress: string }[];
  }

  const syncClerkDataWithFaculty = async (userData: ClerkUserData) => {
    if (!userData || !facultyDetails?.FacultyID) return;

    try {
      const updateData = {
        FirstName: userData.firstName,
        LastName: userData.lastName,
        Email: userData.emailAddresses[0]?.emailAddress
      };

      const { error: updateError } = await supabase
        .from('User')
        .update(updateData)
        .eq('UserID', facultyDetails.UserID);

      if (updateError) {
        console.error('Error syncing Clerk data:', updateError);
        setNotification({
          type: 'error',
          message: 'Failed to sync user data. Please try again later.'
        });
      }
    } catch (error) {
      console.error('Error in syncClerkDataWithFaculty:', error);
    }
  };

  useEffect(() => {
    if (user && facultyDetails) {
      if (user) {
        syncClerkDataWithFaculty({
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          emailAddresses: user.emailAddresses
        });
      }
    }
  }, [user, facultyDetails]);

  useEffect(() => {
    const fetchFacultyDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userEmail = user.emailAddresses[0]?.emailAddress;
        const publicMetadata = user.publicMetadata as PublicMetadata;
        
        if (!userEmail) {
          setNotification({
            type: 'error',
            message: 'No email address found. Please verify your email in Clerk account settings.'
          });
          return;
        }

        // Get user data
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('UserID, Email')
          .eq('Email', userEmail)
          .single();

        if (userError) {
          console.error('User lookup error:', userError);
          
          // Check if this is a new employee from invitation
          if (publicMetadata?.Role === 'Faculty' && publicMetadata.facultyData) {
            // Create employee record using invitation metadata
            const employeeData = {
              UserID: user.id,
              DateOfBirth: new Date(publicMetadata.facultyData.DateOfBirth).toISOString(),
              Phone: publicMetadata.facultyData.Phone || null,
              Address: publicMetadata.facultyData.Address || null,
              EmploymentStatus: publicMetadata.facultyData.EmploymentStatus,
              HireDate: new Date(publicMetadata.facultyData.HireDate).toISOString(),
              ResignationDate: publicMetadata.facultyData.ResignationDate || null,
              Position: publicMetadata.facultyData.Position,
              DepartmentID: publicMetadata.facultyData.DepartmentID,
              ContractID: null,
              EmergencyContactName: null,
              EmergencyContactNumber: null
            };

            const { data: newEmployeeData, error: createError } = await supabase
              .from('Employee')
              .insert([employeeData])
              .select(`
                *,
                Department:DepartmentID (
                  DepartmentName
                )
              `)
              .single();

            if (createError) {
              setNotification({
                type: 'error',
                message: 'Failed to create employee profile. Please contact IT support.'
              });
              return;
            }

            if (newEmployeeData) {
              const transformedData: FacultyDetails = {
                ...newEmployeeData,
                DepartmentName: newEmployeeData.Department?.DepartmentName || 'Unknown Department'
              };
              setFacultyDetails(transformedData);
              setEditedDetails(transformedData);
              setNotification({
                type: 'success',
                message: 'Employee profile created successfully!'
              });
              return;
            }
          }

          setNotification({
            type: 'error',
            message: 'Account not found. Please contact IT support to set up your account.'
          });
          return;
        }

        if (!userData) {
          setNotification({
            type: 'error',
            message: 'Your email is not registered. Please contact HR to complete your registration.'
          });
          return;
        }

        // Get employee data with department name
        const { data: employeeData, error: employeeError } = await supabase
          .from('Employee')
          .select(`
            *,
            Department:DepartmentID (
              DepartmentName
            )
          `)
          .eq('UserID', userData.UserID)
          .single();

        if (employeeError) {
          console.error('Employee data error:', employeeError);
          setNotification({
            type: 'error',
            message: 'Unable to load employee data. If this persists, please contact IT support.'
          });
          return;
        }

        if (!employeeData) {
          setNotification({
            type: 'error',
            message: 'Employee profile not found. Please contact HR to set up your profile.'
          });
          return;
        }

        const transformedData: FacultyDetails = {
          ...employeeData,
          DepartmentName: employeeData.Department?.DepartmentName || 'Unknown Department'
        };

        setFacultyDetails(transformedData);
        setEditedDetails(transformedData);
        setNotification(null);

        // Set up real-time subscription for updates
        if (!subscription) {
          const newSubscription = supabase
            .channel('employee_changes')
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'Employee',
              filter: `UserID=eq.${userData.UserID}`
            }, async (payload) => {
              // Fetch updated employee data
              const { data: updatedEmployeeData, error: updateError } = await supabase
                .from('Employee')
                .select(`
                  *,
                  Department:DepartmentID (
                    DepartmentName
                  )
                `)
                .eq('UserID', userData.UserID)
                .single();

              if (!updateError && updatedEmployeeData) {
                const transformedUpdatedData: FacultyDetails = {
                  ...updatedEmployeeData,
                  DepartmentName: updatedEmployeeData.Department?.DepartmentName || 'Unknown Department'
                };
                setFacultyDetails(transformedUpdatedData);
                setEditedDetails(transformedUpdatedData);
              }
            })
            .subscribe();

          setSubscription(newSubscription);
        }
      } catch (error) {
        console.error('Error fetching employee details:', error);
        setNotification({
          type: 'error',
          message: error instanceof Error 
            ? `Error: ${error.message}`
            : 'An unexpected error occurred while loading your data. Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyDetails();

    // Cleanup subscription when component unmounts
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
        setSubscription(null);
      }
    };
  }, [user]);  // Only depend on user changes

const handleDownload = () => {
  if (!facultyDetails) return;

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Faculty Profile', 14, 15);

  doc.setFontSize(12);
  let y = 25;

  const personal = {
    "Name": `${facultyDetails.FirstName} ${facultyDetails.LastName}`,
    "Email": facultyDetails.Email || 'Not set',
    "Phone": facultyDetails.Phone || 'Not set',
    "Present Address": facultyDetails.PresentAddress || 'Not set',
    "Permanent Address": facultyDetails.PermanentAddress || 'Not set',
    "Date of Birth": facultyDetails.DateOfBirth,
    "Emergency Contact": `${facultyDetails.EmergencyContactName || 'Not set'} (${facultyDetails.EmergencyContactNumber || 'Not set'})`
  };

  const employment = {
    "Employee ID": facultyDetails.EmployeeID,
    "Position": facultyDetails.Position,
    "Department": facultyDetails.DepartmentID?.toString() || 'Not set',
    "Employment Status": facultyDetails.EmploymentStatus,
    "Hire Date": facultyDetails.HireDate,
    "Years of Service": calculateYearsOfService(facultyDetails.HireDate)
  };

  doc.text('Personal Information:', 14, y);
  y += 8;
  for (const [label, value] of Object.entries(personal)) {
    doc.text(`${label}: ${value}`, 14, y);
    y += 6;
  }

  y += 6;
  doc.text('Employment Information:', 14, y);
  y += 8;
  for (const [label, value] of Object.entries(employment)) {
    doc.text(`${label}: ${value}`, 14, y);
    y += 6;
  }

  doc.save(`faculty_profile_${facultyDetails.EmployeeID}.pdf`);
};

  if (!user) {
    return <div className="p-6">Please sign in to view your personal data.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const handleEdit = () => {
    setEditedDetails(facultyDetails ? { ...facultyDetails } : null);
    setIsEditing(true);
  };

  // Validation functions
  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return undefined;
    const phoneRegex = /^\+?[\d\s-()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return 'Please enter a valid phone number (10-15 digits, may include +, spaces, hyphens, or parentheses)';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email) return undefined;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateAddress = (address: string): string | undefined => {
    if (!address) return undefined;
    if (address.length < 5) {
      return 'Address must be at least 5 characters long';
    }
    if (address.length > 200) {
      return 'Address must not exceed 200 characters';
    }
    return undefined;
  };

  const validateEmergencyContact = (name: string, number: string): { name?: string; number?: string } => {
    const errors: { name?: string; number?: string } = {};
    
    if (name && name.length < 3) {
      errors.name = 'Emergency contact name must be at least 3 characters long';
    }
    if (name && name.length > 100) {
      errors.name = 'Emergency contact name must not exceed 100 characters';
    }
    
    if (number) {
      const phoneError = validatePhone(number);
      if (phoneError) {
        errors.number = phoneError;
      }
    }
    
    return errors;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (editedDetails) {
      errors.Phone = validatePhone(editedDetails.Phone || '');
      errors.PresentAddress = validateAddress(editedDetails.PresentAddress || '');
      errors.PermanentAddress = validateAddress(editedDetails.PermanentAddress || '');
      errors.Email = validateEmail(editedDetails.Email || '');
      
      const emergencyContactErrors = validateEmergencyContact(
        editedDetails.EmergencyContactName || '',
        editedDetails.EmergencyContactNumber || ''
      );
      
      if (emergencyContactErrors.name) {
        errors.EmergencyContactName = emergencyContactErrors.name;
      }
      if (emergencyContactErrors.number) {
        errors.EmergencyContactNumber = emergencyContactErrors.number;
      }
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== undefined);
  };

  const calculateYearsOfService = (hireDate: string): string => {
    if (!hireDate) return 'N/A';
    const start = new Date(hireDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    return `${years} years`;
  };

  const handleInputChange = (field: keyof FacultyDetails, value: string) => {
    if (!editedDetails) return;

    console.log('Handling input change:', { field, value });

    setEditedDetails((prev) => {
      if (!prev) return null;
      
      let processedValue: any = value;

      // Handle special cases for complex fields
      if (field === 'Children' || field === 'WorkExperience') {
        try {
          processedValue = JSON.parse(value);
        } catch (e) {
          console.error(`Error parsing ${field} data:`, e);
          return prev;
        }
      }

      // Handle special case for dates
      if (field === 'DateOfBirth' || field === 'HireDate' || field === 'ResignationDate' || 
          field === 'PRCValidity' || field === 'LastMedicalCheckup') {
        processedValue = value || null;
      }

      // Handle special case for numbers
      if (field === 'DepartmentID' || field === 'ContractID' || field === 'FacultyID' ||
          field === 'CollegeYearGraduated' || field === 'GraduateYearCompleted') {
        processedValue = value ? parseInt(value, 10) : null;
      }

      const updatedDetails = {
        ...prev,
        [field]: processedValue
      };

      console.log('Updated details:', updatedDetails);
      return updatedDetails;
    });

    // Clear validation errors for the field if it exists
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Update handleSave to include validation
  const handleSave = async () => {
    if (!editedDetails || !user) {
      console.log('No edited details or user:', { editedDetails, user });
      setNotification({
        type: 'error',
        message: 'No data to save. Please try again.'
      });
      return;
    }

    if (!validateForm()) {
      console.log('Form validation failed:', validationErrors);
      setNotification({
        type: 'error',
        message: 'Please fix the validation errors before saving.'
      });
      return;
    }

    try {
      setLoading(true);
      
      if (!editedDetails.EmployeeID) {
        console.log('No employee ID found:', editedDetails);
        setNotification({
          type: 'error',
          message: 'Employee ID not found. Please contact IT support.'
        });
        return;
      }

      console.log('Starting save process with data:', editedDetails);

      const response = await fetch(`/api/employees/${editedDetails.EmployeeID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editedDetails,
          DateOfBirth: new Date(editedDetails.DateOfBirth).toISOString(),
          HireDate: new Date(editedDetails.HireDate).toISOString(),
          ResignationDate: editedDetails.ResignationDate ? new Date(editedDetails.ResignationDate).toISOString() : null,
          PRCValidity: editedDetails.PRCValidity ? new Date(editedDetails.PRCValidity).toISOString() : null,
          LastMedicalCheckup: editedDetails.LastMedicalCheckup ? new Date(editedDetails.LastMedicalCheckup).toISOString() : null,
          MedicalCondition: editedDetails.MedicalCondition || null,
          Allergies: editedDetails.Allergies || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }

      const data = await response.json();
      console.log('Save successful, received data:', data);

      const transformedData: FacultyDetails = {
        ...data,
        DepartmentName: data.Department?.DepartmentName || 'Unknown Department'
      };

      setFacultyDetails(transformedData);
      setEditedDetails(transformedData);
      setIsEditing(false);
      setValidationErrors({});
      setShowSuccessModal(true);
      
      console.log('Save process completed successfully');
    } catch (error: unknown) {
      console.error('Save error:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error saving changes. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Define tabs configuration
  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: FaUserCircle },
    { id: 'government', label: 'Government IDs', icon: FaIdCard },
    { id: 'contact', label: 'Contact Information', icon: FaPhone },
    { id: 'family', label: 'Family Background', icon: FaUsers },
    { id: 'education', label: 'Educational Background', icon: FaGraduationCap },
    { id: 'employment', label: 'Employment History', icon: FaBriefcase },
    { id: 'medical', label: 'Medical Information', icon: FaHeartbeat },
    { id: 'other', label: 'Other Information', icon: FaEllipsisH }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold text-gray-800">
            {facultyDetails ? `${facultyDetails.FirstName || ''} ${facultyDetails.MiddleName ? facultyDetails.MiddleName + ' ' : ''}${facultyDetails.LastName || ''}`.trim() : 'Personal Data'}
          </h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedDetails(facultyDetails);
                }}
                className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleEdit}
              className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
            >
              <FaEdit /> Edit
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#800000] text-[#800000]'
                  : 'text-gray-500'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.LastName || ''}
                  onChange={(e) => handleInputChange('LastName', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.LastName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.FirstName || ''}
                  onChange={(e) => handleInputChange('FirstName', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.FirstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Middle Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.MiddleName || ''}
                  onChange={(e) => handleInputChange('MiddleName', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.MiddleName || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Extension Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.ExtensionName || ''}
                  onChange={(e) => handleInputChange('ExtensionName', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.ExtensionName || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sex</label>
              {isEditing ? (
                <select
                  value={editedDetails?.Sex || ''}
                  onChange={(e) => handleInputChange('Sex', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.Sex}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedDetails?.DateOfBirth || ''}
                  onChange={(e) => handleInputChange('DateOfBirth', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.DateOfBirth}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.PlaceOfBirth || ''}
                  onChange={(e) => handleInputChange('PlaceOfBirth', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PlaceOfBirth || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Civil Status</label>
              {isEditing ? (
                <select
                  value={editedDetails?.CivilStatus || ''}
                  onChange={(e) => handleInputChange('CivilStatus', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                  <option value="Divorced">Divorced</option>
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.CivilStatus || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Blood Type</label>
              {isEditing ? (
                <select
                  value={editedDetails?.BloodType || ''}
                  onChange={(e) => handleInputChange('BloodType', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select Blood Type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.BloodType || 'N/A'}</p>
              )}
            </div>
          </div>
        )}

        {/* Government IDs Tab */}
        {activeTab === 'government' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">SSS Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.SSSNumber || ''}
                  onChange={(e) => handleInputChange('SSSNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.SSSNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">TIN Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.TINNumber || ''}
                  onChange={(e) => handleInputChange('TINNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.TINNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">PhilHealth Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.PhilHealthNumber || ''}
                  onChange={(e) => handleInputChange('PhilHealthNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PhilHealthNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pag-IBIG Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.PagIbigNumber || ''}
                  onChange={(e) => handleInputChange('PagIbigNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PagIbigNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">GSIS Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.GSISNumber || ''}
                  onChange={(e) => handleInputChange('GSISNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.GSISNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">PRC License Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.PRCLicenseNumber || ''}
                  onChange={(e) => handleInputChange('PRCLicenseNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PRCLicenseNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">PRC Validity</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedDetails?.PRCValidity || ''}
                  onChange={(e) => handleInputChange('PRCValidity', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PRCValidity || 'N/A'}</p>
              )}
            </div>
          </div>
        )}

        {/* Contact Information Tab */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedDetails?.Email || ''}
                  onChange={(e) => handleInputChange('Email', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.Email || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedDetails?.Phone || ''}
                  onChange={(e) => handleInputChange('Phone', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.Phone || 'N/A'}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Present Address</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.PresentAddress || ''}
                  onChange={(e) => handleInputChange('PresentAddress', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PresentAddress || 'N/A'}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.PermanentAddress || ''}
                  onChange={(e) => handleInputChange('PermanentAddress', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PermanentAddress || 'N/A'}</p>
              )}
            </div>
            
            {/* Emergency Contact Section */}
            <div className="col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedDetails?.EmergencyContactName || ''}
                      onChange={(e) => handleInputChange('EmergencyContactName', e.target.value)}
                      className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      placeholder="Enter emergency contact name"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{facultyDetails?.EmergencyContactName || 'N/A'}</p>
                  )}
                  {validationErrors.EmergencyContactName && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.EmergencyContactName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedDetails?.EmergencyContactNumber || ''}
                      onChange={(e) => handleInputChange('EmergencyContactNumber', e.target.value)}
                      className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      placeholder="Enter emergency contact number"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{facultyDetails?.EmergencyContactNumber || 'N/A'}</p>
                  )}
                  {validationErrors.EmergencyContactNumber && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.EmergencyContactNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Family Background Tab */}
        {activeTab === 'family' && (
          <div className="space-y-6">
            <FamilyTab employeeId={facultyDetails?.EmployeeID || ''} />
          </div>
        )}

        {/* Educational Background Tab */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            <EducationTab employeeId={facultyDetails?.EmployeeID || ''} />
          </div>
        )}



        {/* Work Experience Tab - renamed to Employment History */}
        {activeTab === 'employment' && (
          <div className="space-y-8">
            {/* Current Employment at SJSFI Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Employment Details at SJSFI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.Position || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employment Status</label>
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.EmploymentStatus || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.HireDate || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Years of Service</label>
                  <p className="mt-1 text-sm text-gray-900">{calculateYearsOfService(facultyDetails?.HireDate || '')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee Type</label>
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.EmployeeType || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salary Grade</label>
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.SalaryGrade || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Previous Work Experience Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Employment History</h3>
              <WorkExperienceTab employeeId={facultyDetails?.EmployeeID || ''} />
            </div>
          </div>
        )}



        {/* Medical Information Tab */}
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Medical Condition</label>
                {isEditing ? (
                  <textarea
                    value={editedDetails?.MedicalCondition || ''}
                    onChange={(e) => handleInputChange('MedicalCondition', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.MedicalCondition || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allergies</label>
                {isEditing ? (
                  <textarea
                    value={editedDetails?.Allergies || ''}
                    onChange={(e) => handleInputChange('Allergies', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    rows={3}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.Allergies || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Medical Checkup</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedDetails?.LastMedicalCheckup || ''}
                    onChange={(e) => handleInputChange('LastMedicalCheckup', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{facultyDetails?.LastMedicalCheckup || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other Information Tab */}
        {activeTab === 'other' && (
          <div className="space-y-8">
            {/* Additional Information Section */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Information</label>
                  {isEditing ? (
                    <textarea
                      value={editedDetails?.AdditionalInfo || ''}
                      onChange={(e) => handleInputChange('AdditionalInfo', e.target.value)}
                      className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                      rows={4}
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{facultyDetails?.AdditionalInfo || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="border-t pt-6">
              <SkillsTab employeeId={facultyDetails?.EmployeeID || ''} />
            </div>

            {/* Certificates Section */}
            <div className="border-t pt-6">
              <CertificatesTab employeeId={facultyDetails?.EmployeeID || ''} />
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Changes Saved Successfully!</h3>
              <p className="text-sm text-gray-500 mb-6">Your changes have been saved and updated in the system.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
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

export default PersonalData;