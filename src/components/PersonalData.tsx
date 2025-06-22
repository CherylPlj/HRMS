"use client";

import React, { useEffect, useState } from 'react';
import { FaDownload, FaEdit } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FacultyDetails {
  // Personal Details
  FacultyID: number;
  UserID: number;
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  DateOfBirth: string;
  Gender: 'Male' | 'Female' | 'Other';
  MaritalStatus: string;
  Nationality: string;
  BloodType?: string;
  DriversLicenseNumber?: string;
  LicenseExpiryDate?: string;
  
  // Contact Details
  Phone: string | null;
  MobilePhone?: string | null;
  WorkPhone?: string | null;
  Email: string;
  Address: string | null;
  Street1?: string;
  Street2?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  
  // Emergency Contacts
  EmergencyContacts?: {
    Name: string;
    Relationship: string;
    HomeTelephone?: string;
    Mobile?: string;
    WorkTelephone?: string;
  }[];
  
  // Dependents
  Dependents?: {
    Name: string;
    Relationship: string;
    DateOfBirth: string;
  }[];
  
  // Job Details
  Position: string;
  Department: number;
  DepartmentName?: string;
  EmploymentStatus: string;
  HireDate: string;
  JobCategory?: string;
  SubUnit?: string;
  Location?: string;
  
  // Salary Components
  SalaryComponents?: {
    Component: string;
    Amount: number;
    Currency: string;
    PayFrequency: string;
    DirectDeposit?: number;
  }[];
  
  // Report-to
  Supervisors?: {
    Name: string;
    ReportingMethod: string;
  }[];
  Subordinates?: {
    Name: string;
    ReportingMethod: string;
  }[];
  
  // Qualifications
  WorkExperience?: {
    Company: string;
    JobTitle: string;
    FromDate: string;
    ToDate: string;
    Comment?: string;
  }[];
  Education?: {
    Level: string;
    Year: string;
    GPA?: string;
  }[];
  Skills?: string[];
  Extension?: string;
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
  Address?: string;
  EmergencyContact?: string;
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
  const [dependents, setDependents] = useState<FacultyDetails['Dependents']>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<FacultyDetails['EmergencyContacts']>([]);
  const [workExperience, setWorkExperience] = useState<FacultyDetails['WorkExperience']>([]);
  const [education, setEducation] = useState<FacultyDetails['Education']>([]);
  const [languages, setLanguages] = useState<FacultyDetails['Skills']>([]);
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
          
          // Check if this is a new faculty member from invitation
          if (publicMetadata?.Role === 'Faculty' && publicMetadata.facultyData) {
            // Create faculty record using invitation metadata
            const facultyData = {
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
              EmergencyContact: null
            };

            const { data: newFacultyData, error: createError } = await supabase
              .from('Faculty')
              .insert([facultyData])
              .select(`
                *,
                Department (
                  DepartmentName
                )
              `)
              .single();

            if (createError) {
              setNotification({
                type: 'error',
                message: 'Failed to create faculty profile. Please contact IT support.'
              });
              return;
            }

            if (newFacultyData) {
              const transformedData: FacultyDetails = {
                ...newFacultyData,
                DepartmentName: newFacultyData.Department?.DepartmentName || 'Unknown Department'
              };
              setFacultyDetails(transformedData);
              setEditedDetails(transformedData);
              setNotification({
                type: 'success',
                message: 'Faculty profile created successfully!'
              });
              return;
            }
          }

          setNotification({
            type: 'error',
            message: 'Account not found. Please contact IT support to set up your faculty account.'
          });
          return;
        }

        if (!userData) {
          setNotification({
            type: 'error',
            message: 'Your email is not registered. Please contact HR to complete your faculty registration.'
          });
          return;
        }

        // Get faculty data with department name
        const { data: facultyData, error: facultyError } = await supabase
          .from('Faculty')
          .select(`
            *,
            Department (
              DepartmentName
            )
          `)
          .eq('UserID', userData.UserID)
          .single();

        if (facultyError) {
          console.error('Faculty data error:', facultyError);
          setNotification({
            type: 'error',
            message: 'Unable to load faculty data. If this persists, please contact IT support.'
          });
          return;
        }

        if (!facultyData) {
          setNotification({
            type: 'error',
            message: 'Faculty profile not found. Please contact HR to set up your faculty profile.'
          });
          return;
        }

        const transformedData: FacultyDetails = {
          ...facultyData,
          DepartmentName: facultyData.Department?.DepartmentName || 'Unknown Department'
        };

        setFacultyDetails(transformedData);
        setEditedDetails(transformedData);
        setNotification(null);

        // Set up real-time subscription for updates
        if (!subscription) {
          const newSubscription = supabase
            .channel('faculty_changes')
            .on('postgres_changes', {
              event: '*',
              schema: 'public',
              table: 'Faculty',
              filter: `UserID=eq.${userData.UserID}`
            }, async (payload) => {
              // Fetch updated faculty data
              const { data: updatedFacultyData, error: updateError } = await supabase
                .from('Faculty')
                .select(`
                  *,
                  Department (
                    DepartmentName
                  )
                `)
                .eq('UserID', userData.UserID)
                .single();

              if (!updateError && updatedFacultyData) {
                const transformedUpdatedData: FacultyDetails = {
                  ...updatedFacultyData,
                  DepartmentName: updatedFacultyData.Department?.DepartmentName || 'Unknown Department'
                };
                setFacultyDetails(transformedUpdatedData);
                setEditedDetails(transformedUpdatedData);
              }
            })
            .subscribe();

          setSubscription(newSubscription);
        }
      } catch (error) {
        console.error('Error fetching faculty details:', error);
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
    "Name": `${user?.firstName} ${user?.lastName}`,
    "Email": user?.emailAddresses[0]?.emailAddress,
    "Phone": facultyDetails.Phone || 'Not set',
    "Address": facultyDetails.Address || 'Not set',
    "Date of Birth": facultyDetails.DateOfBirth,
    "Emergency Contact": facultyDetails.EmergencyContacts?.find(c => c.Relationship === 'Emergency Contact')?.Name || 'Not set'
  };

  const employment = {
    "Faculty ID": facultyDetails.FacultyID,
    "Position": facultyDetails.Position,
    "Department": facultyDetails.DepartmentName,
    "Employment Status": facultyDetails.EmploymentStatus,
    "Hire Date": facultyDetails.HireDate,
    "Years of Service": calculateYearsOfService()
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

  doc.save(`faculty_profile_${facultyDetails.FacultyID}.pdf`);
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

  const validateEmergencyContact = (contact: string): string | undefined => {
    if (!contact) return undefined;
    if (contact.length < 3) {
      return 'Emergency contact name must be at least 3 characters long';
    }
    if (contact.length > 100) {
      return 'Emergency contact name must not exceed 100 characters';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (editedDetails) {
      errors.Phone = validatePhone(editedDetails.Phone || '');
      errors.Address = validateAddress(editedDetails.Address || '');
      errors.EmergencyContact = validateEmergencyContact(editedDetails.EmergencyContacts?.find(c => c.Relationship === 'Emergency Contact')?.Name || '');
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== undefined);
  };

  // Update handleInputChange to include validation
  const handleInputChange = (field: keyof FacultyDetails, value: string) => {
    console.log('Handling input change:', field, value);
    setEditedDetails(prev => {
      if (!prev) return null;
      
      if (field === 'EmergencyContacts') {
        return {
          ...prev,
          EmergencyContacts: [{
            Name: value,
            Relationship: 'Emergency Contact'
          }]
        };
      }
      
      return {
        ...prev,
        [field]: value
      };
    });

    // Validate the changed field
    let error: string | undefined;
    switch (field) {
      case 'Phone':
        error = validatePhone(value);
        break;
      case 'Address':
        error = validateAddress(value);
        break;
      case 'EmergencyContacts':
        error = validateEmergencyContact(value);
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Update handleSave to include validation
  const handleSave = async () => {
    if (!editedDetails || !user) {
      setNotification({
        type: 'error',
        message: 'No data to save. Please try again.'
      });
      return;
    }

    if (!validateForm()) {
      setNotification({
        type: 'error',
        message: 'Please fix the validation errors before saving.'
      });
      return;
    }

    try {
      setLoading(true);
      
      if (!facultyDetails?.FacultyID) {
        setNotification({
          type: 'error',
          message: 'Faculty ID not found. Please contact IT support.'
        });
        return;
      }

      const updateData = {
        Phone: editedDetails.Phone,
        Address: editedDetails.Address,
        EmergencyContacts: editedDetails.EmergencyContacts
      };

      const { data, error: updateError } = await supabase
        .from('Faculty')
        .update(updateData)
        .eq('FacultyID', facultyDetails.FacultyID)
        .select(`
          *,
          Department (
            DepartmentName
          )
        `)
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        setNotification({
          type: 'error',
          message: 'Failed to save changes. Please try again or contact IT support.'
        });
        return;
      }

      if (!data) {
        setNotification({
          type: 'error',
          message: 'No data returned after save. Please verify your changes.'
        });
        return;
      }

      const transformedData: FacultyDetails = {
        ...data,
        DepartmentName: data.Department?.DepartmentName || 'Unknown Department'
      };

      setFacultyDetails(transformedData);
      setEditedDetails(transformedData);
      setIsEditing(false);
      setValidationErrors({});
      setNotification({
        type: 'success',
        message: 'Changes saved successfully!'
      });
    } catch (error: unknown) {
      console.error('Save error:', error);
      setNotification({
        type: 'error',
        message: 'Error saving changes. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateYearsOfService = () => {
    if (!facultyDetails?.HireDate) return 'N/A';
    const start = new Date(facultyDetails.HireDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    return `${years} years`;
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-black font-bold">My Info</h1>
        <div className="flex space-x-2">
          <button 
            title='Download your personal data'
            onClick={handleDownload}
            disabled={!facultyDetails || loading}
            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaDownload /> Download
          </button>
          {isEditing ? (
            <>
              <button
                title='Save your changes'
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                title='Cancel editing'
                onClick={() => {
                  setEditedDetails(facultyDetails);
                  setIsEditing(false);
                  setNotification(null);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-700 disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              title='Edit your personal data'
              onClick={handleEdit}
              className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800 disabled:opacity-50"
              disabled={!facultyDetails || loading}
            >
              <FaEdit /> Edit
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className={`mb-4 p-4 border rounded ${
          notification.type === 'success' 
            ? 'bg-green-100 border-green-400 text-green-700' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-2 px-4 ${activeTab === 'personal' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Personal Details
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`py-2 px-4 ${activeTab === 'contact' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Contact Details
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`py-2 px-4 ${activeTab === 'emergency' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Emergency Contacts
          </button>
          <button
            onClick={() => setActiveTab('dependents')}
            className={`py-2 px-4 ${activeTab === 'dependents' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Dependents
          </button>
          <button
            onClick={() => setActiveTab('job')}
            className={`py-2 px-4 ${activeTab === 'job' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Job
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`py-2 px-4 ${activeTab === 'salary' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Salary
          </button>
          <button
            onClick={() => setActiveTab('report-to')}
            className={`py-2 px-4 ${activeTab === 'report-to' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Report-to
          </button>
          <button
            onClick={() => setActiveTab('qualifications')}
            className={`py-2 px-4 ${activeTab === 'qualifications' ? 'border-b-2 border-[#800000] text-[#800000]' : 'text-gray-500'}`}
          >
            Qualifications
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="mt-6">
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={user?.firstName || ''}
                    className="bg-blue-50 text-black p-2 rounded border border-blue-100"
                    disabled
                    placeholder="First Name"
                  />
                  <input
                    type="text"
                    value={editedDetails?.MiddleName || ''}
                    onChange={(e) => handleInputChange('MiddleName', e.target.value)}
                    className="bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Middle Name"
                  />
                  <input
                    type="text"
                    value={user?.lastName || ''}
                    className="bg-blue-50 text-black p-2 rounded border border-blue-100"
                    disabled
                    placeholder="Last Name"
                  />
                  <input
                    type="text"
                    value={editedDetails?.Extension || ''}
                    onChange={(e) => handleInputChange('Extension', e.target.value)}
                    className="bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Extension (e.g. Jr., Sr.)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  value={facultyDetails?.FacultyID || ''}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Other ID</label>
                <input
                  type="text"
                  value={editedDetails?.UserID || ''}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Driver's License Number</label>
                <input
                  type="text"
                  value={editedDetails?.DriversLicenseNumber || ''}
                  onChange={(e) => handleInputChange('DriversLicenseNumber', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter driver's license number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">License Expiry Date</label>
                <input
                  type="date"
                  value={editedDetails?.LicenseExpiryDate || ''}
                  onChange={(e) => handleInputChange('LicenseExpiryDate', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <select
                  value={editedDetails?.Nationality || ''}
                  onChange={(e) => handleInputChange('Nationality', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select nationality</option>
                  <option value="American">American</option>
                  <option value="British">British</option>
                  <option value="Canadian">Canadian</option>
                  {/* Add more nationality options */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                <select
                  value={editedDetails?.MaritalStatus || ''}
                  onChange={(e) => handleInputChange('MaritalStatus', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select marital status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={editedDetails?.DateOfBirth || ''}
                  onChange={(e) => handleInputChange('DateOfBirth', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <div className="mt-1 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={editedDetails?.Gender === 'Male'}
                      onChange={(e) => handleInputChange('Gender', e.target.value)}
                      className="form-radio text-[#800000]"
                    />
                    <span className="ml-2">Male</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={editedDetails?.Gender === 'Female'}
                      onChange={(e) => handleInputChange('Gender', e.target.value)}
                      className="form-radio text-[#800000]"
                    />
                    <span className="ml-2">Female</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="Other"
                      checked={editedDetails?.Gender === 'Other'}
                      onChange={(e) => handleInputChange('Gender', e.target.value)}
                      className="form-radio text-[#800000]"
                    />
                    <span className="ml-2">Other</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                <select
                  value={editedDetails?.BloodType || ''}
                  onChange={(e) => handleInputChange('BloodType', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Work Email</label>
                <input
                  type="email"
                  value={user?.emailAddresses[0]?.emailAddress || ''}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Other Email</label>
                <input
                  type="email"
                  value={editedDetails?.Email || ''}
                  onChange={(e) => handleInputChange('Email', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter other email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
                <input
                  type="tel"
                  value={editedDetails?.MobilePhone || ''}
                  onChange={(e) => handleInputChange('MobilePhone', e.target.value)}
                  className={`mt-1 w-full p-2 rounded border ${
                    validationErrors.Phone ? 'border-red-500' : 'border-gray-300'
                  } bg-gray-50`}
                  placeholder="Enter mobile phone"
                />
                {validationErrors.Phone && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.Phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Work Phone</label>
                <input
                  type="tel"
                  value={editedDetails?.WorkPhone || ''}
                  onChange={(e) => handleInputChange('WorkPhone', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter work phone"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Street 1</label>
                <input
                  type="text"
                  value={editedDetails?.Street1 || ''}
                  onChange={(e) => handleInputChange('Street1', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Street 2</label>
                <input
                  type="text"
                  value={editedDetails?.Street2 || ''}
                  onChange={(e) => handleInputChange('Street2', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter additional address info"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={editedDetails?.City || ''}
                    onChange={(e) => handleInputChange('City', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Enter city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State/Province</label>
                  <input
                    type="text"
                    value={editedDetails?.State || ''}
                    onChange={(e) => handleInputChange('State', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Enter state"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zip/Postal Code</label>
                  <input
                    type="text"
                    value={editedDetails?.PostalCode || ''}
                    onChange={(e) => handleInputChange('PostalCode', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Enter postal code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <select
                    value={editedDetails?.Country || ''}
                    onChange={(e) => handleInputChange('Country', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  >
                    <option value="">Select country</option>
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    {/* Add more country options */}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Emergency Contacts</h2>
              <button
                onClick={() => {
                  setEditingContact({ index: -1, contact: null });
                  setIsEmergencyContactModalOpen(true);
                }}
                className="bg-[#800000] text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-red-800"
              >
                + Add Contact
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(editedDetails?.EmergencyContacts || []).map((contact, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{contact.Name}</td>
                      <td className="px-6 py-4">{contact.Relationship}</td>
                      <td className="px-6 py-4">{contact.HomeTelephone}</td>
                      <td className="px-6 py-4">{contact.Mobile}</td>
                      <td className="px-6 py-4">{contact.WorkTelephone}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingContact({ index, contact });
                              setIsEmergencyContactModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              const updatedContacts = [...(editedDetails?.EmergencyContacts || [])];
                              updatedContacts.splice(index, 1);
                              handleInputChange('EmergencyContacts', JSON.stringify(updatedContacts));
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(editedDetails?.EmergencyContacts || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No emergency contacts added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Emergency Contact Modal */}
            {isEmergencyContactModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingContact.contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        value={editingContact.contact?.Name || ''}
                        onChange={(e) => setEditingContact(prev => ({
                          ...prev,
                          contact: { ...prev.contact, Name: e.target.value } as typeof prev.contact
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        placeholder="Contact Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Relationship *</label>
                      <select
                        value={editingContact.contact?.Relationship || ''}
                        onChange={(e) => setEditingContact(prev => ({
                          ...prev,
                          contact: { ...prev.contact, Relationship: e.target.value } as typeof prev.contact
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        required
                      >
                        <option value="">Select Relationship</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Child">Child</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Home Phone</label>
                      <input
                        type="tel"
                        value={editingContact.contact?.HomeTelephone || ''}
                        onChange={(e) => setEditingContact(prev => ({
                          ...prev,
                          contact: { ...prev.contact, HomeTelephone: e.target.value } as typeof prev.contact
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        placeholder="Home Phone Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
                      <input
                        type="tel"
                        value={editingContact.contact?.Mobile || ''}
                        onChange={(e) => setEditingContact(prev => ({
                          ...prev,
                          contact: { ...prev.contact, Mobile: e.target.value } as typeof prev.contact
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        placeholder="Mobile Phone Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Work Phone</label>
                      <input
                        type="tel"
                        value={editingContact.contact?.WorkTelephone || ''}
                        onChange={(e) => setEditingContact(prev => ({
                          ...prev,
                          contact: { ...prev.contact, WorkTelephone: e.target.value } as typeof prev.contact
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        placeholder="Work Phone Number"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setIsEmergencyContactModalOpen(false);
                        setEditingContact({ index: -1, contact: null });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!editingContact.contact?.Name || !editingContact.contact?.Relationship) {
                          setNotification({
                            type: 'error',
                            message: 'Name and Relationship are required fields.'
                          });
                          return;
                        }

                        const updatedContacts = [...(editedDetails?.EmergencyContacts || [])];
                        if (editingContact.index === -1) {
                          // Adding new contact
                          updatedContacts.push(editingContact.contact);
                        } else {
                          // Editing existing contact
                          updatedContacts[editingContact.index] = editingContact.contact;
                        }
                        
                        handleInputChange('EmergencyContacts', JSON.stringify(updatedContacts));
                        setIsEmergencyContactModalOpen(false);
                        setEditingContact({ index: -1, contact: null });
                      }}
                      className="px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-red-800"
                    >
                      {editingContact.contact ? 'Save Changes' : 'Add Contact'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dependents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Dependents</h2>
              <button
                onClick={() => {
                  setEditingDependent({ index: -1, dependent: null });
                  setIsDependentModalOpen(true);
                }}
                className="bg-[#800000] text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-red-800"
              >
                + Add Dependent
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(editedDetails?.Dependents || []).map((dependent, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{dependent.Name}</td>
                      <td className="px-6 py-4">{dependent.Relationship}</td>
                      <td className="px-6 py-4">{dependent.DateOfBirth}</td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingDependent({ index, dependent });
                              setIsDependentModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              const updatedDependents = [...(editedDetails?.Dependents || [])];
                              updatedDependents.splice(index, 1);
                              handleInputChange('Dependents', JSON.stringify(updatedDependents));
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(editedDetails?.Dependents || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No dependents added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Dependent Modal */}
            {isDependentModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingDependent.dependent ? 'Edit Dependent' : 'Add Dependent'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        value={editingDependent.dependent?.Name || ''}
                        onChange={(e) => setEditingDependent(prev => ({
                          ...prev,
                          dependent: { ...prev.dependent, Name: e.target.value } as typeof prev.dependent
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        placeholder="Dependent Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Relationship *</label>
                      <select
                        value={editingDependent.dependent?.Relationship || ''}
                        onChange={(e) => setEditingDependent(prev => ({
                          ...prev,
                          dependent: { ...prev.dependent, Relationship: e.target.value } as typeof prev.dependent
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        required
                      >
                        <option value="">Select Relationship</option>
                        <option value="Child">Child</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                      <input
                        type="date"
                        value={editingDependent.dependent?.DateOfBirth || ''}
                        onChange={(e) => setEditingDependent(prev => ({
                          ...prev,
                          dependent: { ...prev.dependent, DateOfBirth: e.target.value } as typeof prev.dependent
                        }))}
                        className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setIsDependentModalOpen(false);
                        setEditingDependent({ index: -1, dependent: null });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!editingDependent.dependent?.Name || 
                            !editingDependent.dependent?.Relationship ||
                            !editingDependent.dependent?.DateOfBirth) {
                          setNotification({
                            type: 'error',
                            message: 'All fields are required.'
                          });
                          return;
                        }

                        const updatedDependents = [...(editedDetails?.Dependents || [])];
                        if (editingDependent.index === -1) {
                          // Adding new dependent
                          updatedDependents.push(editingDependent.dependent);
                        } else {
                          // Editing existing dependent
                          updatedDependents[editingDependent.index] = editingDependent.dependent;
                        }
                        
                        handleInputChange('Dependents', JSON.stringify(updatedDependents));
                        setIsDependentModalOpen(false);
                        setEditingDependent({ index: -1, dependent: null });
                      }}
                      className="px-4 py-2 bg-[#800000] text-white rounded-md hover:bg-red-800"
                    >
                      {editingDependent.dependent ? 'Save Changes' : 'Add Dependent'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'job' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Job Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <input
                  type="text"
                  value={editedDetails?.Position || ''}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  value={editedDetails?.DepartmentName || ''}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Job Category</label>
                <select
                  value={editedDetails?.JobCategory || ''}
                  onChange={(e) => handleInputChange('JobCategory', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select Category</option>
                  <option value="Full-Time Faculty">Full-Time Faculty</option>
                  <option value="Part-Time Faculty">Part-Time Faculty</option>
                  <option value="Adjunct Faculty">Adjunct Faculty</option>
                  <option value="Visiting Faculty">Visiting Faculty</option>
                  <option value="Research Faculty">Research Faculty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Sub Unit</label>
                <input
                  type="text"
                  value={editedDetails?.SubUnit || ''}
                  onChange={(e) => handleInputChange('SubUnit', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter sub unit"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Employment Status</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Employment Status</label>
                <select
                  value={editedDetails?.EmploymentStatus || ''}
                  onChange={(e) => handleInputChange('EmploymentStatus', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select Status</option>
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Contract">Contract</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  value={editedDetails?.Location || ''}
                  onChange={(e) => handleInputChange('Location', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  placeholder="Enter work location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                <input
                  type="date"
                  value={editedDetails?.HireDate || ''}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Years of Service</label>
                <input
                  type="text"
                  value={calculateYearsOfService()}
                  className="mt-1 w-full bg-blue-50 text-black p-2 rounded border border-blue-100"
                  disabled
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Salary Components</h2>
              <button
                onClick={() => {
                  const newComponent = {
                    Component: '',
                    Amount: 0,
                    Currency: 'PHP',
                    PayFrequency: 'Monthly',
                    DirectDeposit: 0
                  };
                  const updatedComponents = [...(editedDetails?.SalaryComponents || []), newComponent];
                  handleInputChange('SalaryComponents', JSON.stringify(updatedComponents));
                }}
                className="bg-[#800000] text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-red-800"
              >
                + Add Component
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direct Deposit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(editedDetails?.SalaryComponents || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No salary components added yet
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'report-to' && (
          <div>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Supervisors</h3>
                <button 
                  onClick={() => {/* Add supervisor handler */}}
                  className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800"
                >
                  + Add
                </button>
              </div>
              {/* Add supervisors table */}
            </div>
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Subordinates</h3>
                <button 
                  onClick={() => {/* Add subordinate handler */}}
                  className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800"
                >
                  + Add
                </button>
              </div>
              {/* Add subordinates table */}
            </div>
          </div>
        )}

        {activeTab === 'qualifications' && (
          <div className="space-y-8">
            {/* Work Experience Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Work Experience</h2>
                <button
                  onClick={() => {
                    const newExperience = {
                      Company: '',
                      JobTitle: '',
                      FromDate: '',
                      ToDate: '',
                      Comment: ''
                    };
                    const updatedExperience = [...(editedDetails?.WorkExperience || []), newExperience];
                    handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                  }}
                  className="bg-[#800000] text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-red-800"
                >
                  + Add Experience
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(editedDetails?.WorkExperience || []).map((experience, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={experience.Company}
                            onChange={(e) => {
                              const updatedExperience = [...(editedDetails?.WorkExperience || [])];
                              updatedExperience[index] = { ...experience, Company: e.target.value };
                              handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            placeholder="Company Name"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={experience.JobTitle}
                            onChange={(e) => {
                              const updatedExperience = [...(editedDetails?.WorkExperience || [])];
                              updatedExperience[index] = { ...experience, JobTitle: e.target.value };
                              handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            placeholder="Job Title"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={experience.FromDate}
                            onChange={(e) => {
                              const updatedExperience = [...(editedDetails?.WorkExperience || [])];
                              updatedExperience[index] = { ...experience, FromDate: e.target.value };
                              handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={experience.ToDate}
                            onChange={(e) => {
                              const updatedExperience = [...(editedDetails?.WorkExperience || [])];
                              updatedExperience[index] = { ...experience, ToDate: e.target.value };
                              handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={experience.Comment}
                            onChange={(e) => {
                              const updatedExperience = [...(editedDetails?.WorkExperience || [])];
                              updatedExperience[index] = { ...experience, Comment: e.target.value };
                              handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            placeholder="Add comment"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              const updatedExperience = [...(editedDetails?.WorkExperience || [])];
                              updatedExperience.splice(index, 1);
                              handleInputChange('WorkExperience', JSON.stringify(updatedExperience));
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(editedDetails?.WorkExperience || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No work experience added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Education Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Education</h2>
                <button
                  onClick={() => {
                    const newEducation = {
                      Level: '',
                      Year: '',
                      GPA: ''
                    };
                    const updatedEducation = [...(editedDetails?.Education || []), newEducation];
                    handleInputChange('Education', JSON.stringify(updatedEducation));
                  }}
                  className="bg-[#800000] text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-red-800"
                >
                  + Add Education
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GPA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(editedDetails?.Education || []).map((education, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <select
                            value={education.Level}
                            onChange={(e) => {
                              const updatedEducation = [...(editedDetails?.Education || [])];
                              updatedEducation[index] = { ...education, Level: e.target.value };
                              handleInputChange('Education', JSON.stringify(updatedEducation));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                          >
                            <option value="">Select Level</option>
                            <option value="High School">High School</option>
                            <option value="Bachelor's">Bachelor's</option>
                            <option value="Master's">Master's</option>
                            <option value="Doctorate">Doctorate</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={education.Year}
                            onChange={(e) => {
                              const updatedEducation = [...(editedDetails?.Education || [])];
                              updatedEducation[index] = { ...education, Year: e.target.value };
                              handleInputChange('Education', JSON.stringify(updatedEducation));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            placeholder="Graduation Year"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={education.GPA}
                            onChange={(e) => {
                              const updatedEducation = [...(editedDetails?.Education || [])];
                              updatedEducation[index] = { ...education, GPA: e.target.value };
                              handleInputChange('Education', JSON.stringify(updatedEducation));
                            }}
                            className="w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                            placeholder="GPA"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              const updatedEducation = [...(editedDetails?.Education || [])];
                              updatedEducation.splice(index, 1);
                              handleInputChange('Education', JSON.stringify(updatedEducation));
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(editedDetails?.Education || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No education records added yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Skills Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Skills</h2>
                <button
                  onClick={() => {
                    const updatedSkills = [...(editedDetails?.Skills || []), ''];
                    handleInputChange('Skills', JSON.stringify(updatedSkills));
                  }}
                  className="bg-[#800000] text-white px-3 py-1 rounded flex items-center gap-2 hover:bg-red-800"
                >
                  + Add Skill
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(editedDetails?.Skills || []).map((skill, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => {
                        const updatedSkills = [...(editedDetails?.Skills || [])];
                        updatedSkills[index] = e.target.value;
                        handleInputChange('Skills', JSON.stringify(updatedSkills));
                      }}
                      className="flex-1 bg-gray-50 text-black p-2 rounded border border-gray-300"
                      placeholder="Enter skill"
                    />
                    <button
                      onClick={() => {
                        const updatedSkills = [...(editedDetails?.Skills || [])];
                        updatedSkills.splice(index, 1);
                        handleInputChange('Skills', JSON.stringify(updatedSkills));
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {(editedDetails?.Skills || []).length === 0 && (
                  <div className="col-span-full text-center text-gray-500">
                    No skills added yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalData;