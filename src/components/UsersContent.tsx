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
  Photo: string | File;
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
  Photo: File | string;
}

const UsersContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); // Date filter state
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
    Status: 'active',
    Photo: ''
  });

  const [selectedUser, setSelectedUser] = useState<UserWithPasswordReset | null>(null);

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
        `);

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

      const transformedUsers: User[] = usersData.map((rawUser) => {
        const facultyObj = Array.isArray(rawUser.Faculty) ? rawUser.Faculty[0] : rawUser.Faculty;
        return {
          UserID: rawUser.UserID,
          FirstName: rawUser.FirstName,
          LastName: rawUser.LastName,
          Email: rawUser.Email,
          Photo: rawUser.Photo || '',
          Role: rawUser.UserRole && rawUser.UserRole.length > 0
            ? rawUser.UserRole
                .map((ur: unknown) => {
                  const userRole = ur as { role: { name: string }[] | { name: string } | null | undefined };
                  if (Array.isArray(userRole.role)) {
                    return userRole.role.map((r: unknown) => (r as { name: string }).name).join(', ');
                  } else {
                    return userRole.role?.name || '';
                  }
                })
                .join(', ')
            : '',
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
          role: newUser.Role
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
        message: 'User created successfully'
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
    } catch (error: unknown) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update user'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);

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
    } catch (error: unknown) {
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
    setShowConfirmModal(false);
    setShowConfirmEditModal(false);
  };

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

  const handleConfirmEdit = () => {
    closeModals();
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
              onClick={downloadLogs}
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
            {/* Date Picker */}
            <div className="flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
                title="Filter by Date Added"
              />
              {selectedDate && (
                <button
                  type="button"
                  className="ml-2 text-gray-500 hover:text-black"
                  onClick={() => setSelectedDate('')}
                  title="Clear date filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Placeholder Table or Content */}
        <div className="flex-1 overflow-auto">
          {isViewingLogs ? (
            activityLogs.length === 0 ? (
              <p className="text-gray-500 text-center mt-10">
                Activity logs list content here. No Activity Logs at the moment.
              </p>
            ) : (
              <table className="table-auto w-full text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2">#</th>
                    <th className="p-2">Timestamp</th>
                    <th className="p-2">Done By</th>
                    <th className="p-2">Action</th>
                    <th className="p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log, index) => (
                    <tr key={log.LogId || index}>
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{new Date(log.Timestamp).toLocaleString()}</td>
                      <td className="p-2">
                        {log.User ? `${log.User.FirstName} ${log.User.LastName}` : 'System'}
                      </td>
                      <td className="p-2">{log.ActionType}</td>
                      <td className="p-2">{log.ActionDetails}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
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
                {filteredUsers.map((user, index) => (
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
                <select
                  title="Status"
                  id="Status"
                  aria-label="Status"
                  value={newUser.Status}
                  onChange={(e) =>
                    setNewUser(prev => ({ ...prev, Status: e.target.value }))
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
                'uploaded'
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

      {/* ...Edit User Modal, Confirm Edit Modal, Delete Modal (unchanged)... */}
      {/* Keep your existing Edit, Confirm Edit, and Delete modals here */}
    </div>
  );
};

export default UsersContent;