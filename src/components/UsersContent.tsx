'use client';

import { useState, useEffect } from 'react';
import {  Plus, List, Users, Download, X, Save, Pencil, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import MigrateUsersButton from '@/components/MigrateUsersButton';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SupabaseUser {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string;
  //Role: string;
  Status: string;
  DateCreated: string;
  DateModified: string | null;
  LastLogin: string | null;
  Faculty: {
    FacultyID: number;
    DepartmentID: number;
    Department: {
      DepartmentName: string;
    } | null;
  } | null;
  UserRole: {
    role: {
      name: string;
    };
  }[];
}

interface User {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string;
  Role: string;
  Status: string;
  DateCreated: string;
  DateModified: string | null;
  LastLogin: string | null;
  Faculty?: {
    FacultyID: number;
    DepartmentID: number;
    Department: {
      DepartmentName: string;
    };
  };
}

interface ActivityLog {
  LogId: string;
  UserId: string;
  ActionType: string;
  EntityAffected: string;
  ActionDetails:  string;
  Timestamp: string;
  IPAddress: string;
  User?: {
    FirstName: string;
    LastName: string;
  } | null;
}

interface UserWithPasswordReset extends User {
  resetPassword?: boolean;
  isChecked?: boolean; // For reset password checkbox state
}

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface NewUser {
  FirstName: string;
  LastName: string;
  Email: string;
  Role: string;
  Status: string;
  Photo: string;
  // Faculty specific fields
  DateOfBirth?: string;
  HireDate?: string;
  Position?: string;
  DepartmentID?: number;
}

interface Department {
  DepartmentID: number;
  DepartmentName: string;
}

// Add new interface for detailed status
interface UserStatus {
  status: string;
  lastLogin: string | null;
  invitationStatus: string;
  emailVerified: boolean;
}

// Add new interface for activity log display
interface ActivityLogDisplay {
  LogId: string;
  Timestamp: string;
  UserName: string;
  ActionType: string;
  EntityAffected: string;
  ActionDetails: string;
  IPAddress: string;
}

// Add new interface for activity log filters
interface ActivityLogFilters {
  searchQuery: string;
  actionType: string;
  dateRange: {
    start: string;
    end: string;
  };
}

const UsersContent: React.FC = () => {
  const { user: currentUser } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // Date filter state
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [userImages, setUserImages] = useState<{ [key: string]: string }>({});

  const [isAddModalOpen, setAddModalOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEditModalOpen, setEditModalOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [newUser, setNewUser] = useState<NewUser>({
    FirstName: '',
    LastName: '',
    Email: '',
    Role: 'Faculty',
    Status: 'Invited',
    Photo: '',
    // Faculty specific fields
    DateOfBirth: '',
    HireDate: '',
    Position: '',
    DepartmentID: undefined
  });

  const [selectedUser, setSelectedUser] = useState<UserWithPasswordReset | null>(null);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);

  // Add new state for refresh interval
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Add new state for detailed status
  const [userStatuses, setUserStatuses] = useState<{ [key: string]: UserStatus }>({});
  const [checkingStatus, setCheckingStatus] = useState<{ [key: string]: boolean }>({});

  // Add new state for formatted activity logs
  const [formattedLogs, setFormattedLogs] = useState<ActivityLogDisplay[]>([]);

  // Add new state for activity log filters
  const [activityFilters, setActivityFilters] = useState<ActivityLogFilters>({
    searchQuery: '',
    actionType: '',
    dateRange: {
      start: '',
      end: ''
    }
  });

  // Add action type options
  const actionTypeOptions = [
    { value: '', label: 'All Actions' },
    { value: 'user_login', label: 'Login' },
    { value: 'user_logout', label: 'Logout' },
    { value: 'user_created', label: 'User Created' },
    { value: 'user_activated', label: 'User Activated' },
    { value: 'user_deleted', label: 'User Deleted' },
    { value: 'user_updated', label: 'User Updated' },
    { value: 'invitation_sent', label: 'Invitation Sent' },
    { value: 'invitation_expired', label: 'Invitation Expired' },
    { value: 'invitation_auto_resent', label: 'Invitation Resent' },
    { value: 'invitation_revoked', label: 'Invitation Revoked' }
  ];

  // Filter users based on search, role, and date
  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      user.FirstName.toLowerCase().includes(query) ||
      user.LastName.toLowerCase().includes(query) ||
      user.Email.toLowerCase().includes(query) ||
      user.Role.toLowerCase().includes(query) ||
      (user.Faculty?.Department?.DepartmentName?.toLowerCase().includes(query) ?? false);

    const matchesRole = selectedRole
      ? user.Role.toLowerCase() === selectedRole.toLowerCase()
      : true;

    const matchesDate = selectedDate
      ? user.DateCreated && user.DateCreated.slice(0, 10) === selectedDate
      : true;

    return matchesQuery && matchesRole && matchesDate;
  });

  // Add function to check user status
  const checkUserStatus = async (userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('User')
        .select('Status, LastLogin')
        .eq('UserID', userId)
        .single();

      if (error) throw error;

      return userData;
    } catch (error) {
      console.error('Error checking user status:', error);
      return null;
    }
  };

  // Modify fetchUsers to include status check
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setNotification(null);

      const { data: usersData, error: usersError } = await supabase
        .from('User')
        .select(`
          UserID,
          FirstName,
          LastName,
          Email,
          Photo,
          Status,
          DateCreated,
          DateModified,
          LastLogin,
          UserRole (
            role:Role (
              name
            )
          ),
          Faculty (
            FacultyID,
            DepartmentID,
            Department (
              DepartmentName
            )
          )
        `)
        .eq('isDeleted', false)
        .order('DateCreated', { ascending: false });

      if (usersError) {
        setNotification({
          type: 'error',
          message: `Failed to load users: ${usersError.message}`
        });
        return;
      }

      if (!usersData) {
        setNotification({
          type: 'error',
          message: 'No users found in the database'
        });
        return;
      }

      // Fetch Clerk user data for each user
      const clerkUsers = await Promise.all(
        usersData.map(async (user) => {
          // Only attempt to fetch Clerk user if UserID looks like a Clerk ID
          if (user.UserID && (user.UserID.startsWith('user_') || user.UserID.startsWith('inv_'))) {
            try {
              const response = await fetch(`/api/getClerkUser?userId=${user.UserID}`);
              const data = await response.json();
              return data;
            } catch (error) {
              console.error(`Error fetching Clerk user for ID ${user.UserID}:`, error);
              return null; // Return null for users where Clerk data couldn't be fetched
            }
          } else {
            // For users with non-Clerk UserID, return null or a placeholder
            console.warn(`Skipping Clerk user fetch for non-Clerk ID: ${user.UserID}`);
            return null;
          }
        })
      );

      // Create a map of user IDs to their Clerk image URLs
      const imageMap: { [key: string]: string } = {};
      clerkUsers.forEach((clerkUser, index) => {
        if (clerkUser?.imageUrl) {
          imageMap[usersData[index].UserID] = clerkUser.imageUrl;
        }
      });
      setUserImages(imageMap);

      const transformedUsers: User[] = usersData.map((rawUser) => {
        const facultyObj = Array.isArray(rawUser.Faculty) ? rawUser.Faculty[0] : rawUser.Faculty;

        const role =
        Array.isArray(rawUser.UserRole?.[0]?.role)
          ? (rawUser.UserRole?.[0]?.role[0] as { name: string } | undefined)?.name || ''
          : (rawUser.UserRole?.[0]?.role as { name: string } | undefined)?.name || '';
              if (!role) {
                console.warn(`No role found for user ${rawUser.UserID}`);
        }
        return {
          UserID: rawUser.UserID,
          FirstName: rawUser.FirstName,
          LastName: rawUser.LastName,
          Email: rawUser.Email,
          Photo: imageMap[rawUser.UserID] || rawUser.Photo || '',
          Role: role,
          Status: rawUser.Status,
          DateCreated: rawUser.DateCreated,
          DateModified: rawUser.DateModified,
          LastLogin: rawUser.LastLogin,
          Faculty: facultyObj
            ? {
                FacultyID: facultyObj.FacultyID,
                DepartmentID: facultyObj.DepartmentID,
                Department: facultyObj.Department
                  ? { DepartmentName: Array.isArray(facultyObj.Department) ? (facultyObj.Department as { DepartmentName: string }[])[0]?.DepartmentName || 'Unknown' : (facultyObj.Department as { DepartmentName: string }).DepartmentName }
                  : { DepartmentName: 'Unknown' }
              }
            : undefined
        };
      });

      setUsers(transformedUsers);
      setNotification(null);
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Modify fetchLogs to format the data
  const fetchLogs = async () => {
    if (!isViewingLogs) return;

    try {
      setLoading(true);
      const { data: logsData, error: logsError } = await supabase
        .from('ActivityLog')
        .select(`
          *,
          User (
            FirstName,
            LastName
          )
        `)
        .order('Timestamp', { ascending: false });

      if (logsError) {
        throw logsError;
      }

      // Format the logs for display
      const formatted = logsData.map(log => ({
        LogId: log.LogId,
        Timestamp: log.Timestamp,
        UserName: log.User ? `${log.User.FirstName} ${log.User.LastName}` : 'System',
        ActionType: formatActionType(log.ActionType),
        EntityAffected: log.EntityAffected,
        ActionDetails: log.ActionDetails,
        IPAddress: log.IPAddress || 'N/A'
      }));

      setFormattedLogs(formatted);
      setActivityLogs(logsData || []);
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: 'Failed to load activity logs. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add helper function to format action types
  const formatActionType = (actionType: string): string => {
    const actionMap: { [key: string]: string } = {
      'user_login': 'Login',
      'user_logout': 'Logout',
      'user_created': 'User Created',
      'user_activated': 'User Activated',
      'user_deleted': 'User Deleted',
      'user_updated': 'User Updated',
      'invitation_sent': 'Invitation Sent',
      'invitation_expired': 'Invitation Expired',
      'invitation_auto_resent': 'Invitation Resent',
      'invitation_revoked': 'Invitation Revoked'
    };
    return actionMap[actionType] || actionType;
  };

  // Add helper function to get action type color
  const getActionTypeColor = (actionType: string): string => {
    const colorMap: { [key: string]: string } = {
      'user_login': 'text-green-600',
      'user_logout': 'text-blue-600',
      'user_created': 'text-purple-600',
      'user_activated': 'text-green-600',
      'user_deleted': 'text-red-600',
      'user_updated': 'text-yellow-600',
      'invitation_sent': 'text-blue-600',
      'invitation_expired': 'text-orange-600',
      'invitation_auto_resent': 'text-indigo-600',
      'invitation_revoked': 'text-red-600'
    };
    return colorMap[actionType] || 'text-gray-600';
  };

  // Add useEffect for periodic refresh
  useEffect(() => {
    // Initial fetch
    fetchUsers();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchUsers();
    }, 30000);

    setRefreshInterval(interval);

    // Cleanup on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Add function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'Invited':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'Inactive':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Add function to get status text
  const getStatusText = (user: User) => {
    const status = userStatuses[user.UserID];
    if (!status) return user.Status;

    if (status.status === 'Invited') {
      if (!status.emailVerified) {
        return 'Invitation Sent (Email Not Verified)';
      }
      return 'Invitation Sent (Email Verified)';
    }

    if (status.status === 'Active') {
      if (status.lastLogin) {
        return `Active (Last Login: ${new Date(status.lastLogin).toLocaleDateString()})`;
      }
      return 'Active (Not Logged In)';
    }

    return status.status;
  };

  // Modify checkInvitationStatus to update local state
  const checkInvitationStatus = async (userId: string) => {
    try {
      setCheckingStatus(prev => ({ ...prev, [userId]: true }));
      const response = await fetch(`/api/checkInvitationStatus?userId=${userId}`);
      const data = await response.json();
      
      setUserStatuses(prev => ({
        ...prev,
        [userId]: {
          status: data.status,
          lastLogin: data.lastLogin,
          invitationStatus: data.invitationStatus,
          emailVerified: data.emailVerified
        }
      }));

      if (data.status === 'Active') {
        setNotification({
          type: 'success',
          message: 'User has accepted the invitation and activated their account.'
        });
        fetchUsers();
      } else {
        setNotification({
          type: 'info',
          message: `User status: ${data.status}, Email verified: ${data.emailVerified ? 'Yes' : 'No'}`
        });
      }
    } catch (error) {
      console.error('Error checking invitation status:', error);
      setNotification({
        type: 'error',
        message: 'Failed to check invitation status'
      });
    } finally {
      setCheckingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Add function to fetch departments
  const fetchDepartments = async () => {
    try {
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('Department')
        .select('DepartmentID, DepartmentName')
        .order('DepartmentName');

      if (departmentsError) {
        setNotification({
          type: 'error',
          message: `Failed to load departments: ${departmentsError.message}`
        });
        return;
      }

      setDepartments(departmentsData || []);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to load departments. Please try again.'
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const handleAddUser = async () => {
    try {
      if (!newUser.FirstName || !newUser.LastName || !newUser.Email || !newUser.Role) {
        setNotification({
          type: 'error',
          message: 'Please fill in all required fields'
        });
        return;
      }

      // Additional validation for faculty
      if (newUser.Role === 'faculty') {
        if (!newUser.DateOfBirth || !newUser.HireDate || !newUser.Position || !newUser.DepartmentID) {
          setNotification({
            type: 'error',
            message: 'Please fill in all required faculty fields'
          });
          return;
        }
      }

      if (!currentUser?.id) {
        setNotification({
          type: 'error',
          message: 'Unable to identify current user'
        });
        return;
      }

      setLoading(true);

      // Prepare the request data
      const requestData = {
        firstName: newUser.FirstName,
        lastName: newUser.LastName,
        email: newUser.Email,
        role: newUser.Role,
        createdBy: currentUser.id,
        facultyData: newUser.Role === 'faculty' ? {
          date_of_birth: newUser.DateOfBirth,
          hire_date: newUser.HireDate,
          position: newUser.Position,
          department_id: newUser.DepartmentID,
          employment_status: 'Hired'
        } : undefined
      };

      console.log('Sending request data:', requestData);

      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || data.message || 'Failed to create user');
      }

      setNewUser({
        FirstName: '',
        LastName: '',
        Email: '',
        Role: '',
        Status: '',
        Photo: '',
        // Reset faculty fields
        DateOfBirth: '',
        HireDate: '',
        Position: '',
        DepartmentID: undefined
      });
      setAddModalOpen(false);

      await fetchUsers();

      setNotification({
        type: 'success',
        message: 'User invitation sent successfully. The user will receive an email to complete their registration.'
      });
    } catch (error: unknown) {
      console.error('Error in handleAddUser:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create user. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  const openEditModal = (user: User) => {
    setUserToEdit(user);
    setEditedUser({
      ...user,
      Role: user.Role || '', // Ensure Role is never undefined
      Status: user.Status || 'Invited' // Ensure Status is never undefined
    });
    setEditModalOpen(true);
  };
  const closeEditModal = () => {
    setUserToEdit(null);
    setEditedUser(null);
    setEditModalOpen(false);
    setShowEditConfirmModal(false);
  };
  const handleEditUser = async () => {
    if (!editedUser || !currentUser?.id) {
      setNotification({
        type: 'error',
        message: 'Missing user data or current user not authenticated'
      });
      return;
    }

    try {
      setLoading(true);

      // Send status as is, without forcing uppercase
      const response = await fetch('/api/updateUser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: editedUser.UserID,
          firstName: editedUser.FirstName,
          lastName: editedUser.LastName,
          email: editedUser.Email,
          role: editedUser.Role,
          status: editedUser.Status,
          updatedBy: currentUser.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      // Close modals first
      closeEditModal();
      setShowEditConfirmModal(false);

      // Force a refresh of the users list
      await fetchUsers();

      // Update the local state to reflect changes immediately
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.UserID === editedUser.UserID 
            ? { ...user, ...editedUser, Status: editedUser.Status }
            : user
        )
      );

      // Show success message
      setNotification({
        type: 'success',
        message: 'User updated successfully'
      });

      // Clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);

    } catch (error: unknown) {
      console.error('Error updating user:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update user'
      });
    } finally {
      setLoading(false);
    }
  };
  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirmModal(true);
  };
  const closeDeleteModal = () => {
    setUserToDelete(null);
    setShowDeleteConfirmModal(false);
  };
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);

      const response = await fetch('/api/softDeleteUser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userToDelete.UserID,
          updatedBy: currentUser?.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers();
      closeDeleteModal();
      setNotification({
        type: 'success',
        message: 'User deleted successfully'
      });
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete user'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('ActivityLog')
        .select(`
          *,
          User (
            FirstName,
            LastName
          )
        `)
        .order('Timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      const csvContent = [
        ['Timestamp', 'User Name', 'Action', 'Details'].join(','),
        ...logs.map(log => [
          log.Timestamp,
          `${log.User ? log.User.FirstName + ' ' + log.User.LastName : 'System'}`,
          log.ActionType,
          log.ActionDetails
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_logs_${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: 'Failed to download logs. Please try again.'
      });
    }
  };

  const toggleView = () => setIsViewingLogs(!isViewingLogs);
  const openAddModal = () => setAddModalOpen(true);
  const handleConfirmAdd = () => {
    closeModals();
    setNewUser({
      FirstName: '',
      LastName: '',
      Email: '',
      Role: '',
      Status: '',
      Photo: '',
      // Faculty specific fields
      DateOfBirth: '',
      HireDate: '',
      Position: '',
      DepartmentID: undefined
    });
  };
  const handleEditConfirm = () => {
    setEditModalOpen(false);
    setShowEditConfirmModal(true);
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUserUpdate = (field: keyof UserWithPasswordReset, value: string | boolean) => {
    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        [field]: value,
        DateModified: new Date().toISOString()
      });
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const roleOptions = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Faculty', label: 'Faculty' },
    { value: 'Registrar', label: 'Registrar' },
    { value: 'Cashier', label: 'Cashier' }
  ];

  const closeModals = () => {
    setAddModalOpen(false);
    setEditModalOpen(false);
    setDeleteModalOpen(false);
    setSelectedUser(null);
    setShowConfirmModal(false);
    setShowConfirmEditModal(false);
  };

  const resendInvitation = async (userId: string, email: string) => {
    try {
      setCheckingStatus(prev => ({ ...prev, [userId]: true }));
      
      const response = await fetch('/api/resendInvitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend invitation');
      }

      setNotification({
        type: 'success',
        message: 'Invitation resent successfully'
      });

      // Refresh user list after a short delay
      setTimeout(() => {
        fetchUsers();
      }, 2000);

    } catch (error) {
      console.error('Error resending invitation:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to resend invitation'
      });
    } finally {
      setCheckingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Add function to filter activity logs
  const getFilteredActivityLogs = () => {
    return formattedLogs.filter(log => {
      const matchesSearch = activityFilters.searchQuery === '' || 
        log.UserName.toLowerCase().includes(activityFilters.searchQuery.toLowerCase()) ||
        log.ActionDetails.toLowerCase().includes(activityFilters.searchQuery.toLowerCase()) ||
        log.EntityAffected.toLowerCase().includes(activityFilters.searchQuery.toLowerCase());

      const matchesActionType = activityFilters.actionType === '' || 
        log.ActionType.toLowerCase() === activityFilters.actionType.toLowerCase();

      const logDate = new Date(log.Timestamp);
      const matchesDateRange = (
        (!activityFilters.dateRange.start || new Date(activityFilters.dateRange.start) <= logDate) &&
        (!activityFilters.dateRange.end || new Date(activityFilters.dateRange.end) >= logDate)
      );

      return matchesSearch && matchesActionType && matchesDateRange;
    });
  };

  // Add function to handle filter changes
  const handleFilterChange = (field: keyof ActivityLogFilters, value: any) => {
    setActivityFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add function to handle date range changes
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setActivityFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  // Add function to clear filters
  const clearFilters = () => {
    setActivityFilters({
      searchQuery: '',
      actionType: '',
      dateRange: {
        start: '',
        end: ''
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Show notification if exists */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg shadow-sm ${
          notification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isViewingLogs ? 'Activity Logs' : 'User Management'}
        </h1>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200"
            onClick={toggleView}
          >
            {isViewingLogs ? (
              <>
                <Users className="w-5 h-5 mr-2" />
                Manage Users
              </>
            ) : (
              <>
                <List className="w-5 h-5 mr-2" />
                View Activity Logs
              </>
            )}
          </button>
          {isViewingLogs ? (
            <button
              className="inline-flex items-center px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200"
              onClick={downloadLogs}
            >
              <Download className="w-5 h-5 mr-2" />
              Download
            </button>
          ) : (
            <>
              <MigrateUsersButton />
              <button
                className="inline-flex items-center px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200"
                onClick={openAddModal}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add User
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Box */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Field */}
            <div className="relative">
              <input
                type="text"
                placeholder={isViewingLogs ? 'Search activity logs...' : 'Search users...'}
                value={isViewingLogs ? activityFilters.searchQuery : searchQuery}
                onChange={(e) => isViewingLogs ? 
                  handleFilterChange('searchQuery', e.target.value) : 
                  setSearchQuery(e.target.value)
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              {isViewingLogs ? (
                <>
                  <div className="flex-1">
                    <select
                      value={activityFilters.actionType}
                      onChange={(e) => handleFilterChange('actionType', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                      aria-label="Filter by action type"
                      title="Filter by action type"
                    >
                      {actionTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={activityFilters.dateRange.start}
                      onChange={(e) => handleDateRangeChange('start', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                      title="Start date"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={activityFilters.dateRange.end}
                      onChange={(e) => handleDateRangeChange('end', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                      title="End date"
                    />
                    <button
                      onClick={clearFilters}
                      className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      title="Clear filters"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <select
                    id="roleSelect"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                  >
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="faculty">Faculty</option>
                    <option value="registrar">Registrar</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isViewingLogs ? (
            getFilteredActivityLogs().length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No activity logs found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredActivityLogs().map((log, index) => (
                    <tr key={log.LogId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.Timestamp).toLocaleString('en-US', {
                          timeZone: 'Asia/Manila',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.UserName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getActionTypeColor(log.ActionType)}`}>
                          {log.ActionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.EntityAffected}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.ActionDetails}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.IPAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <tr key={user.UserID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.UserID}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={user.Photo || '/manprofileavatar.png'}
                        alt="profile"
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {`${user.FirstName} ${user.LastName}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.Role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(user.Status)}
                        <span className={getStatusText(user)}>
                          {user.Status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.DateCreated ? new Date(user.DateCreated).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.LastLogin ? new Date(user.LastLogin).toLocaleDateString('en-US', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <div className="flex justify-center space-x-3">
                        <button
                          className="p-1.5 rounded-lg hover:bg-[#800000]/10 transition-colors duration-200"
                          onClick={() => openEditModal(user)}
                          title="Edit User"
                        >
                          <Pencil className="w-5 h-5 text-[#800000] hover:text-[#600000]" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-[#800000]/10 transition-colors duration-200"
                          onClick={() => openDeleteModal(user)}
                          title="Delete User"
                        >
                          <Trash2 className="w-5 h-5 text-[#800000] hover:text-[#600000]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Add User</h2>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={newUser.FirstName}
                      onChange={(e) => setNewUser({ ...newUser, FirstName: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={newUser.Email}
                      onChange={(e) => setNewUser({ ...newUser, Email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={newUser.LastName}
                      onChange={(e) => setNewUser({ ...newUser, LastName: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>

                  <div>
                    <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="roleSelect"
                      value={newUser.Role}
                      onChange={(e) => setNewUser({ ...newUser, Role: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="faculty">Faculty</option>
                      <option value="registrar">Registrar</option>
                      <option value="cashier">Cashier</option>
                    </select>
                  </div>
                </div>

                {/* Faculty Specific Fields */}
                {newUser.Role === 'faculty' && (
                  <>
                    <div className="col-span-2 border-t border-gray-200 pt-4 mt-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Faculty Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                            Birth Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="dateOfBirth"
                            type="date"
                            value={newUser.DateOfBirth}
                            onChange={(e) => setNewUser({ ...newUser, DateOfBirth: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700">
                            Hire Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="hireDate"
                            type="date"
                            value={newUser.HireDate}
                            onChange={(e) => setNewUser({ ...newUser, HireDate: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                            Position <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="position"
                            type="text"
                            value={newUser.Position}
                            onChange={(e) => setNewUser({ ...newUser, Position: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
                            Department <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="departmentId"
                            value={newUser.DepartmentID}
                            onChange={(e) => setNewUser({ ...newUser, DepartmentID: Number(e.target.value) })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                            required
                          >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                              <option key={dept.DepartmentID} value={dept.DepartmentID}>
                                {dept.DepartmentName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-[#800000] hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                <Save className="w-5 h-5 mr-2" />
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Delete</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {userToDelete.FirstName} {userToDelete.LastName}?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                >
                  No, Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="editFirstName" className="block text-sm font-medium text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="editFirstName"
                      type="text"
                      value={editedUser.FirstName}
                      onChange={(e) => setEditedUser({ ...editedUser, FirstName: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>

                  <div>
                    <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="editEmail"
                      type="email"
                      value={editedUser.Email}
                      onChange={(e) => setEditedUser({ ...editedUser, Email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>

                  <div>
                    <label htmlFor="editRole" className="block text-sm font-medium text-gray-700">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="editRole"
                      value={editedUser.Role}
                      onChange={(e) => setEditedUser({ ...editedUser, Role: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Registrar">Registrar</option>
                      <option value="Cashier">Cashier</option>
                    </select>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="editLastName" className="block text-sm font-medium text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="editLastName"
                      type="text"
                      value={editedUser.LastName}
                      onChange={(e) => setEditedUser({ ...editedUser, LastName: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>

                  <div>
                    <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="editStatus"
                      value={editedUser.Status}
                      onChange={(e) => setEditedUser({ ...editedUser, Status: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    >
                      <option value="Invited">Invited</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                Cancel
              </button>
              <button
                onClick={handleEditConfirm}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-white bg-[#800000] hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {showEditConfirmModal && editedUser && userToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Changes</h2>
              <div className="space-y-4 mb-6">
                <p className="text-gray-600">Please review the changes for {userToEdit.FirstName} {userToEdit.LastName}:</p>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {userToEdit.FirstName !== editedUser.FirstName && (
                    <p className="flex justify-between">
                      <span className="font-medium">First Name:</span>
                      <span className="text-gray-600">
                        <span className="line-through text-red-500">{userToEdit.FirstName}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{editedUser.FirstName}</span>
                      </span>
                    </p>
                  )}
                  {userToEdit.LastName !== editedUser.LastName && (
                    <p className="flex justify-between">
                      <span className="font-medium">Last Name:</span>
                      <span className="text-gray-600">
                        <span className="line-through text-red-500">{userToEdit.LastName}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{editedUser.LastName}</span>
                      </span>
                    </p>
                  )}
                  {userToEdit.Email !== editedUser.Email && (
                    <p className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span className="text-gray-600">
                        <span className="line-through text-red-500">{userToEdit.Email}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{editedUser.Email}</span>
                      </span>
                    </p>
                  )}
                  {userToEdit.Role !== editedUser.Role && (
                    <p className="flex justify-between">
                      <span className="font-medium">Role:</span>
                      <span className="text-gray-600">
                        <span className="line-through text-red-500">{userToEdit.Role}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{editedUser.Role}</span>
                      </span>
                    </p>
                  )}
                  {userToEdit.Status !== editedUser.Status && (
                    <p className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <span className="text-gray-600">
                        <span className="line-through text-red-500">{userToEdit.Status}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{editedUser.Status}</span>
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                >
                  Confirm Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersContent;