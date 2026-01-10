'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { Search, ChevronUp, ChevronDown, Plus, Trash2, UserPlus, RefreshCw, Lock, UserCheck, Shield, UserX } from 'lucide-react';
import ManageUserRoles from './ManageUserRoles';

interface UserRecord {
  EmployeeID: string | null;
  FirstName: string | null;
  LastName: string | null;
  MiddleName: string | null;
  ExtensionName: string | null;
  Email: string | null;
  Position: string | null;
  Designation: string | null;
  DepartmentID: number | null;
  UserID: string | null;
  Photo: string | null;
  Department: {
    DepartmentName: string;
  }[] | null;
  EmploymentStatus: string | null;
  HireDate: string | null;
  User: {
    UserID: string;
    Status: string;
    LastLogin: string | null;
    Photo: string | null;
    Role: {
      role: {
        name: string;
      }[];
    }[];
  }[];
  isUserOnly?: boolean;
}

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const UserManagementContent: React.FC = () => {
  const { user } = useUser();
  const [userRecords, setUserRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [notification, setNotification] = useState<Notification | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [viewType, setViewType] = useState<'users' | 'employees' | 'faculty' | 'students'>('users');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; alt: string } | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [isRefreshingHash, setIsRefreshingHash] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [selectedAdminForUpgrade, setSelectedAdminForUpgrade] = useState<UserRecord | null>(null);
  const [deactivateCurrent, setDeactivateCurrent] = useState(false);
  const [currentSuperAdmins, setCurrentSuperAdmins] = useState<UserRecord[]>([]);
  const [isCreatingSuperAdmin, setIsCreatingSuperAdmin] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all user roles at once
      const { data: allRoleData, error: roleError } = await supabase
        .from('UserRole')
        .select(`
          userId,
          role:Role (
            name
          )
        `);

      if (roleError) {
        console.error('Role fetch error:', {
          message: roleError.message,
          details: roleError.details,
          hint: roleError.hint,
          code: roleError.code
        });
        throw new Error(`Failed to fetch roles: ${roleError.message}`);
      }

      // Create role map for easy lookup
      const roleMap = new Map();
      allRoleData?.forEach(userRole => {
        if (!roleMap.has(userRole.userId)) {
          roleMap.set(userRole.userId, []);
        }
        roleMap.get(userRole.userId).push(userRole);
      });

      if (viewType === 'students') {
        // Fetch employees data with proper joins to get Designation
        const { data: employeeData, error: empError } = await supabase
          .from('Employee')
          .select(`
            EmployeeID,
            FirstName,
            LastName,
            MiddleName,
            ExtensionName,
            UserID,
            DepartmentID,
            Photo,
            employmentDetail:EmploymentDetail (
              Position,
              Designation,
              EmploymentStatus,
              HireDate
            ),
            contactInfo:ContactInfo (
              Email
            ),
            Department (
              DepartmentName
            ),
            User (
            UserID,
            FirstName,
            LastName,
            Email,
            Photo,
            Status,
            LastLogin
            )
          `);

        if (empError) throw empError;

        // Process employees
        const userRecordsList: UserRecord[] = employeeData?.map((employee: any) => {
          const employmentDetail = employee.employmentDetail || {};
          const contactInfo = employee.contactInfo || {};
          const department = employee.Department || {};
          const userAccount = employee.User || null;
          
          let userWithRoles: any[] = [];
          if (userAccount) {
            const roles = roleMap.get(userAccount.UserID) || [];
            userWithRoles = [{
              ...userAccount,
              Photo: userAccount.Photo,
              Role: roles
            }];
          }

          return {
            EmployeeID: employee.EmployeeID,
            FirstName: employee.FirstName,
            LastName: employee.LastName,
            MiddleName: employee.MiddleName,
            ExtensionName: employee.ExtensionName,
            Email: contactInfo.Email || userAccount?.Email,
            Position: employmentDetail.Position,
            Designation: employmentDetail.Designation,
            DepartmentID: employee.DepartmentID,
            UserID: employee.UserID,
            Photo: employee.Photo || null,
            Department: department.DepartmentName ? [{ DepartmentName: department.DepartmentName }] : null,
            EmploymentStatus: employmentDetail.EmploymentStatus,
            HireDate: employmentDetail.HireDate,
            User: userWithRoles,
            isUserOnly: false
          };
        }) || [];

        setUserRecords(userRecordsList);
      } else if (viewType === 'faculty') {
        // Fetch employees data with proper joins to get Designation
        const { data: employeeData, error: empError } = await supabase
          .from('Employee')
          .select(`
            EmployeeID,
            FirstName,
            LastName,
            MiddleName,
            ExtensionName,
            UserID,
            DepartmentID,
            Photo,
            employmentDetail:EmploymentDetail (
              Position,
              Designation,
              EmploymentStatus,
              HireDate
            ),
            contactInfo:ContactInfo (
              Email
            ),
            Department (
              DepartmentName
            ),
            User (
            UserID,
            FirstName,
            LastName,
            Email,
            Photo,
            Status,
            LastLogin
            )
          `);

        if (empError) throw empError;

        // Process employees
        const userRecordsList: UserRecord[] = employeeData?.map((employee: any) => {
          const employmentDetail = employee.employmentDetail || {};
          const contactInfo = employee.contactInfo || {};
          const department = employee.Department || {};
          const userAccount = employee.User || null;
          
          let userWithRoles: any[] = [];
          if (userAccount) {
            const roles = roleMap.get(userAccount.UserID) || [];
            userWithRoles = [{
              ...userAccount,
              Photo: userAccount.Photo,
              Role: roles
            }];
          }

          return {
            EmployeeID: employee.EmployeeID,
            FirstName: employee.FirstName,
            LastName: employee.LastName,
            MiddleName: employee.MiddleName,
            ExtensionName: employee.ExtensionName,
            Email: contactInfo.Email || userAccount?.Email,
            Position: employmentDetail.Position,
            Designation: employmentDetail.Designation,
            DepartmentID: employee.DepartmentID,
            UserID: employee.UserID,
            Photo: employee.Photo || null,
            Department: department.DepartmentName ? [{ DepartmentName: department.DepartmentName }] : null,
            EmploymentStatus: employmentDetail.EmploymentStatus,
            HireDate: employmentDetail.HireDate,
            User: userWithRoles,
            isUserOnly: false
          };
        }) || [];

        setUserRecords(userRecordsList);
      } else if (viewType === 'employees') {
        // Fetch employees data - simplified query to match actual schema
        const { data: employeeData, error: empError } = await supabase
          .from('Employee')
          .select(`
            EmployeeID,
            FirstName,
            LastName,
            MiddleName,
            ExtensionName,
            UserID,
            DepartmentID,
            Photo,
            employmentDetails:EmploymentDetail(
              Position,
              Designation,
              EmploymentStatus,
              HireDate
            ),
            contactInfo:ContactInfo(
              Email
            ),
            Department(
              DepartmentName
            )
          `)
          .limit(50);

        if (empError) throw empError;

        // Fetch users for employees (exclude deleted users)
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select(`
            UserID,
            EmployeeID,
            FirstName,
            LastName,
            Email,
            Photo,
            Status,
            LastLogin
          `)
          .eq('isDeleted', false);

        if (userError) throw userError;

        const userRecordsList: UserRecord[] = [];
        const processedEmployeeIds = new Set<string>();
        const processedUserIds = new Set<string>();

        // Process employees - these are employee records (may or may not have user accounts)
        for (const employee of employeeData || []) {
          const userAccount = userData?.find(u => u.EmployeeID === employee.EmployeeID);
          
          let userWithRoles: any[] = [];
          if (userAccount) {
            const roles = roleMap.get(userAccount.UserID) || [];
            userWithRoles = [{
              ...userAccount,
              Photo: userAccount.Photo,
              Role: roles
            }];
            processedUserIds.add(userAccount.UserID);
          }

          // Flatten the nested structure to match UserRecord interface
          const employmentDetail = employee.employmentDetails?.[0] || {};
          const contactInfo = employee.contactInfo?.[0] || {};
          const department = employee.Department?.[0] || {};

          userRecordsList.push({
            EmployeeID: employee.EmployeeID,
            FirstName: employee.FirstName,
            LastName: employee.LastName,
            MiddleName: employee.MiddleName,
            ExtensionName: employee.ExtensionName,
            Email: contactInfo.Email,
            Position: employmentDetail.Position,
            Designation: employmentDetail.Designation,
            DepartmentID: employee.DepartmentID,
            UserID: employee.UserID,
            Photo: employee.Photo || null,
            Department: department.DepartmentName ? [{ DepartmentName: department.DepartmentName }] : null,
            EmploymentStatus: employmentDetail.EmploymentStatus,
            HireDate: employmentDetail.HireDate,
            User: userWithRoles,
            isUserOnly: false
          });
          processedEmployeeIds.add(employee.EmployeeID);
        }

        setUserRecords(userRecordsList);
      } else {
        // Fetch all users data (default view) - simplified query to match actual schema
        const { data: employeeData, error: empError } = await supabase
          .from('Employee')
          .select(`
            EmployeeID,
            FirstName,
            LastName,
            MiddleName,
            ExtensionName,
            UserID,
            DepartmentID,
            Photo,
            employmentDetails:EmploymentDetail(
              Position,
              Designation,
              EmploymentStatus,
              HireDate
            ),
            contactInfo:ContactInfo(
              Email
            ),
            Department(
              DepartmentName
            )
          `)
          .limit(50);

        if (empError) throw empError;

        // Fetch users (exclude deleted users)
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select(`
            UserID,
            EmployeeID,
            FirstName,
            LastName,
            Email,
            Photo,
            Status,
            LastLogin
          `)
          .eq('isDeleted', false);

        if (userError) throw userError;

        const userRecordsList: UserRecord[] = [];
        const processedEmployeeIds = new Set<string>();
        const processedUserIds = new Set<string>();

        // Process employees - these are employee records (may or may not have user accounts)
        for (const employee of employeeData || []) {
          const userAccount = userData?.find(u => u.EmployeeID === employee.EmployeeID);
          
          let userWithRoles: any[] = [];
          if (userAccount) {
            const roles = roleMap.get(userAccount.UserID) || [];
            userWithRoles = [{
              ...userAccount,
              Photo: userAccount.Photo,
              Role: roles
            }];
            processedUserIds.add(userAccount.UserID);
          }

          // Flatten the nested structure to match UserRecord interface
          const employmentDetail = employee.employmentDetails?.[0] || {};
          const contactInfo = employee.contactInfo?.[0] || {};
          const department = employee.Department?.[0] || {};

          userRecordsList.push({
            EmployeeID: employee.EmployeeID,
            FirstName: employee.FirstName,
            LastName: employee.LastName,
            MiddleName: employee.MiddleName,
            ExtensionName: employee.ExtensionName,
            Email: contactInfo.Email,
            Position: employmentDetail.Position,
            Designation: employmentDetail.Designation,
            DepartmentID: employee.DepartmentID,
            UserID: employee.UserID,
            Photo: employee.Photo || null,
            Department: department.DepartmentName ? [{ DepartmentName: department.DepartmentName }] : null,
            EmploymentStatus: employmentDetail.EmploymentStatus,
            HireDate: employmentDetail.HireDate,
            User: userWithRoles,
            isUserOnly: false
          });
          processedEmployeeIds.add(employee.EmployeeID);
        }

        // Add standalone users (users not linked to employee records)
        for (const user of userData || []) {
          if (!processedUserIds.has(user.UserID) && (!user.EmployeeID)) {
            const roles = roleMap.get(user.UserID) || [];
            userRecordsList.push({
              EmployeeID: null,
              FirstName: user.FirstName,
              LastName: user.LastName,
              MiddleName: null,
              ExtensionName: null,
              Email: user.Email,
              Position: null,
              Designation: null,
              DepartmentID: null,
              UserID: user.UserID,
              Photo: user.Photo,
              Department: null,
              EmploymentStatus: null,
              HireDate: null,
              User: [{
                ...user,
                Photo: user.Photo,
                Role: roles
              }],
              isUserOnly: true
            });
          }
        }

        setUserRecords(userRecordsList);
      }

    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load user data'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add photo click handler
  const handlePhotoClick = (e: React.MouseEvent, photoUrl: string, alt: string) => {
    e.stopPropagation();
    if (!photoUrl) return;
    setSelectedPhoto({ url: photoUrl, alt });
    setIsPhotoModalOpen(true);
  };

  // Add modal close handler
  const handleClosePhotoModal = () => {
    setIsPhotoModalOpen(false);
    setSelectedPhoto(null);
  };

  // Add function to show role selection modal
  const showRoleSelectionModal = (userRecord: UserRecord) => {
    setSelectedUserForRole(userRecord);
    setSelectedRole(''); // Reset selection
    setShowRoleModal(true);
  };

  // Add function to handle role selection and account creation
  const handleRoleSelection = () => {
    if (selectedUserForRole && selectedRole) {
      setShowRoleModal(false);
      handleCreateAccount(selectedUserForRole, selectedRole);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRoles();
  }, [viewType]);

  // Fetch roles for ManageUserRoles component
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store', // Ensure fresh data
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched roles:', data);
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleCreateAccount = async (userRecord: UserRecord, selectedRole?: string) => {
    try {
      if (!user) {
        setNotification({
          type: 'error',
          message: 'Not authenticated. Please sign in again.'
        });
        return;
      }

      // Validate required data
      if (!userRecord.FirstName || !userRecord.LastName || !userRecord.Email) {
        setNotification({
          type: 'error',
          message: 'Missing required information (name or email) to create account.'
        });
        return;
      }

      // Determine role based on selected role or designation
      let role = 'Faculty';
      if (selectedRole) {
        // Use the role selected from the modal
        role = selectedRole;
      } else if (userRecord.Designation) {
        // Fallback to designation-based role mapping
        const designation = userRecord.Designation.toLowerCase();
        if (designation === 'faculty') {
          role = 'Faculty';
        } else if (designation === 'admin' || designation === 'admin_officer') {
          role = 'Admin';
        } else if (designation === 'registrar') {
          role = 'Registrar';
        } else if (designation === 'cashier') {
          role = 'Cashier';
        } else if (designation === 'student') {
          role = 'Student';
        } else {
          role = 'Faculty'; // Default for unknown designations
        }
      }

      // Prepare faculty data if the user has employment details
      let facultyData = null;
      if (userRecord.Position || userRecord.DepartmentID) {
        facultyData = {
          Position: userRecord.Position || 'Not specified',
          DepartmentId: userRecord.DepartmentID || null,
          EmploymentStatus: userRecord.EmploymentStatus || 'Regular',
          HireDate: userRecord.HireDate || new Date().toISOString().split('T')[0]
        };
      }

      setNotification({
        type: 'info',
        message: 'Creating account...'
      });

      // Create user account using the existing API
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userRecord.FirstName,
          lastName: userRecord.LastName,
          email: userRecord.Email,
          role: role.toLowerCase(),
          createdBy: user.id, // Current user's Clerk ID
          facultyData: facultyData,
          employeeId: userRecord.EmployeeID // Pass the employee ID to link them
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account');
      }

      // Show success message for account creation
      const message = `Account created successfully for ${userRecord.FirstName} ${userRecord.LastName}. An invitation email has been sent.`;

      setNotification({
        type: 'success',
        message: message
      });

      // Refresh the data to show the new account status
      await fetchData();

    } catch (error) {
      console.error('Error creating account:', error);
      setNotification({
        type: 'error',
        message: `Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleDeleteAccount = async (userRecord: UserRecord) => {
    if (isDeleting) return; // Prevent double-clicking
    
    try {
      setIsDeleting(true); // Start deletion process
      
      // Get current user ID for logging - using current user from Clerk
      if (!user) {
        setNotification({
          type: 'error',
          message: 'Not authenticated. Please sign in again.'
        });
        return;
      }
      
      const currentUserId = user.id;

      if (userRecord.EmployeeID) {
        console.log(`Attempting to delete employee with ID: ${userRecord.EmployeeID}`);
        // Employee record exists - delete both employee and account (if any)
        const response = await fetch(`/api/employees/${userRecord.EmployeeID}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok && response.status !== 207) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete employee (HTTP ${response.status})`);
        }

        const result = await response.json();
        console.log('Delete response:', result);

        setNotification({
          type: response.status === 207 ? 'info' : 'success',
          message: result.clerkError 
            ? `Employee record deleted but there was an issue removing the authentication account: ${result.clerkError}`
            : result.clerkDeleted 
              ? 'Employee and account deleted successfully'
              : 'Employee record deleted successfully'
        });
      } else if (userRecord.User.length > 0) {
        // User-only record (no employee) - delete just the user account
        const response = await fetch('/api/deleteUser', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userRecord.User[0].UserID,
            createdBy: currentUserId
          }),
        });

        if (!response.ok && response.status !== 207) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete user (HTTP ${response.status})`);
        }

        const result = await response.json();
        console.log('Delete user response:', result);

        setNotification({
          type: response.status === 207 ? 'info' : 'success',
          message: result.clerkError 
            ? `User account deleted from system but there was an issue removing the authentication account: ${result.clerkError}`
            : result.clerkDeleted 
              ? 'User account deleted successfully'
              : 'User account deleted from system'
        });
      } else {
        // No employee record or user account - delete from database only
        const response = await fetch('/api/deleteUser', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userRecord.UserID || userRecord.Email,
            createdBy: currentUserId,
            deleteFromDbOnly: true
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to delete record (HTTP ${response.status})`);
        }

        const result = await response.json();
        console.log('Delete record response:', result);

        setNotification({
          type: 'success',
          message: 'Record deleted successfully'
        });
      }

      // Refresh data
      await fetchData();
      setShowDeleteModal(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Delete operation failed:', error);
      setNotification({
        type: 'error',
        message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      // Close modal even on error so user can try again
      setShowDeleteModal(false);
      setSelectedRecord(null);
    } finally {
      setIsDeleting(false); // Reset deletion state
    }
  };

  const confirmDelete = (userRecord: UserRecord) => {
    setSelectedRecord(userRecord);
    setShowDeleteModal(true);
  };

  const confirmDeactivate = (userRecord: UserRecord) => {
    setSelectedRecord(userRecord);
    setShowDeactivateModal(true);
  };

  const handleDeactivateUser = async (userRecord: UserRecord) => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      if (!user) {
        setNotification({
          type: 'error',
          message: 'Not authenticated. Please sign in again.'
        });
        return;
      }

      if (!userRecord.User[0]?.UserID) {
        setNotification({
          type: 'error',
          message: 'User ID not found'
        });
        return;
      }

      const response = await fetch('/api/updateUser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userRecord.User[0].UserID,
          firstName: userRecord.FirstName,
          lastName: userRecord.LastName,
          email: userRecord.Email,
          role: (userRecord.User[0].Role?.[0]?.role as any)?.name?.toLowerCase() || 'faculty',
          status: 'Inactive',
          updatedBy: user.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deactivate user');
      }

      setNotification({
        type: 'success',
        message: 'User deactivated successfully'
      });

      await fetchData();
      setShowDeactivateModal(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Deactivate operation failed:', error);
      setNotification({
        type: 'error',
        message: `Failed to deactivate: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setShowDeactivateModal(false);
      setSelectedRecord(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data: UserRecord[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'id':
          aValue = a.EmployeeID || (a.User.length > 0 ? a.User[0].UserID : '');
          bValue = b.EmployeeID || (b.User.length > 0 ? b.User[0].UserID : '');
          break;
        case 'name':
          aValue = [a.FirstName, a.MiddleName, a.LastName, a.ExtensionName].filter(Boolean).join(' ').toLowerCase();
          bValue = [b.FirstName, b.MiddleName, b.LastName, b.ExtensionName].filter(Boolean).join(' ').toLowerCase();
          break;
        case 'designation':
          aValue = (a.Designation || '').toLowerCase();
          bValue = (b.Designation || '').toLowerCase();
          break;
                 case 'status':
           aValue = a.User.length > 0 ? a.User[0].Status : 'No Account';
           bValue = b.User.length > 0 ? b.User[0].Status : 'No Account';
           break;
        case 'lastLogin':
          aValue = a.User.length > 0 && a.User[0].LastLogin ? new Date(a.User[0].LastLogin).getTime() : 0;
          bValue = b.User.length > 0 && b.User[0].LastLogin ? new Date(b.User[0].LastLogin).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Helper to get all unique roles from userRecords
  const allRoles = Array.from(new Set(userRecords.flatMap(user =>
    user.User && user.User[0] && user.User[0].Role
      ? user.User[0].Role.map((r: any) => r.role.name)
      : []
  )));

  // Update filteredAndSortedUserRecords to include role filter
  const filteredAndSortedUserRecords = getSortedData(
    userRecords.filter((user) => {
      const matchesSearch =
        user.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.LastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.EmployeeID && user.EmployeeID.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'No Account' && user.User.length === 0) ||
        (user.User.length > 0 && user.User[0].Status === statusFilter);
      const userRoles = user.User && user.User[0] && user.User[0].Role
        ? user.User[0].Role.map((r: any) => r.role.name)
        : [];
      const matchesRole =
        roleFilter === 'All Roles' || userRoles.includes(roleFilter);

      // Only show 'No Account' if there is no other record with the same email that has an account
      if (user.User.length === 0 && user.Email) {
        const hasAccountWithSameEmail = userRecords.some(
          (u) => u.Email === user.Email && u.User.length > 0
        );
        if (hasAccountWithSameEmail) {
          return false;
        }
      }

      return matchesSearch && matchesStatus && matchesRole;
    })
  );

  const handleRefreshClerkId = async (userRecord: UserRecord) => {
    if (!userRecord.Email || isRefreshing === userRecord.Email) return;
    
    try {
      setIsRefreshing(userRecord.Email);
      
      const response = await fetch('/api/users/refresh-clerk-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userRecord.Email,
          userId: userRecord.User[0]?.UserID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // If we got search errors, display them in detail
        if (result.details && Array.isArray(result.details)) {
          throw new Error(`${result.error}:\n${result.details.join('\n')}`);
        }
        throw new Error(result.error || 'Failed to refresh ClerkID');
      }

      setNotification({
        type: 'success',
        message: `ClerkID refreshed successfully (found via ${result.searchMethod})`
      });

      // Refresh the data to show updated ClerkID
      await fetchData();
    } catch (error) {
      console.error('Error refreshing ClerkID:', error);
      setNotification({
        type: 'error',
        message: `Failed to refresh ClerkID: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRefreshing(null);
    }
  };

  const handleRefreshPasswordHash = async (userRecord: UserRecord) => {
    if (!userRecord.Email || isRefreshingHash === userRecord.Email) return;
    
    try {
      setIsRefreshingHash(userRecord.Email);
      
      const response = await fetch('/api/users/refresh-password-hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userRecord.Email,
          userId: userRecord.User[0]?.UserID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to refresh password hash');
      }

      setNotification({
        type: 'success',
        message: 'Password hash refreshed successfully'
      });

      // Refresh the data to show updated status
      await fetchData();
    } catch (error) {
      console.error('Error refreshing password hash:', error);
      setNotification({
        type: 'error',
        message: `Failed to refresh password hash: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRefreshingHash(null);
    }
  };

  const handleActivateUser = async (userRecord: UserRecord) => {
    if (!userRecord.User?.[0]?.UserID) {
      setNotification({
        type: 'error',
        message: 'User ID not found'
      });
      return;
    }

    setIsActivating(userRecord.User[0].UserID);

    try {
      const response = await fetch('/api/updateUserStatus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userRecord.User[0].UserID,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate user');
      }

      await fetchData(); // Refresh the data
      setNotification({
        type: 'success',
        message: 'User activated successfully'
      });
    } catch (error) {
      console.error('Error activating user:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to activate user'
      });
    } finally {
      setIsActivating(null);
    }
  };

  // Get admin users only (users with Admin role, excluding Super Admin)
  const getAdminUsers = () => {
    return userRecords.filter((userRecord) => {
      if (userRecord.User.length === 0) return false; // Must have an account
      const userRoles = userRecord.User[0].Role || [];
      const roleNames = userRoles.map((r: any) => r.role.name);
      return roleNames.includes('Admin') && !roleNames.includes('Super Admin');
    });
  };

  // Get current super admins
  const fetchCurrentSuperAdmins = async () => {
    try {
      // Fetch all user roles to find Super Admin users
      const { data: allRoleData, error: roleError } = await supabase
        .from('UserRole')
        .select(`
          userId,
          role:Role (
            name
          )
        `);

      if (roleError) {
        console.error('Error fetching roles:', roleError);
        return [];
      }

      // Find Super Admin role ID
      const { data: superAdminRole, error: roleIdError } = await supabase
        .from('Role')
        .select('id')
        .eq('name', 'Super Admin')
        .single();

      if (roleIdError || !superAdminRole) {
        return [];
      }

      // Get all users with Super Admin role
      const superAdminUserIds = allRoleData
        ?.filter((ur: any) => ur.role?.name === 'Super Admin')
        .map((ur: any) => ur.userId) || [];

      if (superAdminUserIds.length === 0) {
        return [];
      }

      // Fetch user records for super admins
      const superAdminRecords = userRecords.filter((userRecord) => {
        if (userRecord.User.length === 0) return false;
        return superAdminUserIds.includes(userRecord.User[0].UserID);
      });

      return superAdminRecords;
    } catch (error) {
      console.error('Error fetching current super admins:', error);
      return [];
    }
  };

  // Handler to open super admin modal
  const handleOpenSuperAdminModal = async () => {
    setShowSuperAdminModal(true);
    setSelectedAdminForUpgrade(null);
    setDeactivateCurrent(false);
    const superAdmins = await fetchCurrentSuperAdmins();
    setCurrentSuperAdmins(superAdmins);
  };

  // Handler to create super admin
  const handleCreateSuperAdmin = async () => {
    if (!selectedAdminForUpgrade || !selectedAdminForUpgrade.User?.[0]?.UserID) {
      setNotification({
        type: 'error',
        message: 'Please select an admin user to upgrade'
      });
      return;
    }

    if (!user) {
      setNotification({
        type: 'error',
        message: 'Not authenticated. Please sign in again.'
      });
      return;
    }

    setIsCreatingSuperAdmin(true);

    try {
      const response = await fetch('/api/createSuperAdmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedAdminForUpgrade.User[0].UserID,
          deactivateCurrent: deactivateCurrent,
          createdBy: user.id
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create super admin');
      }

      setNotification({
        type: 'success',
        message: result.message || 'Admin successfully upgraded to Super Admin'
      });

      setShowSuperAdminModal(false);
      setSelectedAdminForUpgrade(null);
      setDeactivateCurrent(false);
      await fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error creating super admin:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create super admin'
      });
    } finally {
      setIsCreatingSuperAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Notification */}
      {notification && (
        <div className={`mb-8 p-4 rounded-lg shadow-sm ${
          notification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {viewType === 'faculty' ? 'Faculty Management' : 
           viewType === 'employees' ? 'Employee Management' :
          //  viewType === 'students' ? 'Student Management' : 
           'User Management'}
        </h2>
        <p className="text-gray-600">
          {viewType === 'faculty' ? 'View all faculty members and their account status. Manage teaching staff access.' :
           viewType === 'employees' ? 'View all employees and their account status. Manage employee system access.' :
          //  viewType === 'students' ? 'View all students and their account status. Manage student portal access.' :
           'View all users with their account status. Manage system access for all user types.'}
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          </div>
        </div>
        <select
          title="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
        >
          <option value="All">All Status</option>
          <option value="No Account">No Account</option>
          <option value="Active">Active Account</option>
          <option value="Inactive">Inactive Account</option>
          <option value="Invited">Invited</option>
        </select>
        <select
          title="role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
        >
          <option value="All Roles">All Roles</option>
          {allRoles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <ManageUserRoles
          roles={roles}
          onUpdate={fetchRoles}
        />
        <button
          onClick={handleOpenSuperAdminModal}
          className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors flex items-center gap-2"
        >
          <Shield className="h-5 w-5" />
          Create Super Admin
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Showing {filteredAndSortedUserRecords.length} of {userRecords.length} {
            viewType === 'faculty' ? 'faculty members' :
            viewType === 'employees' ? 'employees' :
            viewType === 'students' ? 'students' :
            'users'
          }
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
            <span className="ml-2 text-gray-600">Loading users...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-16 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="w-80 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="w-64 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="w-48 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">User Role</th>
                    <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Status</th>
                    <th className="w-32 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedUserRecords.map((userRecord: UserRecord, index: number) => {
                    const fullName = [userRecord.FirstName, userRecord.MiddleName, userRecord.LastName, userRecord.ExtensionName]
                      .filter(Boolean)
                      .join(' ');
                    const hasAccount = userRecord.User.length > 0;
                    const accountStatus = hasAccount ? userRecord.User[0].Status : 'No Account';
                    const displayId = userRecord.EmployeeID || (hasAccount ? userRecord.User[0].UserID : 'N/A');
                    
                    // Create a unique key combining multiple identifiers
                    const uniqueKey = `${userRecord.EmployeeID || 'no-emp'}-${hasAccount ? userRecord.User[0].UserID : 'no-user'}-${userRecord.isUserOnly ? 'user-only' : 'employee'}-${index}`;
                    
                    return (
                      <tr key={uniqueKey} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full object-cover cursor-pointer"
                              src={userRecord.Photo || '/avatar.png'}
                              alt={`${fullName}'s photo`}
                              onClick={(e) => handlePhotoClick(e, userRecord.Photo || '/avatar.png', `${fullName}'s photo`)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{fullName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{userRecord.Email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {userRecord.User && userRecord.User[0] && userRecord.User[0].Role && userRecord.User[0].Role.length > 0
                              ? userRecord.User[0].Role.map((r: any) => r.role.name).join(', ')
                              : 'No role'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            accountStatus === 'Active' ? 'bg-green-100 text-green-800' :
                            accountStatus === 'Inactive' ? 'bg-red-100 text-red-800' :
                            accountStatus === 'Invited' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {accountStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-2">
                            {/* Actions column */}
                            {userRecord.User.length > 0 ? (
                              <div className="flex items-center space-x-2">
                              <button
                                  onClick={() => handleRefreshClerkId(userRecord)}
                                  disabled={isRefreshing === userRecord.Email}
                                  className={`text-blue-600 hover:text-blue-800 ${
                                    isRefreshing === userRecord.Email ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Refresh ClerkID"
                                >
                                  {isRefreshing === userRecord.Email ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                                  ) : (
                                    <RefreshCw className="h-5 w-5" />
                                  )}
                              </button>
                                <button
                                  onClick={() => handleRefreshPasswordHash(userRecord)}
                                  disabled={isRefreshingHash === userRecord.Email}
                                  className={`text-blue-600 hover:text-blue-800 ${
                                    isRefreshingHash === userRecord.Email ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Refresh Password Hash"
                                >
                                  {isRefreshingHash === userRecord.Email ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                                  ) : (
                                    <Lock className="h-5 w-5" />
                                  )}
                                </button>
                                {(userRecord.User[0]?.Status === 'Invited' || userRecord.User[0]?.Status === 'Inactive') && (
                                  <button
                                    onClick={() => handleActivateUser(userRecord)}
                                    disabled={isActivating === userRecord.User[0].UserID}
                                    className="text-green-600 hover:text-green-800 transition-colors relative group"
                                    title={userRecord.User[0]?.Status === 'Inactive' ? 'Reactivate User' : 'Activate User'}
                                  >
                                    {isActivating === userRecord.User[0].UserID ? (
                                      <div className="animate-spin">
                                        <RefreshCw size={20} />
                                      </div>
                                    ) : (
                                      <UserCheck size={20} />
                                    )}
                                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                      {userRecord.User[0]?.Status === 'Inactive' ? 'Reactivate User' : 'Activate User'}
                                    </span>
                                  </button>
                            )}
                            {userRecord.User[0]?.Status !== 'Inactive' && (
                              <button
                                onClick={() => confirmDeactivate(userRecord)}
                                className="text-orange-600 hover:text-orange-800"
                                disabled={isDeleting}
                                title="Deactivate Account"
                              >
                                <UserX className="h-5 w-5" />
                              </button>
                            )}
                              </div>
                            ) : (
                              <button
                                onClick={() => showRoleSelectionModal(userRecord)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Create Account"
                              >
                                <UserPlus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Photo Modal */}
      {isPhotoModalOpen && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-xl max-w-2xl">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.alt}
              className="max-h-[80vh] w-auto"
            />
              <button
              onClick={handleClosePhotoModal}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
              Close
              </button>
          </div>
        </div>
      )}

      {/* Role Selection Modal */}
      {showRoleModal && selectedUserForRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Select Role for {[selectedUserForRole.FirstName, selectedUserForRole.LastName].filter(Boolean).join(' ')}</h3>
              <select
                title="selected-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4"
              >
              <option value="">Select a role...</option>
              {/* <option value="super admin">Super Admin</option> */}
              {/* <option value="student">Student</option> */}
              <option value="cashier">Cashier</option>
              <option value="registrar">Registrar</option>
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
              </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUserForRole(null);
                  setSelectedRole('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleSelection}
                disabled={!selectedRole}
                className={`px-4 py-2 rounded ${
                  selectedRole 
                    ? 'bg-[#800000] text-white hover:bg-[#600000]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete {[selectedRecord.FirstName, selectedRecord.LastName].filter(Boolean).join(' ')}
              {selectedRecord.User.length > 0 ? "'s account" : "'s record"}?
              {selectedRecord.User.length > 0 && " This will remove their access to the system."}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDeleting}
          >
                Cancel
              </button>
            <button
                onClick={() => handleDeleteAccount(selectedRecord)}
                className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting}
            >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deactivate</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to deactivate {[selectedRecord.FirstName, selectedRecord.LastName].filter(Boolean).join(' ')}'s account?
              This will temporarily suspend their access to the system. You can reactivate them later.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeactivateUser(selectedRecord)}
                className={`px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deactivating...
                  </>
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Super Admin Modal */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Super Admin</h3>
            
            {/* Current Super Admins Section */}
            {currentSuperAdmins.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">Current Super Admins:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {currentSuperAdmins.map((superAdmin) => {
                    const fullName = [superAdmin.FirstName, superAdmin.LastName].filter(Boolean).join(' ');
                    return (
                      <li key={superAdmin.User?.[0]?.UserID}>
                        {fullName} ({superAdmin.Email})
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Admin User Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Admin User to Upgrade:
              </label>
              <select
                value={selectedAdminForUpgrade?.User?.[0]?.UserID || ''}
                onChange={(e) => {
                  const adminUsers = getAdminUsers();
                  const selected = adminUsers.find(
                    (u) => u.User[0].UserID === e.target.value
                  );
                  setSelectedAdminForUpgrade(selected || null);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
              >
                <option value="">Select an admin user...</option>
                {getAdminUsers().map((adminUser) => {
                  const fullName = [adminUser.FirstName, adminUser.LastName].filter(Boolean).join(' ');
                  return (
                    <option key={adminUser.User[0].UserID} value={adminUser.User[0].UserID}>
                      {fullName} ({adminUser.Email})
                    </option>
                  );
                })}
              </select>
              {getAdminUsers().length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No admin users available to upgrade.</p>
              )}
            </div>

            {/* Deactivate Current Super Admins Checkbox */}
            {currentSuperAdmins.length > 0 && (
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={deactivateCurrent}
                    onChange={(e) => setDeactivateCurrent(e.target.checked)}
                    className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                  />
                  <span className="text-sm text-gray-700">
                    Deactivate current Super Admin(s) ({currentSuperAdmins.length})
                  </span>
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowSuperAdminModal(false);
                  setSelectedAdminForUpgrade(null);
                  setDeactivateCurrent(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isCreatingSuperAdmin}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSuperAdmin}
                disabled={!selectedAdminForUpgrade || isCreatingSuperAdmin}
                className={`px-4 py-2 rounded flex items-center ${
                  selectedAdminForUpgrade && !isCreatingSuperAdmin
                    ? 'bg-[#800000] text-white hover:bg-[#600000]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCreatingSuperAdmin ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Super Admin'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementContent;