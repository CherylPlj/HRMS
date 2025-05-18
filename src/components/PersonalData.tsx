"use client";

import React, { useEffect, useState } from 'react';
import { FaDownload, FaEdit, FaTrash } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FacultyDetails {
  FacultyID: number;
  UserID: number;
  DateOfBirth: string;
  Phone: string | null;
  Address: string | null;
  Employment: string;
  HireDate: string;
  ResignationDate: string | null;
  Position: string;
  Department: number;
  department_name?: string;
  ContractID: number | null;
  EmergencyContact?: string | null;
}

interface PublicMetadata {
  department?: string;
  role?: string;
  facultyData?: {
    position: string;
    department_id: number;
    employment_status: string;
    hire_date: string;
    date_of_birth: string;
    phone?: string;
    address?: string;
  };
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const PersonalData: React.FC = () => {
  const { user } = useUser();
  const [facultyDetails, setFacultyDetails] = useState<FacultyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<FacultyDetails | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

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
          .from('users')
          .select('id, email')
          .eq('email', userEmail)
          .single();

        if (userError) {
          console.error('User lookup error:', userError);
          
          // Check if this is a new faculty member from invitation
          if (publicMetadata?.role === 'Faculty' && publicMetadata.facultyData) {
            // Create faculty record using invitation metadata
            const facultyData = {
              user_id: user.id,
              date_of_birth: new Date(publicMetadata.facultyData.date_of_birth).toISOString(),
              phone: publicMetadata.facultyData.phone || null,
              address: publicMetadata.facultyData.address || null,
              employment_status: publicMetadata.facultyData.employment_status,
              hire_date: new Date(publicMetadata.facultyData.hire_date).toISOString(),
              resignation_date: null,
              position: publicMetadata.facultyData.position,
              department_id: publicMetadata.facultyData.department_id,
              contract_id: null
            };

            const { data: newFacultyData, error: createError } = await supabase
              .from('faculty')
              .insert([facultyData])
              .select(`
                *,
                departments (
                  name
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
                department_name: newFacultyData.departments?.name || 'Unknown Department'
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
          .from('faculty')
          .select(`
            *,
            departments (
              name
            )
          `)
          .eq('user_id', userData.id)
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
          department_name: facultyData.departments?.name || 'Unknown Department'
        };

        setFacultyDetails(transformedData);
        setEditedDetails(transformedData);
        setNotification(null);
      } catch (error: any) {
        console.error('Unexpected error:', error);
        setNotification({
          type: 'error',
          message: 'System error. Please try again later or contact IT support.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFacultyDetails();
  }, [user]);

  const handleDownload = () => {
    if (!facultyDetails) return;

    const downloadData = {
      "Personal Information": {
        "Name": `${user?.firstName} ${user?.lastName}`,
        "Email": user?.emailAddresses[0]?.emailAddress,
        "Phone": facultyDetails.Phone || 'Not set',
        "Address": facultyDetails.Address || 'Not set',
        "Date of Birth": facultyDetails.DateOfBirth,
        "Emergency Contact": facultyDetails.EmergencyContact || 'Not set'
      },
      "Employment Information": {
        "Faculty ID": facultyDetails.FacultyID,
        "Position": facultyDetails.Position,
        "Department": facultyDetails.department_name,
        "Employment Status": facultyDetails.Employment,
        "Hire Date": facultyDetails.HireDate,
        "Years of Service": calculateYearsOfService(),
        "Resignation Date": facultyDetails.ResignationDate || 'Not Applicable'
      }
    };

    const blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faculty_data_${facultyDetails.FacultyID}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  const handleSave = async () => {
    if (!editedDetails || !user) {
      setNotification({
        type: 'error',
        message: 'No data to save. Please try again.'
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
        phone: editedDetails.Phone,
        address: editedDetails.Address,
        emergency_contact: editedDetails.EmergencyContact
      };

      const { data, error: updateError } = await supabase
        .from('faculty')
        .update(updateData)
        .eq('faculty_id', facultyDetails.FacultyID)
        .select(`
          *,
          departments (
            name
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
        department_name: data.departments?.name || 'Unknown Department'
      };

      setFacultyDetails(transformedData);
      setEditedDetails(transformedData);
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: 'Changes saved successfully!'
      });
    } catch (error: any) {
      console.error('Save error:', error);
      setNotification({
        type: 'error',
        message: 'Error saving changes. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FacultyDetails, value: string) => {
    console.log('Handling input change:', field, value);
    setEditedDetails(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value
      };
    });
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
        <h1 className="text-2xl text-black font-bold">Personal Data</h1>
        <div className="flex space-x-2">
          <button 
            onClick={handleDownload}
            disabled={!facultyDetails || loading}
            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaDownload /> Download
          </button>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
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

      {loading ? (
        <div className="p-4 text-center">Loading...</div>
      ) : !facultyDetails ? (
        <div className="p-4 text-center text-gray-600">
          No faculty data found. Please contact your administrator.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg">
          {/* Left Column */}
          <div>
            {/* Non-editable Clerk data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {user.firstName} {user.lastName}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {user.emailAddresses[0]?.emailAddress}
              </div>
            </div>

            {/* Editable fields */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.Phone ?? ''}
                  onChange={(e) => handleInputChange('Phone', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 bg-gray-50"
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="bg-gray-50 text-black p-2 rounded border border-gray-200">
                  {facultyDetails?.Phone || 'Not set'}
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              {isEditing ? (
                <textarea
                  value={editedDetails?.Address ?? ''}
                  onChange={(e) => handleInputChange('Address', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 bg-gray-50"
                  rows={2}
                  placeholder="Enter address"
                />
              ) : (
                <div className="bg-gray-50 text-black p-2 rounded border border-gray-200">
                  {facultyDetails?.Address || 'Not set'}
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedDetails?.EmergencyContact ?? ''}
                  onChange={(e) => handleInputChange('EmergencyContact', e.target.value)}
                  className="w-full p-2 rounded border border-gray-300 bg-gray-50"
                  placeholder="Enter emergency contact"
                />
              ) : (
                <div className="bg-gray-50 text-black p-2 rounded border border-gray-200">
                  {facultyDetails?.EmergencyContact || 'Not set'}
                </div>
              )}
            </div>

            {/* Read-only fields */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {facultyDetails?.DateOfBirth || 'Not set'}
              </div>
            </div>
          </div>

          {/* Right Column - All read-only */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Faculty ID</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {facultyDetails?.FacultyID || 'Not set'}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Position</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {facultyDetails?.Position || 'Not set'}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Employment Status</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {facultyDetails?.Employment || 'Not set'}
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                  {facultyDetails?.HireDate || 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Resignation Date</label>
                <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                  {facultyDetails?.ResignationDate || 'Not set'}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <div className="bg-blue-50 text-black p-2 rounded border border-blue-100">
                {facultyDetails?.department_name || 'Not set'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalData;