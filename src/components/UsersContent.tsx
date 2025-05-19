'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, List, Users, Download, X, Save } from 'lucide-react';
import React from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupabaseUser {
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
  Faculty: {
    FacultyID: number;
    DepartmentID: number;
    department: {
      Name: string;
    } | null;
  } | null;
}

interface User {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string | File;
  Role: string;
  Status: string;
  DateCreated: string;
  DateModified: string | null;
  LastLogin: string | null;
  faculty?: {
    FacultyID: number;
    DepartmentID: number;
    department: {
      Name: string;
    };
  };
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  photo: File | string;
}

interface UserWithPasswordReset extends User {
  resetPassword?: boolean;
  Photo: string | File;
  isChecked?: boolean; // For reset password checkbox state
}

// Add interface for notifications
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
  Photo: File | string;
}

const UsersContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
  
  const [newUser, setNewUser] = useState<NewUser>({
    FirstName: '',
    LastName: '',
    Email: '',
    Role: 'Faculty',
    Status: 'Active',
    Photo: ''
  });

  const [selectedUser, setSelectedUser] = useState<UserWithPasswordReset | null>(null);

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users...');
      
      const { data: usersData, error: usersError } = await supabase
        .from('User')  // Changed back to 'User' to match the schema
        .select(`
          UserID,
          FirstName,
          LastName,
          Email,
          Photo,
          Role,
          Status,
          DateCreated,
          DateModified,
          LastLogin,
          Faculty:faculty (
            FacultyID,
            DepartmentID,
            department:departments (
              Name
            )
          )
        `);

      if (usersError) {
        console.error('Error fetching users:', {
          message: usersError.message,
          details: usersError.details,
          hint: usersError.hint,
          code: usersError.code
        });
        setNotification({
          type: 'error',
          message: `Failed to load users: ${usersError.message}`
        });
        return;
      }

      if (!usersData) {
        console.error('No users data returned');
        setNotification({
          type: 'error',
          message: 'No users found in the database'
        });
        return;
      }

      console.log('Users data received:', usersData.length, 'users');

      // Transform the data to match the expected format
      const transformedUsers: User[] = usersData.map((rawUser: any) => {
        // First validate the raw data matches our expected structure
        const user: SupabaseUser = {
          UserID: rawUser.UserID,
          FirstName: rawUser.FirstName,
          LastName: rawUser.LastName,
          Email: rawUser.Email,
          Photo: rawUser.Photo,
          Role: rawUser.Role,
          Status: rawUser.Status,
          DateCreated: rawUser.DateCreated,
          DateModified: rawUser.DateModified,
          LastLogin: rawUser.LastLogin,
          Faculty: rawUser.Faculty ? {
            FacultyID: rawUser.Faculty.FacultyID,
            DepartmentID: rawUser.Faculty.DepartmentID,
            department: rawUser.Faculty.department ? {
              Name: rawUser.Faculty.department.Name
            } : null
          } : null
        };

        // Then transform to the User interface format
        return {
          UserID: user.UserID,
          FirstName: user.FirstName,
          LastName: user.LastName,
          Email: user.Email,
          Photo: user.Photo || '',
          Role: user.Role,
          Status: user.Status,
          DateCreated: user.DateCreated,
          DateModified: user.DateModified,
          LastLogin: user.LastLogin,
          faculty: user.Faculty ? {
            FacultyID: user.Faculty.FacultyID,
            DepartmentID: user.Faculty.DepartmentID,
            department: {
              Name: user.Faculty.department?.Name || 'Unknown'
            }
          } : undefined
        };
      });

      setUsers(transformedUsers);
      setNotification(null); // Clear any previous error messages on success
    } catch (error: any) {
      console.error('Unexpected error in fetchUsers:', error);
      setNotification({
        type: 'error',
        message: `An unexpected error occurred: ${error.message}`
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
          .from('activity_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (logsError) {
          throw logsError;
        }

        setActivityLogs(logsData || []);
      } catch (error: any) {
        console.error('Error fetching logs:', error);
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

  // Update useEffect to use fetchUsers
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    try {
      // Validate required fields
      if (!newUser.FirstName || !newUser.LastName || !newUser.Email || !newUser.Role) {
        setNotification({
          type: 'error',
          message: 'Please fill in all required fields'
        });
        return;
      }

      setLoading(true);
      console.log('Creating user:', newUser);

      // Create user through the API
      const response = await fetch('/api/createUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: newUser.FirstName,
          lastName: newUser.LastName,
          email: newUser.Email,
          role: newUser.Role
        }),
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || data.message || 'Failed to create user');
      }

      // Reset form and close modal
      setNewUser({
        FirstName: '',
        LastName: '',
        Email: '',
        Role: 'Faculty',
        Status: 'Active',
        Photo: ''
      });
      setAddModalOpen(false);
      
      // Refresh user list
      await fetchUsers();
      
      setNotification({
        type: 'success',
        message: 'User created successfully'
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to create user. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser?.UserID) return;

    try {
      setLoading(true);

      const updatedUser = {
        userId: selectedUser.UserID,
        role: selectedUser.Role,
        status: selectedUser.Status,
        photo: selectedUser.Photo,
        email: selectedUser.Email,
        firstName: selectedUser.FirstName,
        lastName: selectedUser.LastName
      };

      // Update user through the API
      const response = await fetch('/api/updateUser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      await fetchUsers();
      closeModals();
      setNotification({
        type: 'success',
        message: 'User updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to update user'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);

      // Delete user through the API
      const response = await fetch('/api/deleteUser', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.UserID
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers();
      closeModals();
      setNotification({
        type: 'success',
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setNotification({
        type: 'error',
        message: error.message || 'Failed to delete user'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      const csvContent = [
        ['Timestamp', 'User ID', 'Action', 'Details'].join(','),
        ...logs.map(log => [
          log.timestamp,
          log.user_id,
          log.action,
          log.details
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
    } catch (error: any) {
      console.error('Error downloading logs:', error);
      setNotification({
        type: 'error',
        message: 'Failed to download logs. Please try again.'
      });
    }
  };

  const toggleView = () => setIsViewingLogs(!isViewingLogs);
  const openAddModal = () => setAddModalOpen(true);
  const openEditModal = (user: User) => {
      setSelectedUser(user);
      setEditModalOpen(true);
  };
  const openDeleteModal = (user: User) => {
      setSelectedUser(user);
      setDeleteModalOpen(true);
  };
  const closeModals = () => {
      setAddModalOpen(false);
      setEditModalOpen(false);
      setDeleteModalOpen(false);
      setSelectedUser(null);
      setShowConfirmModal(false);  // Close the confirm modal
      setShowConfirmEditModal(false);  // Close the confirm edit modal
  };

  const handleConfirmAdd = () => {
      console.log('User added:', newUser);
      closeModals();  // Close modals after confirming
      setNewUser({
      FirstName: '',
      LastName: '',
      Email: '',
      Role: '',
      Status: '',
      Photo: ''
      });
  };

  const handleConfirmEdit = () => {
      console.log('User edited:', selectedUser);
      closeModals();  // Close modals after confirming edit
  };

  const [resetPassword, setResetPassword] = useState(false);

  const handleUserUpdate = (field: keyof UserWithPasswordReset, value: string | boolean) => {
    if (selectedUser) {
      setSelectedUser({
        ...selectedUser,
        [field]: value,
        DateModified: new Date().toISOString()
      });
    }
  };

  // Update the role options to match Role enum exactly
  const roleOptions = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Faculty', label: 'Faculty' },
    { value: 'Registrar', label: 'Registrar' },
    { value: 'Cashier', label: 'Cashier' }
  ];

  return (
      <div className="text-black p-4 min-h-screen">
      {/* Show notification if exists */}
      {notification && (
        <div className={`mb-4 p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 border-green-400 text-green-700' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

          {/* Header */}
          <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-black">
                  {isViewingLogs ? 'Activity Logs' : 'User Management'}
              </h1>
              <div className="flex space-x-2">
                  <button
                      className="bg-white border border-[#800000] text-[#800000] px-4 py-2 rounded hover:bg-[#800000] hover:text-white transition flex items-center"
                      onClick={toggleView}
                  >
                      {isViewingLogs ? (
                          <>
                              <Users className="w-4 h-4 mr-2" />
                              Manage Users
                          </>
                      ) : (
                          <>
                              <List className="w-4 h-4 mr-2" />
                              View Activity Logs
                          </>
                      )}
                  </button>
                  {isViewingLogs ? (
                      <button
                          className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800 transition flex items-center"
                          onClick={() => console.log("Download Logs")}
                      >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                      </button>
                  ) : (
                      <button
                          className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800 transition flex items-center"
                          onClick={openAddModal}
                      >
                          <Plus className="w-4 h-4 mr-2" />
                          Add User
                      </button>
                  )}
              </div>
          </div>

          {/* Content Box */}
          <div className="bg-white shadow-lg p-4 rounded-lg h-[75vh] flex flex-col overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Search Field */}
                  <div>
                      <input
                          type="text"
                          placeholder={isViewingLogs ? 'Search activity logs...' : 'Search users...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded"
                      />
                  </div>

                  {/* Filters */}
                  <div className="flex flex-col space-y-2 md:flex-row md:items-end md:space-x-4 md:space-y-0">
                      <div className="flex-1">
                          <label htmlFor="roleSelect" className="text-sm font-medium" title="Role">
                              {/* Role */}
                          </label>
                          <select
                              id="roleSelect"
                              title="Role"
                              aria-label="Role"
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded"
                          >
                              <option value="">All Roles</option>
                              <option value="admin">Admin</option>
                              <option value="faculty">Faculty</option>
                              <option value="registrar">Registrar</option>
                              <option value="cashier">Cashier</option>
                          </select>
                      </div>
                      <div>
                          <button title="Date" className="flex items-center px-3 py-2 border border-gray-300 rounded hover:bg-gray-100">
                              <Calendar className="w-4 h-4 mr-2" />
                              Select Date
                          </button>
                      </div>
                  </div>
              </div>

              {/* Placeholder Table or Content */}
              <div className="flex-1 overflow-auto">
                  {isViewingLogs ? (
                      <p className="text-gray-500 text-center mt-10">
                          Activity logs list content here...
                      </p>
                  ) : (
                      <table className="table-auto w-full text-left">
                          <thead>
                              <tr className="bg-gray-100">
                                  <th className="p-2">#</th>
                                  <th className="p-2">User ID</th>
                                  <th className="p-2 text-left">Image</th>
                                  <th className="p-2">Name</th>
                                  <th className="p-2">Role</th>
                                  <th className="p-2">Status</th>
                                  <th className="p-2">Date Added</th>
                                  <th className="p-2">Last Login</th>
                                  <th className="p-2 text-center">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                {users.map((user, index) => (
                  <tr key={user.UserID}>
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">{user.UserID}</td>
                                  <td className="p-2">
                      <img 
                        src={typeof user.Photo === 'string' && user.Photo ? user.Photo : '/manprofileavatar.png'} 
                        alt='profile' 
                        className="w-10 h-10 rounded-full object-cover" 
                      />
                                  </td>
                    <td className="p-2">{`${user.FirstName} ${user.LastName}`}</td>
                    <td className="p-2">{user.Role}</td>
                    <td className="p-2">{user.Status}</td>
                    <td className="p-2">{user.DateCreated || 'N/A'}</td>
                    <td className="p-2">{user.LastLogin || 'N/A'}</td>
                                  <td className="p-2">
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded" 
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </button>
                      <button
                        title="Delete"
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2" 
                        onClick={() => openDeleteModal(user)}
                      >
                        Delete
                      </button>
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
                  <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl relative">
                      {/* Close Icon */}
                      <button
                          title="Close"
                          onClick={closeModals}
                          className="absolute top-4 right-4 text-gray-500 hover:text-black"
                      >
                          <X className="w-5 h-5" />
                      </button>

                      <h2 className="text-xl font-bold mb-4">Add User</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="firstName" className="text-sm font-medium" title="firstName">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                title="First Name"
                                aria-label="First Name"
                                placeholder="Enter first name"
                                value={newUser.FirstName}
                                onChange={(e) => setNewUser({ ...newUser, FirstName: e.target.value })}
                                className="p-2 border border-gray-300 rounded"
                            />

                            <label htmlFor="email" className="text-sm font-medium">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="email"
                                type="email"
                                title="Email Address"
                                aria-label="Email"
                                placeholder="Enter email"
                                value={newUser.Email}
                                onChange={(e) => setNewUser({ ...newUser, Email: e.target.value })}
                                className="p-2 border border-gray-300 rounded"
                            />

                            <label htmlFor="roleSelect" className="text-sm font-medium">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="roleSelect"
                                aria-label="Role"
                                title="Role"
                                value={newUser.Role}
                                onChange={(e) => setNewUser({ ...newUser, Role: e.target.value })}
                                className="p-2 border border-gray-300 rounded"
                            >
                                <option value="">Select Role</option>
                                <option value="admin">Admin</option>
                                <option value="faculty">Faculty</option>
                                <option value="registrar">Registrar</option>
                                <option value="cashier">Cashier</option>
                            </select>
                        </div>

                        {/* Right Column */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="lastName" className="text-sm font-medium">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                title="Last Name"
                                aria-label="Last Name"
                                placeholder="Enter last name"
                                value={newUser.LastName}
                                onChange={(e) => setNewUser({ ...newUser, LastName: e.target.value })}
                                className="p-2 border border-gray-300 rounded"
                            />

                            <label htmlFor="Status" className="text-sm font-medium">
                                Status <span className="text-red-500">*</span>
                            </label>
                            <select title="Status" id="Status"
                                aria-label="Status"
                                value={selectedUser?.Status}
                                onChange={(e) =>
                                    setSelectedUser(prev =>
                                        prev ? { ...prev, Status: e.target.value } : prev
                                    )
                                }
                                className="p-2 border border-gray-300 rounded"
                            >
                                <option value="">Select Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            <label htmlFor="photoUpload" className="text-sm font-medium">
                                Photo <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="photoUpload"
                                type="file"
                                accept="image/png, image/jpeg"
                                title="Upload Photo"
                                aria-label="Upload Photo"
                                placeholder="Choose a photo"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setNewUser(prev => ({ ...prev, Photo: file }));
                                    }
                                }}
                                className="p-2 border border-gray-300 rounded"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end mt-6">
                        <button
                            title="Save"
                            onClick={handleAddUser}
                            className="bg-[#800000] text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-red-800"
                        >
                            <Save className="w-4 h-4" />
                            <span>Save New User</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Confirm Add User Modal */}
        {showConfirmModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Confirm New User</h2>
                    <p><strong>First Name:</strong> {newUser.FirstName}</p>
                    <p><strong>Last Name:</strong> {newUser.LastName}</p>
                    <p><strong>Email:</strong> {newUser.Email}</p>
                    <p><strong>Role:</strong> {newUser.Role}</p>
                    <p><strong>Status:</strong> {newUser.Status}</p>
                    <p>
                        <strong>Photo:</strong>{' '}
                        {newUser.Photo ? (
                            'uploaded' //newUser.photo.name // Display the filename of the uploaded photo
                        ) : (
                            'No photo uploaded'
                        )}
                    </p>

                    <div className="flex justify-end mt-4 space-x-4">
                        <button
                            title="Confirm"
                            onClick={handleConfirmAdd}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            Confirm
                        </button>
                        <button
                            title="Cancel"
                            onClick={() => setShowConfirmModal(false)}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

{isEditModalOpen && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl relative">
            {/* Close Icon */}
            <button
                title="Close"
                onClick={closeModals}
                className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
                <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit User</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="flex flex-col space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                        First Name
                    </label>
                    <input
                        id="firstName"
                        type="text"
                        value={selectedUser?.FirstName}
                        readOnly
                        title="First Name"
                        className="p-2 border border-gray-300 rounded"
                    />

                    <label htmlFor="email" className="text-sm font-medium">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="email"
                        title="email"
                        aria-label="Email"
                        type="email"
                        value={selectedUser?.Email}
                        onChange={(e) => selectedUser && setSelectedUser({ ...selectedUser, Email: e.target.value })}
                        className="p-2 border border-gray-300 rounded"
                    />

                    <label htmlFor='roleSelect' className="text-sm font-medium">
                        Role <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="roleSelect"
                        title="Role"
                        aria-label="Role"
                        value={selectedUser?.Role}
                        onChange={(e) => selectedUser && setSelectedUser(prev => prev ? { ...prev, Role: e.target.value } : prev)}
                        className="p-2 border border-gray-300 rounded"
                    >
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="faculty">Faculty</option>
                        <option value="registrar">Registrar</option>
                        <option value="cashier">Cashier</option>
                    </select>
                </div>

                {/* Right Column */}
                <div className="flex flex-col space-y-2">
                    <label htmlFor='lastName' className="text-sm font-medium">
                        Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="lastName"
                        title="lastName"
                        aria-label="Last Name"
                        type="text"
                        value={selectedUser?.LastName}
                        readOnly
                        className="p-2 border border-gray-300 rounded"
                    />

                    <label htmlFor='Status' className="text-sm font-medium">
                        Status <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="Status"
                        title="Status"
                        aria-label="Status"
                        value={selectedUser?.Status}
                        onChange={(e) =>
                            setSelectedUser(prev =>
                                prev ? { ...prev, Status: e.target.value } : prev
                            )
                        }
                        className="p-2 border border-gray-300 rounded"
                    >
                        <option value="">Select Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>

                    <label htmlFor="photoUpload" className="text-sm font-medium">
                        Photo <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="photoUpload"
                        title="UploadPhoto"
                        aria-label="Upload Photo"
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setSelectedUser(prev => prev ? { ...prev, Photo: file } : prev);
                            }
                        }}
                        className="p-2 border border-gray-300 rounded"
                    />

                    {/* Checkbox */}
                    <div className="flex items-center space-x-2 mt-4">
                        <input
                            title="ResetPassword"
                            type="checkbox"
                            checked={selectedUser?.isChecked || false}
                            onChange={(e) =>
                                setSelectedUser(prev =>
                                    prev
                                        ? { ...prev, isChecked: e.target.checked }
                                        : prev
                                )
                            }
                            className="w-5 h-5"
                        />
                        <label className="text-sm font-medium">
                            Reset Password
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end mt-6">
                <button
                    onClick={handleEditUser}
                    className="bg-[#800000] text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-red-800"
                >
                    <Save className="w-4 h-4" />
                    <span>Save Edit</span>
                </button>
            </div>
        </div>
    </div>
)}

{/* Confirm Edit */}
        {showConfirmEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Confirm Edit</h2>
                    <p><strong>First Name:</strong> {selectedUser?.FirstName}</p>
                    <p><strong>Last Name:</strong> {selectedUser?.LastName}</p>
                    <p><strong>Email:</strong> {selectedUser?.Email}</p>
                    <p><strong>Role:</strong> {selectedUser?.Role}</p>
                    <p><strong>Status:</strong> {selectedUser?.Status}</p>
                    <p>
                      <strong>Photo:</strong>{' '}
                      {typeof selectedUser?.Photo === 'string'
                        ? selectedUser.Photo
                        : selectedUser?.Photo instanceof File
                          ? selectedUser.Photo.name
                          : ''}
                    </p>
                    
                    {/* Reset Password Status */}
                    <p><strong>Reset Password:</strong> {selectedUser?.isChecked ? 'Yes' : 'No'}</p>

                    <div className="flex justify-end mt-4 space-x-4">
                        <button
                            title="Confirm"
                            onClick={handleConfirmEdit}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            Confirm
                        </button>
                        <button
                            title="Cancel"
                            onClick={() => setShowConfirmEditModal(false)}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
            
        {/* Delete User Modal */}
        {isDeleteModalOpen && selectedUser && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
                    <h2 className="text-2xl font-bold mb-4 text-[#800000]">Confirm Delete</h2>
                    <p className="mb-6 text-gray-700">
                        Are you sure you want to delete <strong>{selectedUser.LastName}</strong>?
                    </p>
                    <div className="flex justify-center space-x-4">
                        <button
                            title="Delete"
                            onClick={() => { console.log('User deleted'); closeModals(); }}
                            className="bg-red-600 hover:bg-[#800000] text-white px-4 py-2 rounded"
                        >
                            Yes, Delete
                        </button>
                        <button
                            title="Cancel"
                            onClick={closeModals}
                            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

    </div>
);
};

export default UsersContent;