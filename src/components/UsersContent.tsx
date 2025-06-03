'use client';

import { useState, useEffect } from 'react';
import {  Plus, List, Users, Download, X, Save, Pencil, Trash2 } from 'lucide-react';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';

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
  type: 'success' | 'error';
  message: string;
}

interface NewUser {
  FirstName: string;
  LastName: string;
  Email: string;
  Role: string;
  Status: string;
  Photo: string;
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
    Status: 'active',
    Photo: ''
  });

  const [selectedUser, setSelectedUser] = useState<UserWithPasswordReset | null>(null);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);

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

  // Fetch users from Supabase
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
        .eq('isDeleted', false);

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
          try {
            const response = await fetch(`/api/getClerkUser?userId=${user.UserID}`);
            const data = await response.json();
            return data;
          } catch (error) {
            console.error('Error fetching Clerk user:', error);
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

  // Fetch activity logs
  useEffect(() => {
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

        setActivityLogs(logsData || []);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error: unknown) {
        setNotification({
          type: 'error',
          message: 'Failed to load activity logs. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isViewingLogs]);

  useEffect(() => {
    fetchUsers();
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

      if (!currentUser?.id) {
        setNotification({
          type: 'error',
          message: 'Unable to identify current user'
        });
        return;
      }

      setLoading(true);

      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newUser.FirstName,
          lastName: newUser.LastName,
          email: newUser.Email,
          role: newUser.Role,
          createdBy: currentUser.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create user');
      }

      setNewUser({
        FirstName: '',
        LastName: '',
        Email: '',
        Role: '',
        Status: '',
        Photo: ''
      });
      setAddModalOpen(false);

      await fetchUsers();

      setNotification({
        type: 'success',
        message: 'User invitation sent successfully. The user will receive an email to complete their registration.'
      });
    } catch (error: unknown) {
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
    setEditedUser(user);
    setEditModalOpen(true);
  };
  const closeEditModal = () => {
    setUserToEdit(null);
    setEditedUser(null);
    setEditModalOpen(false);
    setShowEditConfirmModal(false);
  };
  const handleEditUser = async () => {
    if (!editedUser || !currentUser?.id) return;

    try {
      setLoading(true);

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

      // Fetch fresh data from the server immediately
      await fetchUsers();

      // Show success message
      setNotification({
        type: 'success',
        message: 'User updated successfully'
      });

      // Clear any existing timeouts
      const timeoutId = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timeoutId);

    } catch (error: unknown) {
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

      const response = await fetch('/api/deleteUser', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userToDelete.UserID,
          createdBy: currentUser?.id
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
      Photo: ''
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Show notification if exists */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg shadow-sm ${
          notification.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
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
            <button
              className="inline-flex items-center px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200"
              onClick={openAddModal}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add User
            </button>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                  title="Filter by date"
                  aria-label="Filter by date"
                />
                {selectedDate && (
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setSelectedDate('')}
                    title="Clear date filter"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isViewingLogs ? (
            activityLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No activity logs found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Done By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityLogs.map((log, index) => (
                    <tr key={log.LogId || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.Timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.User ? `${log.User.FirstName} ${log.User.LastName}` : 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ActionType}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{log.ActionDetails}</td>
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.Status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.Status}
                      </span>
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
                    <label htmlFor="Status" className="block text-sm font-medium text-gray-700">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="Status"
                      value={newUser.Status}
                      onChange={(e) => setNewUser({ ...newUser, Status: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    >
                      <option value="">Select Status</option>
                      <option value="Invited">Invited</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="photoUpload" className="block text-sm font-medium text-gray-700">
                      Photo
                    </label>
                    <input
                      id="photoUpload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Convert File to string URL for preview
                          const fileUrl = URL.createObjectURL(file);
                          setNewUser({ ...newUser, Photo: fileUrl });
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>
                </div>
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
                    <p><span className="font-medium">First Name:</span> {userToEdit.FirstName} → {editedUser.FirstName}</p>
                  )}
                  {userToEdit.LastName !== editedUser.LastName && (
                    <p><span className="font-medium">Last Name:</span> {userToEdit.LastName} → {editedUser.LastName}</p>
                  )}
                  {userToEdit.Email !== editedUser.Email && (
                    <p><span className="font-medium">Email:</span> {userToEdit.Email} → {editedUser.Email}</p>
                  )}
                  {userToEdit.Role !== editedUser.Role && (
                    <p><span className="font-medium">Role:</span> {userToEdit.Role} → {editedUser.Role}</p>
                  )}
                  {userToEdit.Status !== editedUser.Status && (
                    <p><span className="font-medium">Status:</span> {userToEdit.Status} → {editedUser.Status}</p>
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