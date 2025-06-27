'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { Search, ChevronUp, ChevronDown, Plus, Trash2, UserPlus } from 'lucide-react';

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

export default function UserManagementContent() {
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
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; alt: string } | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  
  // Add state for role selection modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

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
          `);

        if (empError) throw empError;

        // Fetch users for student employees (exclude deleted users)
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
        const processedUserIds = new Set<string>();

        // Process employees with student designation
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
            Photo: employee.Photo || (userAccount?.Photo || null),
            Department: department.DepartmentName ? [{ DepartmentName: department.DepartmentName }] : null,
            EmploymentStatus: employmentDetail.EmploymentStatus,
            HireDate: employmentDetail.HireDate,
            User: userWithRoles,
            isUserOnly: false
          });
        }

        // Add standalone users with Student role (users not linked to employee records)
        for (const user of userData || []) {
          if (!processedUserIds.has(user.UserID) && (!user.EmployeeID)) {
            const roles = roleMap.get(user.UserID) || [];
            const hasStudentRole = roles.some((r: any) => r.role?.name === 'Student');
            
            if (hasStudentRole) {
              userRecordsList.push({
                EmployeeID: null,
                FirstName: user.FirstName,
                LastName: user.LastName,
                MiddleName: null,
                ExtensionName: null,
                Email: user.Email,
                Position: null,
                Designation: 'Student',
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
              processedUserIds.add(user.UserID);
            }
          }
        }

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
          `);

        if (empError) throw empError;

        // Fetch users for faculty employees (exclude deleted users)
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
        const processedUserIds = new Set<string>();

        // Process employees with faculty designation
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
            Photo: employee.Photo || (userAccount?.Photo || null),
            Department: department.DepartmentName ? [{ DepartmentName: department.DepartmentName }] : null,
            EmploymentStatus: employmentDetail.EmploymentStatus,
            HireDate: employmentDetail.HireDate,
            User: userWithRoles,
            isUserOnly: false
          });
        }

        // Add standalone users with Faculty role (users not linked to employee records)
        for (const user of userData || []) {
          if (!processedUserIds.has(user.UserID) && (!user.EmployeeID)) {
            const roles = roleMap.get(user.UserID) || [];
            const hasFacultyRole = roles.some((r: any) => r.role?.name === 'Faculty');
            
            if (hasFacultyRole) {
              userRecordsList.push({
                EmployeeID: null,
                FirstName: user.FirstName,
                LastName: user.LastName,
                MiddleName: null,
                ExtensionName: null,
                Email: user.Email,
                Position: null,
                Designation: 'Faculty',
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
              processedUserIds.add(user.UserID);
            }
          }
        }

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
            Photo: employee.Photo || (userAccount?.Photo || null),
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
            Photo: employee.Photo || (userAccount?.Photo || null),
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
  }, [viewType]);

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
    try {
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
        // Employee record exists - delete both employee and account (if any)
        const response = await fetch(`/api/employees/${userRecord.EmployeeID}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete employee and account');
        }

        setNotification({
          type: 'success',
          message: result.clerkDeleted 
            ? 'Employee and account deleted successfully (employee soft-deleted, user hard-deleted, authentication account removed)'
            : 'Employee record soft-deleted and user account hard-deleted successfully'
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

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete account');
        }

        setNotification({
          type: 'success',
          message: result.clerkDeleted 
            ? 'User account hard-deleted successfully (both system and authentication account removed)'
            : 'User account hard-deleted successfully (system account removed)'
        });
      } else {
        // Should not happen, but handle gracefully
        setNotification({
          type: 'error',
          message: 'No record to delete found'
        });
        return;
      }

      // Refresh data
      fetchData();
      setShowDeleteModal(false);
      setSelectedRecord(null);
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      // Close modal even on error so user can try again
      setShowDeleteModal(false);
      setSelectedRecord(null);
    }
  };

  const confirmDelete = (userRecord: UserRecord) => {
    setSelectedRecord(userRecord);
    setShowDeleteModal(true);
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

  const filteredAndSortedUserRecords = getSortedData(
    userRecords.filter((userRecord: UserRecord) => {
      const fullName = [userRecord.FirstName, userRecord.MiddleName, userRecord.LastName, userRecord.ExtensionName]
        .filter(Boolean)
        .join(' ');
      
      const matchesSearch = 
        fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (userRecord.Email && userRecord.Email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (userRecord.EmployeeID && userRecord.EmployeeID.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const hasAccount = userRecord.User.length > 0;
      const employeeStatus = hasAccount ? userRecord.User[0].Status : 'No Account';
      
      const matchesStatus = statusFilter === 'All' || 
          (statusFilter === 'No Account' && !hasAccount) ||
          (statusFilter === 'Active' && hasAccount && employeeStatus === 'Active') ||
          (statusFilter === 'Inactive' && hasAccount && employeeStatus === 'Inactive') ||
          (statusFilter === 'Invited' && hasAccount && employeeStatus === 'Invited');

      // Filter by view type based on designation
      let matchesViewType = true;
      const designation = userRecord.Designation ? userRecord.Designation.toLowerCase() : '';
      
      if (viewType === 'faculty') {
        // Show users with Faculty designation OR Faculty role
        const hasFacultyRole = userRecord.User.some((u: any) => 
          u.Role?.some((r: any) => r.role?.name === 'Faculty')
        );
        matchesViewType = designation === 'faculty' || hasFacultyRole;

      } else if (viewType === 'students') {
        // Show users with Student designation OR Student role
        const hasStudentRole = userRecord.User.some((u: any) => 
          u.Role?.some((r: any) => r.role?.name === 'Student')
        );
        matchesViewType = designation === 'student' || hasStudentRole;
      } else if (viewType === 'employees') {
        // Show all users except those with Faculty/Student designation OR Faculty/Student roles
        const hasFacultyRole = userRecord.User.some((u: any) => 
          u.Role?.some((r: any) => r.role?.name === 'Faculty')
        );
        const hasStudentRole = userRecord.User.some((u: any) => 
          u.Role?.some((r: any) => r.role?.name === 'Student')
        );
        matchesViewType = designation !== 'faculty' && designation !== 'student' && !hasFacultyRole && !hasStudentRole;
      }
      // For 'users' viewType, show all (matchesViewType remains true)
        
      return matchesSearch && matchesStatus && matchesViewType;
    })
  );

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
           viewType === 'students' ? 'Student Management' : 
           'User Management'}
        </h2>
        <p className="text-gray-600">
          {viewType === 'faculty' ? 'View all faculty members and their account status. Manage teaching staff access.' :
           viewType === 'employees' ? 'View all employees and their account status. Manage employee system access.' :
           viewType === 'students' ? 'View all students and their account status. Manage student portal access.' :
           'View all users with their account status. Manage system access for all user types.'}
        </p>
      </div>

      {/* View Type Toggle */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setViewType('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewType === 'users'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setViewType('employees')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewType === 'employees'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setViewType('faculty')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewType === 'faculty'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Faculty
          </button>
          <button
            onClick={() => setViewType('students')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewType === 'students'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Students
          </button>
        </div>
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
                    <th 
                      className="w-80 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center justify-between">
                        <span>Name</span>
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'name' && sortConfig.direction === 'asc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                          <ChevronDown 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'name' && sortConfig.direction === 'desc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('designation')}
                    >
                      <div className="flex items-center justify-between">
                        <span>Designation</span>
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'designation' && sortConfig.direction === 'asc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                          <ChevronDown 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'designation' && sortConfig.direction === 'desc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-between">
                        <span>Account Status</span>
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'status' && sortConfig.direction === 'asc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                          <ChevronDown 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'status' && sortConfig.direction === 'desc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </div>
                      </div>
                    </th>
                    <th 
                      className="w-36 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('lastLogin')}
                    >
                      <div className="flex items-center justify-between">
                        <span>Last Login</span>
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'lastLogin' && sortConfig.direction === 'asc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                          <ChevronDown 
                            className={`h-3 w-3 ${
                              sortConfig?.key === 'lastLogin' && sortConfig.direction === 'desc' 
                                ? 'text-gray-900' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </div>
                      </div>
                    </th>
                    <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
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
                        <td className="w-16 px-6 py-4 whitespace-nowrap">
                          <div 
                            className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              const photoUrl = userRecord.Photo || (hasAccount ? userRecord.User[0]?.Photo : null);
                              if (photoUrl) {
                                handlePhotoClick(e, photoUrl, fullName);
                              }
                            }}
                          >
                            {(userRecord.Photo || (hasAccount ? userRecord.User[0]?.Photo : null)) ? (
                              <img 
                                src={userRecord.Photo || userRecord.User[0]?.Photo || ''} 
                                alt={fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="w-80 px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-[#800000] flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {(userRecord.FirstName || '').charAt(0)}{(userRecord.LastName || '').charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {fullName || 'Name not provided'}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {userRecord.Email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="w-48 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="truncate">
                            {userRecord.Designation || 
                             (hasAccount && userRecord.User[0].Role.length > 0 
                              ? userRecord.User[0].Role.map((r: any) => r.role?.name || 'Unknown Role').join(', ')
                              : 'Not specified')
                            }
                          </span>
                        </td>
                        <td className="w-40 px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            !hasAccount ? 'bg-gray-100 text-gray-800' :
                            accountStatus === 'Active' ? 'bg-green-100 text-green-800' :
                            accountStatus === 'Inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {accountStatus}
                          </span>
                        </td>
                        <td className="w-36 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {hasAccount && userRecord.User[0].LastLogin 
                            ? new Date(userRecord.User[0].LastLogin).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="w-32 px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {!hasAccount && (
                              <button
                                onClick={() => showRoleSelectionModal(userRecord)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="Create Account"
                              >
                                <UserPlus className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => confirmDelete(userRecord)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete Employee and Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAndSortedUserRecords.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No records found matching the current filters.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-medium">
                {[selectedRecord.FirstName, selectedRecord.LastName].filter(Boolean).join(' ') || 'this user'}
              </span>
              {selectedRecord.EmployeeID ? (
                <>? This will soft-delete their employee record and hard-delete their user account (including authentication account).{' '}</>
              ) : (
                <>? This will permanently delete their user account (including authentication account).{' '}</>
              )}
              This action cannot be undone for the user account.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAccount(selectedRecord)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Selection Modal */}
      {showRoleModal && selectedUserForRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Select Role for Account Creation
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Creating account for{' '}
              <span className="font-medium">
                {[selectedUserForRole.FirstName, selectedUserForRole.LastName].filter(Boolean).join(' ')}
              </span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-[#800000] focus:border-[#800000]"
              >
                <option value="">Choose a role...</option>
                <option value="Faculty">Faculty</option>
                <option value="Admin">Admin</option>
                <option value="Cashier">Cashier</option>
                <option value="Registrar">Registrar</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUserForRole(null);
                  setSelectedRole('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleSelection}
                disabled={!selectedRole}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  selectedRole 
                    ? 'bg-[#800000] hover:bg-[#600000]' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {isPhotoModalOpen && selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={handleClosePhotoModal}
        >
          <div 
            className="relative bg-white rounded-lg p-2 max-w-4xl max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 bg-white rounded-full p-1"
              onClick={handleClosePhotoModal}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center justify-center min-h-[200px]">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.alt}
                className="max-w-full max-h-[85vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 