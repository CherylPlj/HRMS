"use client";

import React, { useEffect, useState } from 'react';
import { UserCircle, IdCard, Phone, Users, GraduationCap, Briefcase, HeartHandshake, BookOpen, Info, Plus, Upload, Pen, Eye, Camera, Heart, MoreHorizontal, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import EducationTab from './tabs/EducationTab';
import FamilyTab from './tabs/FamilyTab';
import WorkExperienceTab from './tabs/WorkExperienceTab';
import SkillsTab from './tabs/SkillsTab';
import CertificatesTab from './tabs/CertificatesTab';
import MedicalTab from './tabs/MedicalTab';
import PromotionHistoryTab from './tabs/PromotionHistoryTab';
import GovernmentIDsTab from './tabs/GovernmentIDsTab';
import ContactInfoTab from './tabs/ContactInfoTab';
import { fetchWithRetry } from '@/lib/apiUtils';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FacultyDetails {
  // Basic Employee Info
  EmployeeID: string;
  UserID: string;
  LastName: string;
  FirstName: string;
  MiddleName: string | null;
  ExtensionName: string | null;
  Sex: string | null;
  Photo: string | null;
  DateOfBirth: string;
  PlaceOfBirth: string | null;
  CivilStatus: string | null;
  Nationality: string | null;
  Religion: string | null;
  Email: string | null;
  DepartmentID: number | null;
  ContractID: number | null;
  Position: string | null;
  HireDate: string;
  DepartmentName?: string;

  // Contact Info
  Phone: string | null;
  PresentAddress: string | null;
  PermanentAddress: string | null;
  EmergencyContactName: string | null;
  EmergencyContactNumber: string | null;

  // Government IDs
  SSSNumber: string | null;
  TINNumber: string | null;
  PhilHealthNumber: string | null;
  PagIbigNumber: string | null;
  GSISNumber: string | null;
  PRCLicenseNumber: string | null;
  PRCValidity: string | null;

  // Employment Details
  EmploymentStatus: string;
  ResignationDate: string | null;
  Designation: string | null;
  EmployeeType: string | null;
  SalaryGrade: string | null;

  // Medical Information
  MedicalCondition: string | null;
  Allergies: string | null;
  LastMedicalCheckup: string | null;

  // Metadata
  createdAt?: Date | null;
  updatedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
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
  LastName?: string;
  FirstName?: string;
  MiddleName?: string;
  ExtensionName?: string;
  PlaceOfBirth?: string;
  DateOfBirth?: string;
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
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [lastEditTime, setLastEditTime] = useState<number>(0);
  
  // Photo modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Separate edit states for each tab
  const [editingTabs, setEditingTabs] = useState<{
    personal: boolean;
    government: boolean;
    contact: boolean;
    family: boolean;
    education: boolean;
    employment: boolean;
    medical: boolean;
    other: boolean;
  }>({
    personal: false,
    government: false,
    contact: false,
    family: false,
    education: false,
    employment: false,
    medical: false,
    other: false,
  });

  interface ClerkUserData {
    firstName: string;
    lastName: string;
    emailAddresses: { emailAddress: string }[];
  }

  const syncClerkDataWithFaculty = async (userData: ClerkUserData) => {
    if (!userData || !facultyDetails?.EmployeeID) return;

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
      console.log('Fetching user data for email:', userEmail);
      const { data: userData, error: userError } = await supabase
        .from('User')
        .select('UserID, Email, EmployeeID')
        .eq('Email', userEmail)
        .single();

      console.log('User data result:', { userData, userError });

      if (userError) {
        console.error('User lookup error:', userError);
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

      // If we have EmployeeID directly in User table, use that
      if (userData.EmployeeID) {
        console.log('Found EmployeeID in User record:', userData.EmployeeID);
        
        // Use the simplified API endpoint with retry logic
        try {
          const response = await fetchWithRetry(`/api/employees/${userData.EmployeeID}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch employee data');
          }

          const employeeData = await response.json();
          console.log('Successfully fetched employee data:', employeeData);

          // Transform and use the data directly
          const transformedData: FacultyDetails = {
            EmployeeID: employeeData.EmployeeID,
            UserID: employeeData.UserID,
            LastName: employeeData.LastName || '',
            FirstName: employeeData.FirstName || '',
            MiddleName: employeeData.MiddleName || '',
            ExtensionName: employeeData.ExtensionName || '',
            Sex: employeeData.Sex || '',
            Photo: employeeData.Photo || '',
            DateOfBirth: employeeData.DateOfBirth || '',
            PlaceOfBirth: employeeData.PlaceOfBirth || '',
            CivilStatus: employeeData.CivilStatus || '',
            Nationality: employeeData.Nationality || '',
            Religion: employeeData.Religion || '',
            Email: employeeData.ContactInfo?.Email || employeeData.Email || '',
            DepartmentID: employeeData.DepartmentID,
            ContractID: employeeData.ContractID,
            Position: employeeData.EmploymentDetail?.Position || '',
            HireDate: employeeData.EmploymentDetail?.HireDate || '',
            DepartmentName: employeeData.Department?.DepartmentName || '',

            // Contact Info
            Phone: employeeData.ContactInfo?.Phone || '',
            PresentAddress: employeeData.ContactInfo?.PresentAddress || '',
            PermanentAddress: employeeData.ContactInfo?.PermanentAddress || '',
            EmergencyContactName: employeeData.ContactInfo?.EmergencyContactName || '',
            EmergencyContactNumber: employeeData.ContactInfo?.EmergencyContactNumber || '',

            // Government IDs
            SSSNumber: employeeData.GovernmentID?.SSSNumber || '',
            TINNumber: employeeData.GovernmentID?.TINNumber || '',
            PhilHealthNumber: employeeData.GovernmentID?.PhilHealthNumber || '',
            PagIbigNumber: employeeData.GovernmentID?.PagIbigNumber || '',
            GSISNumber: employeeData.GovernmentID?.GSISNumber || '',
            PRCLicenseNumber: employeeData.GovernmentID?.PRCLicenseNumber || '',
            PRCValidity: employeeData.GovernmentID?.PRCValidity || '',

            // Employment Details
            EmploymentStatus: employeeData.EmploymentDetail?.EmploymentStatus || '',
            ResignationDate: employeeData.EmploymentDetail?.ResignationDate || null,
            Designation: employeeData.EmploymentDetail?.Designation || null,
            EmployeeType: employeeData.EmploymentDetail?.EmployeeType || '',
            SalaryGrade: employeeData.EmploymentDetail?.SalaryGrade || '',

            // Medical Information
            MedicalCondition: employeeData.MedicalInfo?.medicalNotes || '',
            Allergies: employeeData.MedicalInfo?.allergies || '',
            LastMedicalCheckup: employeeData.MedicalInfo?.lastCheckup || '',

            // Metadata
            createdAt: employeeData.createdAt || null,
            updatedAt: employeeData.updatedAt || null,
            createdBy: employeeData.createdBy || null,
            updatedBy: employeeData.updatedBy || null
          };

          setFacultyDetails(transformedData);
          
          // Only set editedDetails if user is not actively editing
          if (!isUserActivelyEditing()) {
            setEditedDetails(transformedData);
          } else {
            console.log('User is actively editing during initial load, not updating editedDetails');
          }
          
          setNotification(null);
          return;
        } catch (error) {
          console.error('Error fetching employee data via API:', error);
          // Fall through to the alternative lookup method below
        }
      }

      // Get employee data with all related information via API
      console.log('Looking up employee with UserID:', userData.UserID);
      
      // First try to get all employees and find the one with matching UserID or Email
      try {
        const employeesResponse = await fetchWithRetry('/api/employees');
        
        if (!employeesResponse.ok) {
          throw new Error('Failed to fetch employee list');
        }
        
        const employees = await employeesResponse.json();
        const employeeMatch = employees.find((emp: any) => 
          emp.UserID === userData.UserID || emp.Email === userEmail
        );
        
        if (!employeeMatch) {
          console.error('No employee record found for:', { 
            UserID: userData.UserID, 
            Email: userEmail 
          });
          setNotification({
            type: 'error',
            message: 'Unable to find your employee record. Please contact HR.'
          });
          return;
        }
        
                 console.log('Found employee match:', employeeMatch);
         const response = await fetchWithRetry(`/api/employees/${employeeMatch.EmployeeID}`);
         
         if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || 'Failed to fetch employee data');
         }
         
         const employeeData = await response.json();
         
         // Transform the data to match our interface
         const transformedData: FacultyDetails = {
           EmployeeID: employeeData.EmployeeID,
           UserID: employeeData.UserID,
           LastName: employeeData.LastName || '',
           FirstName: employeeData.FirstName || '',
           MiddleName: employeeData.MiddleName || '',
           ExtensionName: employeeData.ExtensionName || '',
           Sex: employeeData.Sex || '',
           Photo: employeeData.Photo || '',
           DateOfBirth: employeeData.DateOfBirth || '',
           PlaceOfBirth: employeeData.PlaceOfBirth || '',
           CivilStatus: employeeData.CivilStatus || '',
           Nationality: employeeData.Nationality || '',
           Religion: employeeData.Religion || '',
           Email: employeeData.ContactInfo?.Email || employeeData.Email || '',
           DepartmentID: employeeData.DepartmentID,
           ContractID: employeeData.ContractID,
           Position: employeeData.EmploymentDetail?.Position || employeeData.Position || '',
           HireDate: employeeData.EmploymentDetail?.HireDate || employeeData.HireDate || '',
           DepartmentName: employeeData.Department?.DepartmentName || '',

           // Contact Info
           Phone: employeeData.ContactInfo?.Phone || '',
           PresentAddress: employeeData.ContactInfo?.PresentAddress || '',
           PermanentAddress: employeeData.ContactInfo?.PermanentAddress || '',
           EmergencyContactName: employeeData.ContactInfo?.EmergencyContactName || '',
           EmergencyContactNumber: employeeData.ContactInfo?.EmergencyContactNumber || '',

           // Government IDs
           SSSNumber: employeeData.GovernmentID?.SSSNumber || '',
           TINNumber: employeeData.GovernmentID?.TINNumber || '',
           PhilHealthNumber: employeeData.GovernmentID?.PhilHealthNumber || '',
           PagIbigNumber: employeeData.GovernmentID?.PagIbigNumber || '',
           GSISNumber: employeeData.GovernmentID?.GSISNumber || '',
           PRCLicenseNumber: employeeData.GovernmentID?.PRCLicenseNumber || '',
           PRCValidity: employeeData.GovernmentID?.PRCValidity || '',

           // Employment Details
           EmploymentStatus: employeeData.EmploymentDetail?.EmploymentStatus || employeeData.EmploymentStatus || '',
           ResignationDate: employeeData.EmploymentDetail?.ResignationDate || null,
           Designation: employeeData.EmploymentDetail?.Designation || null,
           EmployeeType: employeeData.EmploymentDetail?.EmployeeType || '',
           SalaryGrade: employeeData.EmploymentDetail?.SalaryGrade || '',

           // Medical Information
           MedicalCondition: employeeData.MedicalInfo?.medicalNotes || '',
           Allergies: employeeData.MedicalInfo?.allergies || '',
           LastMedicalCheckup: employeeData.MedicalInfo?.lastCheckup || '',

           // Metadata
           createdAt: employeeData.createdAt || null,
           updatedAt: employeeData.updatedAt || null,
           createdBy: employeeData.createdBy || null,
           updatedBy: employeeData.updatedBy || null
         };

         setFacultyDetails(transformedData);
         
         // Only set editedDetails if user is not actively editing
         if (!isUserActivelyEditing()) {
           setEditedDetails(transformedData);
         } else {
           console.log('User is actively editing during initial load, not updating editedDetails');
         }
         
         setNotification(null);
       } catch (error) {
         console.error('Error fetching employee via API lookup:', error);
         setNotification({
           type: 'error',
           message: 'Failed to load employee data. Please try again later.'
         });
         return;
       }
      
      // Set up real-time subscription for updates
      if (!subscription) {
        const newSubscription = supabase
          .channel('employee_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'Employee',
            filter: `UserID=eq.${userData.UserID}`
          }, async () => {
            // Fetch updated data from API when changes occur
            if (facultyDetails?.UserID) {
              try {
                const response = await fetchWithRetry(`/api/employees/${facultyDetails.EmployeeID}`);
                if (response.ok) {
                  const updatedData = await response.json();
                  // Transform the updated data and set state
                  const transformedUpdatedData: FacultyDetails = {
                    EmployeeID: updatedData.EmployeeID,
                    UserID: updatedData.UserID,
                    LastName: updatedData.LastName || '',
                    FirstName: updatedData.FirstName || '',
                    MiddleName: updatedData.MiddleName || '',
                    ExtensionName: updatedData.ExtensionName || '',
                    Sex: updatedData.Sex || '',
                    Photo: updatedData.Photo || '',
                    DateOfBirth: updatedData.DateOfBirth || '',
                    PlaceOfBirth: updatedData.PlaceOfBirth || '',
                    CivilStatus: updatedData.CivilStatus || '',
                    Nationality: updatedData.Nationality || '',
                    Religion: updatedData.Religion || '',
                    Email: updatedData.ContactInfo?.Email || updatedData.Email || '',
                    DepartmentID: updatedData.DepartmentID,
                    ContractID: updatedData.ContractID,
                    Position: updatedData.EmploymentDetail?.Position || updatedData.Position || '',
                    HireDate: updatedData.EmploymentDetail?.HireDate || updatedData.HireDate || '',
                    DepartmentName: updatedData.Department?.DepartmentName || '',
                    Phone: updatedData.ContactInfo?.Phone || '',
                    PresentAddress: updatedData.ContactInfo?.PresentAddress || '',
                    PermanentAddress: updatedData.ContactInfo?.PermanentAddress || '',
                    EmergencyContactName: updatedData.ContactInfo?.EmergencyContactName || '',
                    EmergencyContactNumber: updatedData.ContactInfo?.EmergencyContactNumber || '',
                    SSSNumber: updatedData.GovernmentID?.SSSNumber || '',
                    TINNumber: updatedData.GovernmentID?.TINNumber || '',
                    PhilHealthNumber: updatedData.GovernmentID?.PhilHealthNumber || '',
                    PagIbigNumber: updatedData.GovernmentID?.PagIbigNumber || '',
                    GSISNumber: updatedData.GovernmentID?.GSISNumber || '',
                    PRCLicenseNumber: updatedData.GovernmentID?.PRCLicenseNumber || '',
                    PRCValidity: updatedData.GovernmentID?.PRCValidity || '',
                    EmploymentStatus: updatedData.EmploymentDetail?.EmploymentStatus || updatedData.EmploymentStatus || '',
                    ResignationDate: updatedData.EmploymentDetail?.ResignationDate || null,
                    Designation: updatedData.EmploymentDetail?.Designation || null,
                    EmployeeType: updatedData.EmploymentDetail?.EmployeeType || '',
                    SalaryGrade: updatedData.EmploymentDetail?.SalaryGrade || '',
                    MedicalCondition: updatedData.MedicalInfo?.medicalNotes || '',
                    Allergies: updatedData.MedicalInfo?.allergies || '',
                    LastMedicalCheckup: updatedData.MedicalInfo?.lastCheckup || '',
                    createdAt: updatedData.createdAt || null,
                    updatedAt: updatedData.updatedAt || null,
                    createdBy: updatedData.createdBy || null,
                    updatedBy: updatedData.updatedBy || null
                  };
                  
                  // Always update facultyDetails with the latest data
                  setFacultyDetails(transformedUpdatedData);
                  
                  // Only update editedDetails if user is not actively editing
                  if (!isUserActivelyEditing()) {
                    setEditedDetails(transformedUpdatedData);
                  } else {
                    console.log('User is actively editing, not updating editedDetails to preserve input');
                  }
                }
              } catch (error) {
                console.error('Error updating data from subscription:', error);
              }
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

  useEffect(() => {
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
    setSameAsPresentAddress(false);
  };

  // Tab-specific edit functions
  const handleStartEditTab = (tabName: keyof typeof editingTabs) => {
    setEditedDetails(facultyDetails ? { ...facultyDetails } : null);
    setEditingTabs(prev => ({ ...prev, [tabName]: true }));
    setSameAsPresentAddress(false);
    setValidationErrors({});
    setLastEditTime(Date.now());
  };

  const handleCancelEditTab = (tabName: keyof typeof editingTabs) => {
    setEditingTabs(prev => ({ ...prev, [tabName]: false }));
    setEditedDetails(facultyDetails);
    setSameAsPresentAddress(false);
    setValidationErrors({});
  };

  const handleSaveTab = async (tabName: keyof typeof editingTabs) => {
    if (!editedDetails || !user) {
      setNotification({
        type: 'error',
        message: 'No data to save. Please try again.'
      });
      return;
    }

    // Validate only the fields relevant to the current tab
    if (!validateTabForm(tabName)) {
      setNotification({
        type: 'error',
        message: 'Please fix the validation errors before saving.'
      });
      return;
    }

    try {
      setLoading(true);
      
      if (!editedDetails.EmployeeID) {
        setNotification({
          type: 'error',
          message: 'Employee ID not found. Please contact IT support.'
        });
        return;
      }

      // Log the data being sent for debugging
      const dataToSend = {
        ...editedDetails,
        DateOfBirth: new Date(editedDetails.DateOfBirth).toISOString(),
        HireDate: new Date(editedDetails.HireDate).toISOString(),
        ResignationDate: editedDetails.ResignationDate ? new Date(editedDetails.ResignationDate).toISOString() : null,
        PRCValidity: editedDetails.PRCValidity ? new Date(editedDetails.PRCValidity).toISOString() : null,
        LastMedicalCheckup: editedDetails.LastMedicalCheckup ? new Date(editedDetails.LastMedicalCheckup).toISOString() : null,
        MedicalCondition: editedDetails.MedicalCondition || null,
        Allergies: editedDetails.Allergies || null
      };

      console.log('Saving data for tab:', tabName);
      console.log('Data being sent:', dataToSend);
      console.log('Government IDs being sent:', {
        SSSNumber: dataToSend.SSSNumber,
        TINNumber: dataToSend.TINNumber,
        PhilHealthNumber: dataToSend.PhilHealthNumber,
        PagIbigNumber: dataToSend.PagIbigNumber,
        GSISNumber: dataToSend.GSISNumber,
        PRCLicenseNumber: dataToSend.PRCLicenseNumber,
        PRCValidity: dataToSend.PRCValidity,
      });
      console.log('Contact Info being sent:', {
        Email: dataToSend.Email,
        Phone: dataToSend.Phone,
        PresentAddress: dataToSend.PresentAddress,
        PermanentAddress: dataToSend.PermanentAddress,
        EmergencyContactName: dataToSend.EmergencyContactName,
        EmergencyContactNumber: dataToSend.EmergencyContactNumber,
      });

      const response = await fetch(`/api/employees/${editedDetails.EmployeeID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        let errorMessage = 'Failed to save changes';
        
        try {
          const errorData = await response.json();
          console.log('Error data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.log('Parse error:', parseError);
          if (response.status === 405) {
            errorMessage = 'Method not allowed. Please contact support.';
          } else if (response.status === 401) {
            errorMessage = 'You are not authorized to perform this action.';
          } else if (response.status === 404) {
            errorMessage = 'Employee not found.';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Response data received:', data);
      
      // Transform the API response to match our FacultyDetails interface
      const transformedData: FacultyDetails = {
        // Basic Employee Info
        EmployeeID: data.EmployeeID,
        UserID: data.UserID,
        LastName: data.LastName || '',
        FirstName: data.FirstName || '',
        MiddleName: data.MiddleName || '',
        ExtensionName: data.ExtensionName || '',
        Sex: data.Sex || '',
        Photo: data.Photo || '',
        DateOfBirth: data.DateOfBirth || '',
        PlaceOfBirth: data.PlaceOfBirth || '',
        CivilStatus: data.CivilStatus || '',
        Nationality: data.Nationality || '',
        Religion: data.Religion || '',
        DepartmentID: data.DepartmentID,
        ContractID: data.ContractID,
        Position: data.EmploymentDetail?.Position || data.Position || '',
        HireDate: data.EmploymentDetail?.HireDate || data.HireDate || '',
        DepartmentName: data.Department?.DepartmentName || '',

        // Contact Info - from nested ContactInfo object
        Email: data.ContactInfo?.Email || data.Email || '',
        Phone: data.ContactInfo?.Phone || '',
        PresentAddress: data.ContactInfo?.PresentAddress || '',
        PermanentAddress: data.ContactInfo?.PermanentAddress || '',
        EmergencyContactName: data.ContactInfo?.EmergencyContactName || '',
        EmergencyContactNumber: data.ContactInfo?.EmergencyContactNumber || '',

        // Government IDs - from nested GovernmentID object
        SSSNumber: data.GovernmentID?.SSSNumber || '',
        TINNumber: data.GovernmentID?.TINNumber || '',
        PhilHealthNumber: data.GovernmentID?.PhilHealthNumber || '',
        PagIbigNumber: data.GovernmentID?.PagIbigNumber || '',
        GSISNumber: data.GovernmentID?.GSISNumber || '',
        PRCLicenseNumber: data.GovernmentID?.PRCLicenseNumber || '',
        PRCValidity: data.GovernmentID?.PRCValidity || '',

        // Employment Details
        EmploymentStatus: data.EmploymentDetail?.EmploymentStatus || data.EmploymentStatus || '',
        ResignationDate: data.EmploymentDetail?.ResignationDate || null,
        Designation: data.EmploymentDetail?.Designation || null,
        EmployeeType: data.EmploymentDetail?.EmployeeType || '',
        SalaryGrade: data.EmploymentDetail?.SalaryGrade || '',

        // Medical Information
        MedicalCondition: data.MedicalInfo?.medicalNotes || '',
        Allergies: data.MedicalInfo?.allergies || '',
        LastMedicalCheckup: data.MedicalInfo?.lastCheckup || '',

        // Metadata
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        createdBy: data.createdBy || null,
        updatedBy: data.updatedBy || null
      };

      console.log('Transformed data:', transformedData);

      setFacultyDetails(transformedData);
      setEditedDetails(transformedData);
      setEditingTabs(prev => ({ ...prev, [tabName]: false }));
      setValidationErrors({});
      showSuccessNotification('Changes saved successfully!');
      
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

  // Tab-specific validation
// Name and Place of Birth validation
const validateNameOrPlace = (value: string, fieldLabel: string): string | undefined => {
  if (!value) return undefined;
  // Only allow letters, spaces, and hyphens
  const regex = /^[A-Za-z\s-]+$/;
  if (!regex.test(value)) {
    return `${fieldLabel} must only contain letters, spaces, or hyphens`;
  }
  if (value.length < 2) {
    return `${fieldLabel} must be at least 2 characters long`;
  }
  if (value.length > 100) {
    return `${fieldLabel} must not exceed 100 characters`;
  }
  return undefined;
};

// Date of Birth validation
const validateDateOfBirth = (dob: string): string | undefined => {
  if (!dob) return 'Date of Birth is required';
  const date = new Date(dob);
  if (isNaN(date.getTime())) return 'Invalid date format';
  const year = date.getFullYear();
  if (year >= 1920 && year <= 1930) return 'Year of birth cannot be between 1920 and 1930';
  const now = new Date();
  let age = now.getFullYear() - year;
  // Adjust for month/day
  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  ) {
    age--;
  }
  if (age < 18) return 'You must be at least 18 years old';
  if (age > 100) return 'Date of Birth is not realistic';
  return undefined;
};
  const validateTabForm = (tabName: keyof typeof editingTabs): boolean => {
    const errors: ValidationErrors = {};
    
    if (!editedDetails) return false;

    switch (tabName) {
      case 'personal':
        errors.LastName = validateNameOrPlace(editedDetails.LastName || '', 'Last Name');
        errors.FirstName = validateNameOrPlace(editedDetails.FirstName || '', 'First Name');
        if (editedDetails.MiddleName)
          errors.MiddleName = validateNameOrPlace(editedDetails.MiddleName, 'Middle Name');
        if (editedDetails.ExtensionName)
          errors.ExtensionName = validateNameOrPlace(editedDetails.ExtensionName, 'Extension Name');
        if (editedDetails.PlaceOfBirth)
          errors.PlaceOfBirth = validateNameOrPlace(editedDetails.PlaceOfBirth, 'Place of Birth');
        errors.DateOfBirth = validateDateOfBirth(editedDetails.DateOfBirth);
        break;
      case 'contact':
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
        break;
      case 'government':
        // Government IDs don't need special validation
        break;
      default:
        // Other tabs don't need validation here
        break;
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== undefined);
  };

  // Check if any tab is currently being edited
  const isAnyTabEditing = () => {
    return ['personal', 'government', 'contact'].some(tabId => 
      editingTabs[tabId as keyof typeof editingTabs]
    );
  };

  // Helper function to check if user is actively editing
  const isUserActivelyEditing = () => {
    const timeSinceLastEdit = Date.now() - lastEditTime;
    const hasRecentEdit = timeSinceLastEdit < 5000; // 5 seconds
    const hasActiveTab = isAnyTabEditing();
    
    return hasRecentEdit || hasActiveTab;
  };

  // Handle tab switching with unsaved changes warning
  const handleTabSwitch = (tabId: string) => {
    // Only check for unsaved changes on tabs that use the main editing system
    if (['personal', 'government', 'contact'].includes(activeTab)) {
      const currentTabEditing = editingTabs[activeTab as keyof typeof editingTabs];
      
      if (currentTabEditing) {
        const hasChanges = JSON.stringify(editedDetails) !== JSON.stringify(facultyDetails);
        
        if (hasChanges) {
          const confirmSwitch = confirm(
            'You have unsaved changes in the current tab. Do you want to switch tabs and lose these changes?'
          );
          
          if (!confirmSwitch) {
            return;
          }
          
          // Cancel editing for current tab
          handleCancelEditTab(activeTab as keyof typeof editingTabs);
        }
      }
    }
    
    setActiveTab(tabId);
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

  const calculateYearsOfService = (hireDate: string): string => {
    if (!hireDate) return 'N/A';
    const start = new Date(hireDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    return `${years} years`;
  };

  const handleInputChange = (field: string, value: string) => {
    if (!editedDetails) return;

    console.log('Handling input change:', { field, value });

    // Update the last edit time to track active editing
    const currentTime = Date.now();
    setLastEditTime(currentTime);

    setEditedDetails((prev) => {
      if (!prev) return null;
      let processedValue: any = value;
      if (field === 'DateOfBirth' || field === 'HireDate' || field === 'ResignationDate' || 
          field === 'PRCValidity' || field === 'LastMedicalCheckup') {
        processedValue = value || null;
      }
      if (field === 'DepartmentID' || field === 'ContractID') {
        processedValue = value ? parseInt(value, 10) : null;
      }
      const updatedDetails = {
        ...prev,
        [field]: processedValue
      };
      return updatedDetails;
    });

    // Real-time validation for name and place fields
    let error: string | undefined;
    if (["LastName", "FirstName", "MiddleName", "ExtensionName", "PlaceOfBirth"].includes(field)) {
      error = validateNameOrPlace(value, field.replace(/([A-Z])/g, ' $1').trim());
    } else if (field === "DateOfBirth") {
      error = validateDateOfBirth(value);
    } else {
      error = undefined;
    }
    setValidationErrors((prev) => ({
      ...prev,
      [field]: error
    }));
  };

  const handleSameAsPresentAddress = (checked: boolean) => {
    setSameAsPresentAddress(checked);
    if (checked && editedDetails?.PresentAddress) {
      handleInputChange('PermanentAddress', editedDetails.PresentAddress);
    }
  };

  // Photo handling functions
  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000); // Hide after 3 seconds
  };

  const handlePhotoClick = () => {
    if (editingTabs.personal) {
      setShowPhotoModal(true);
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  };

  const handlePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setNotification({
          type: 'error',
          message: 'Please select an image file (PNG, JPG, JPEG, etc.)'
        });
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setNotification({
          type: 'error',
          message: 'File size must be less than 5MB'
        });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !editedDetails?.EmployeeID) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photo');
      }

      const result = await response.json();
      
      // Update the edited details with the new photo URL
      const updatedDetails = { ...editedDetails, Photo: result.url };
      
      // Save the updated details to the database
      const saveResponse = await fetch(`/api/employees/${editedDetails.EmployeeID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDetails),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Failed to save photo to database');
      }

      // Update both editedDetails and facultyDetails
      setEditedDetails(updatedDetails);
      setFacultyDetails(prev => prev ? { ...prev, Photo: result.url } : null);
      
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      
      showSuccessNotification('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload photo. Please try again.'
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveExistingPhoto = async () => {
    if (!editedDetails?.EmployeeID) return;

    setUploadingPhoto(true);
    try {
      // Update the edited details to remove the photo
      const updatedDetails = { ...editedDetails, Photo: null };
      
      const response = await fetch(`/api/employees/${editedDetails.EmployeeID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDetails),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove photo');
      }

      const result = await response.json();
      
      // Update both editedDetails and facultyDetails
      setEditedDetails(updatedDetails);
      setFacultyDetails(prev => prev ? { ...prev, Photo: null } : null);
      setShowPhotoModal(false);
      
      showSuccessNotification('Photo removed successfully!');
    } catch (error) {
      console.error('Error removing photo:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to remove photo. Please try again.'
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Define tabs configuration
  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: UserCircle },
    { id: 'government', label: 'Government IDs', icon: IdCard },
    { id: 'contact', label: 'Contact Information', icon: Phone },
    { id: 'family', label: 'Family Background', icon: Users },
    { id: 'education', label: 'Educational Background', icon: GraduationCap },
    { id: 'employment', label: 'Employment History', icon: Briefcase },
    { id: 'medical', label: 'Medical Information', icon: Heart },
    { id: 'other', label: 'Other Information', icon: MoreHorizontal }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="font-medium">{successMessage}</span>
          <button
            title="notif"
            onClick={() => setShowSuccessToast(false)}
            className="ml-2 hover:bg-green-600 rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-gray-300"></div>
          
          {/* Photo and Name Section */}
          <div className="flex items-center gap-4">
            {/* Photo Display */}
            <div 
              className={`relative ${editingTabs.personal ? 'cursor-pointer' : ''}`}
              onClick={handlePhotoClick}
            >
              {facultyDetails?.Photo ? (
                <img
                  src={facultyDetails.Photo}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 hover:border-[#800000] transition-colors"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 hover:border-[#800000] transition-colors">
                  <UserCircle className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              {/* Edit indicator */}
              {editingTabs.personal && (
                <div className="absolute -bottom-1 -right-1 bg-[#800000] text-white rounded-full p-1">
                  <Camera className="w-3 h-3" />
                </div>
              )}
            </div>
            
            {/* Name */}
            <h1 className="text-2xl font-bold text-gray-800">
              {facultyDetails ? `${facultyDetails.FirstName || ''} ${facultyDetails.MiddleName ? facultyDetails.MiddleName + ' ' : ''}${facultyDetails.LastName || ''}`.trim() : 'Personal Data'}
            </h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Only show edit buttons for specific tabs that use the main editing system */}
          {['personal', 'government', 'contact'].includes(activeTab) ? (
            editingTabs[activeTab as keyof typeof editingTabs] ? (
              <>
                <button
                  onClick={() => handleSaveTab(activeTab as keyof typeof editingTabs)}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancelEditTab(activeTab as keyof typeof editingTabs)}
                  className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => handleStartEditTab(activeTab as keyof typeof editingTabs)}
                className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
              >
                <Pen size={16} /> Edit
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b">
        <nav className="flex space-x-4">
          {tabs.map((tab) => {
            // Only show editing indicators for tabs that use the main editing system
            const isMainEditingTab = ['personal', 'government', 'contact'].includes(tab.id);
            const isTabEditing = isMainEditingTab ? editingTabs[tab.id as keyof typeof editingTabs] : false;
            const hasChanges = isTabEditing && JSON.stringify(editedDetails) !== JSON.stringify(facultyDetails);
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`py-2 px-4 flex items-center gap-2 relative ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[#800000] text-[#800000]'
                    : 'text-gray-500'
                } ${isTabEditing ? 'bg-yellow-50' : ''}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {isTabEditing && (
                  <span className="ml-1 text-xs bg-yellow-500 text-white px-1 rounded-full">
                    {hasChanges ? 'Modified' : 'Editing'}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Unsaved Changes Warning - only for main editing tabs */}
        {['personal', 'government', 'contact'].includes(activeTab) && editingTabs[activeTab as keyof typeof editingTabs] && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-yellow-800">
                You have unsaved changes. Please save or cancel your changes before switching tabs.
              </span>
            </div>
          </div>
        )}

        {/* Personal Information Tab */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              {editingTabs.personal ? (
                <>
                  <input
                    title="Last Name"
                    type="text"
                    value={editedDetails?.LastName || ''}
                    onChange={(e) => handleInputChange('LastName', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                  {validationErrors.LastName && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.LastName}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.LastName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              {editingTabs.personal ? (
                <>
                  <input
                    title="First Name"
                    type="text"
                    value={editedDetails?.FirstName || ''}
                    onChange={(e) => handleInputChange('FirstName', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                  {validationErrors.FirstName && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.FirstName}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.FirstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Middle Name</label>
              {editingTabs.personal ? (
                <>
                  <input
                    title="Middle Name"
                    type="text"
                    value={editedDetails?.MiddleName || ''}
                    onChange={(e) => handleInputChange('MiddleName', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                  {validationErrors.MiddleName && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.MiddleName}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.MiddleName || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Extension Name</label>
              {editingTabs.personal ? (
                <>
                  <input
                    title="Extension Name"
                    type="text"
                    value={editedDetails?.ExtensionName || ''}
                    onChange={(e) => handleInputChange('ExtensionName', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                  {validationErrors.ExtensionName && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.ExtensionName}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.ExtensionName || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sex</label>
              {editingTabs.personal ? (
                <select
                  title="Sex"
                  value={editedDetails?.Sex || ''}
                  onChange={(e) => handleInputChange('Sex', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Intersex">Intersex</option>
                </select>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.Sex}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              {editingTabs.personal ? (
                <input
                  title="Date of Birth"
                  type="date"
                  value={editedDetails?.DateOfBirth || ''}
                  onChange={(e) => handleInputChange('DateOfBirth', e.target.value)}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  min="1940-01-01"
                  max={(() => {
                    const today = new Date();
                    const year = today.getFullYear() - 18;
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.DateOfBirth}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Place of Birth</label>
              {editingTabs.personal ? (
                <>
                  <input
                    title="Place of Birth"
                    type="text"
                    value={editedDetails?.PlaceOfBirth || ''}
                    onChange={(e) => handleInputChange('PlaceOfBirth', e.target.value)}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                  {validationErrors.PlaceOfBirth && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.PlaceOfBirth}</p>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-900">{facultyDetails?.PlaceOfBirth || 'N/A'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Civil Status</label>
              {editingTabs.personal ? (
                <select
                  title="Civil Status"
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
          </div>
        )}

        {/* Government IDs Tab */}
        {activeTab === 'government' && (
          <div className="space-y-6">
            <GovernmentIDsTab 
              employeeId={facultyDetails?.EmployeeID || ''}
              governmentIDs={{
                SSSNumber: editingTabs.government ? (editedDetails?.SSSNumber || null) : (facultyDetails?.SSSNumber || null),
                TINNumber: editingTabs.government ? (editedDetails?.TINNumber || null) : (facultyDetails?.TINNumber || null),
                PhilHealthNumber: editingTabs.government ? (editedDetails?.PhilHealthNumber || null) : (facultyDetails?.PhilHealthNumber || null),
                PagIbigNumber: editingTabs.government ? (editedDetails?.PagIbigNumber || null) : (facultyDetails?.PagIbigNumber || null),
                GSISNumber: editingTabs.government ? (editedDetails?.GSISNumber || null) : (facultyDetails?.GSISNumber || null),
                PRCLicenseNumber: editingTabs.government ? (editedDetails?.PRCLicenseNumber || null) : (facultyDetails?.PRCLicenseNumber || null),
                PRCValidity: editingTabs.government ? (editedDetails?.PRCValidity || null) : (facultyDetails?.PRCValidity || null),
              }}
              isEditing={editingTabs.government}
              onInputChange={handleInputChange}
            />
          </div>
        )}

        {/* Contact Information Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <ContactInfoTab 
              employeeId={facultyDetails?.EmployeeID || ''}
              contactInfo={{
                Email: editingTabs.contact ? (editedDetails?.Email || null) : (facultyDetails?.Email || null),
                Phone: editingTabs.contact ? (editedDetails?.Phone || null) : (facultyDetails?.Phone || null),
                PresentAddress: editingTabs.contact ? (editedDetails?.PresentAddress || null) : (facultyDetails?.PresentAddress || null),
                PermanentAddress: editingTabs.contact ? (editedDetails?.PermanentAddress || null) : (facultyDetails?.PermanentAddress || null),
                EmergencyContactName: editingTabs.contact ? (editedDetails?.EmergencyContactName || null) : (facultyDetails?.EmergencyContactName || null),
                EmergencyContactNumber: editingTabs.contact ? (editedDetails?.EmergencyContactNumber || null) : (facultyDetails?.EmergencyContactNumber || null),
              }}
              isEditing={editingTabs.contact}
              onInputChange={handleInputChange}
              validationErrors={validationErrors}
              sameAsPresentAddress={sameAsPresentAddress}
              onSameAsPresentAddressChange={handleSameAsPresentAddress}
            />
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
              
              {/* Current Employment Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-md font-medium text-blue-900 mb-3">Current Position</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700">Position</label>
                    <p className="mt-1 text-sm text-blue-900">{facultyDetails?.Position || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700">Employment Status</label>
                    <p className="mt-1 text-sm text-blue-900">{facultyDetails?.EmploymentStatus || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700">Hire Date</label>
                    <p className="mt-1 text-sm text-blue-900">{facultyDetails?.HireDate || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700">Years of Service</label>
                    <p className="mt-1 text-sm text-blue-900">{calculateYearsOfService(facultyDetails?.HireDate || '')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700">Salary Grade</label>
                    <p className="mt-1 text-sm text-blue-900">{facultyDetails?.SalaryGrade || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Promotion History Timeline */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Position & Salary History</h4>
                <PromotionHistoryTab employeeId={facultyDetails?.EmployeeID || ''} />
              </div>
            </div>

            {/* Previous Work Experience Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Previous Employment History</h3>
              <WorkExperienceTab employeeId={facultyDetails?.EmployeeID || ''} />
            </div>
          </div>
        )}

        {/* Medical Information Tab */}
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <MedicalTab employeeId={facultyDetails?.EmployeeID || ''} />
          </div>
        )}

        {/* Other Information Tab */}
        {activeTab === 'other' && (
          <div className="space-y-8">
            {/* Skills Section */}
            <div>
              <SkillsTab employeeId={facultyDetails?.EmployeeID || ''} />
            </div>

            {/* Certificates Section */}
            <div className="border-t pt-6">
              <CertificatesTab employeeId={facultyDetails?.EmployeeID || ''} />
            </div>
          </div>
        )}
      </div>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Update Profile Photo</h3>
              <button
                title="show photo"
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Current Photo Preview */}
              <div className="text-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Photo</label>
                {facultyDetails?.Photo ? (
                  <img
                    src={facultyDetails.Photo}
                    alt="Current Profile"
                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-2 border-gray-300">
                    <UserCircle className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* New Photo Preview */}
              {photoPreview && (
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Photo Preview</label>
                  <img
                    src={photoPreview}
                    alt="New Profile Preview"
                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-[#800000]"
                  />
                </div>
              )}

              {/* Upload Section */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Upload New Photo
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                    />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {photoFile ? (
                  <>
                    <button
                      onClick={handleUploadPhoto}
                      disabled={uploadingPhoto}
                      className="flex-1 bg-[#800000] text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    <button
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    {facultyDetails?.Photo && (
                      <button
                        onClick={handleRemoveExistingPhoto}
                        disabled={uploadingPhoto}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {uploadingPhoto ? 'Removing...' : 'Remove Current Photo'}
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => setShowPhotoModal(false)}
                  disabled={uploadingPhoto}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
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