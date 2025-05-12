'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus, List, Users, Download, X, Save } from 'lucide-react';
import React from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust this import path to your supabase client initialization file

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  photo_url?: string | null;
  isChecked?: boolean; // For reset password checkbox state
  created_at?: string | null; // optional date fields
  last_login?: string | null;
}

interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  photo?: File | null;
  isChecked?: boolean;
}

const UsersContent: React.FC = () => {
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isViewingLogs, setIsViewingLogs] = useState(false);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);  // Confirm add modal
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);  // Confirm edit modal

  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<NewUser>({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    status: '',
    photo: null,
    isChecked: false,
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Toggle between user management and logs
  const toggleView = () => setIsViewingLogs(!isViewingLogs);

  // Modal open/close handlers
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

  // Fetch users from Supabase on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from<User>('users').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data ?? []);
    }
  };

  // Upload photo to Supabase Storage 'photos' bucket & return public URL
  const uploadPhoto = async (file: File) => {
    try {
      // Validate file type explicitly
      if (!file.type.startsWith('image/png') && !file.type.startsWith('image/jpeg')) {
        alert('Only PNG or JPEG files are allowed.');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      if (!fileExt) {
        alert('File extension could not be determined.');
        return null;
      }

      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `user-photos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) {
        console.error('Error uploading photo:', uploadError.message);
        alert('Upload failed: ' + uploadError.message);
        return null;
      }

      // Get public URL for uploaded file
      const { publicURL, error: publicUrlError } = supabase.storage.from('photos').getPublicUrl(filePath);
      if (publicUrlError) {
        console.error('Error getting public URL:', publicUrlError.message);
        alert('Failed to get public URL for uploaded photo.');
        return null;
      }

      return publicURL;
    } catch (err) {
      console.error('Unexpected error in uploadPhoto:', err);
      alert('Unexpected error during photo upload.');
      return null;
    }
  };

  // Reset Add User form
  const resetNewUser = () => {
    setNewUser({
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      status: '',
      photo: null,
      isChecked: false,
    });
  };

  // Handle Add User - open confirm modal
  const handleAddUser = () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.role || !newUser.status) {
      alert('Please fill all required fields');
      return;
    }
    setShowConfirmModal(true);
  };

  // Confirm add user - insert in Supabase & update UI
  const handleConfirmAdd = async () => {
    let photo_url = null; // default photo_url null for no photo

    try {
      if (newUser.photo instanceof File) {
        const uploadedUrl = await uploadPhoto(newUser.photo);
        if (uploadedUrl) {
          photo_url = uploadedUrl;
        } else {
          alert('Photo upload failed, user not saved.');
          return;
        }
      }

      console.log('Inserting user with data:', {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        photo_url,
      });

      const { data, error } = await supabase.from('users').insert([
        {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          photo_url: photo_url,
        },
      ]).select();

      if (error) {
        console.error('Insert error:', error);
        alert('Failed to add user: ' + error.message);
        return;
      }

      console.log('Insert success:', data);
      if (!data || data.length === 0) {
        alert('No user data returned after insertion.');
        return;
      }

      setUsers((prev) => [data[0], ...prev]);
      closeModals();
      resetNewUser();
    } catch (err) {
      console.error('Unexpected error in handleConfirmAdd:', err);
      alert('Unexpected error during adding user.');
    }
  };

  // Remaining code unchanged ...

  // Handle Edit User - open confirm edit modal
  const handleEditUser = () => {
    if (!selectedUser) return;
    if (!selectedUser.firstName || !selectedUser.lastName || !selectedUser.email || !selectedUser.role || !selectedUser.status) {
      alert('Please fill all required fields');
      return;
    }
    setShowConfirmEditModal(true);
  };

  // Confirm edit user - update Supabase record & update UI
  const handleConfirmEdit = async () => {
    if (!selectedUser) return;

    let photo_url = selectedUser.photo_url ?? '';

    // Upload new photo only if File exists
    if (selectedUser.photo && selectedUser.photo instanceof File) {
      try {
        const url = await uploadPhoto(selectedUser.photo);
        if (url) {
          photo_url = url;
        } else {
          console.error('Failed to upload photo, URL is empty');
          alert('Failed to upload photo.');
          return;
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Error uploading photo.');
        return;
      }
    }

    const { error } = await supabase.from('users').update({
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      email: selectedUser.email,
      role: selectedUser.role,
      status: selectedUser.status,
      photo_url,
    }).eq('id', selectedUser.id);

    if (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } else {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id ? { ...user, ...selectedUser, photo_url } : user
        )
      );
      closeModals();
    }
  };

  // Handle confirming delete user
  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    const { error } = await supabase.from('users').delete().eq('id', selectedUser.id);
    if (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } else {
      setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
      closeModals();
    }
  };

  // Filter users based on search query and selected role
  const filteredUsers = users.filter(user => {
    const matchesRole = selectedRole ? user.role === selectedRole : true;
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase()) || user.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="text-black p-4 min-h-screen">
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
          <div className="bg-white border-2 border-red-500 p-4 rounded-lg h-[75vh] flex flex-col overflow-auto">
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
              <select
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
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded hover:bg-gray-100">
                <Calendar className="w-4 h-4 mr-2" />
                Select Date
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
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
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center p-4 text-gray-500">No users found.</td></tr>
                ) : filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2">{user.id}</td>
                    <td className="p-2">
                      {user.photo_url ? (
                        <img
                          src={user.photo_url}
                          alt="profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="p-2">{user.firstName} {user.lastName}</td>
                    <td className="p-2 capitalize">{user.role}</td>
                    <td className="p-2 capitalize">{user.status}</td>
                    <td className="p-2">{user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</td>
                    <td className="p-2">{user.last_login ? new Date(user.last_login).toLocaleString() : ''}</td>
                    <td className="p-2 text-center">
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                        onClick={() => openEditModal(user)}
                      >
                        Edit
                      </button>
                      <button
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
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl relative overflow-auto max-h-[90vh]">
            {/* Close Icon */}
            <button
              onClick={closeModals}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
              aria-label="Close Add User Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Add User</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="p-2 border border-gray-300 rounded"
                />

                <label className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="p-2 border border-gray-300 rounded"
                />

                <label className="text-sm font-medium">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
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
                <label className="text-sm font-medium">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="p-2 border border-gray-300 rounded"
                />

                <label className="text-sm font-medium">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUser.status}
                  onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                  className="p-2 border border-gray-300 rounded"
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <label className="text-sm font-medium">
                  Photo (png or jpeg) - Optional
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewUser({ ...newUser, photo: file });
                    } else {
                      setNewUser({ ...newUser, photo: null });
                    }
                  }}
                  className="p-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleAddUser}
                className="bg-[#800000] text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-red-800"
              >
                <Save className="w-4 h-4" />
                <span>Save User</span>
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
            <p><strong>First Name:</strong> {newUser.firstName}</p>
            <p><strong>Last Name:</strong> {newUser.lastName}</p>
            <p><strong>Email:</strong> {newUser.email}</p>
            <p><strong>Role:</strong> {newUser.role}</p>
            <p><strong>Status:</strong> {newUser.status}</p>
            <p>
              <strong>Photo:</strong>{' '}
              {newUser.photo ? (
                'uploaded'
              ) : (
                'No photo uploaded'
              )}
            </p>

            <div className="flex justify-end mt-4 space-x-4">
              <button
                onClick={handleConfirmAdd}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit, Confirm Edit, Delete Modals unchanged - omitted here for brevity but included in full file */}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl relative overflow-auto max-h-[90vh]">
            <button
              onClick={closeModals}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
              aria-label="Close Edit User Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit User</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">
                  First Name
                </label>
                <input
                  type="text"
                  value={selectedUser.firstName}
                  readOnly
                  className="p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                />

                <label className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="p-2 border border-gray-300 rounded"
                />

                <label className="text-sm font-medium">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
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
                <label className="text-sm font-medium">
                  Last Name
                </label>
                <input
                  type="text"
                  value={selectedUser.lastName}
                  readOnly
                  className="p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                />

                <label className="text-sm font-medium">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                  className="p-2 border border-gray-300 rounded"
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <label className="text-sm font-medium">
                  Photo (png or jpeg) - Optional
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedUser) {
                      setSelectedUser({ ...selectedUser, photo: file });
                    } else if(selectedUser) {
                      setSelectedUser({ ...selectedUser, photo: null });
                    }
                  }}
                  className="p-2 border border-gray-300 rounded"
                />

                {/* Checkbox */}
                <div className="flex items-center space-x-2 mt-4">
                  <input
                    type="checkbox"
                    checked={selectedUser.isChecked || false}
                    onChange={(e) =>
                      setSelectedUser({ ...selectedUser, isChecked: e.target.checked })
                    }
                    className="w-5 h-5"
                    id="resetPasswordCheckbox"
                  />
                  <label className="text-sm font-medium" htmlFor="resetPasswordCheckbox">
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

      {/* Confirm Edit Modal */}
      {showConfirmEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Edit</h2>
            <p><strong>First Name:</strong> {selectedUser.firstName}</p>
            <p><strong>Last Name:</strong> {selectedUser.lastName}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Role:</strong> {selectedUser.role}</p>
            <p><strong>Status:</strong> {selectedUser.status}</p>
            <p>
              <strong>Photo:</strong> {selectedUser.photo instanceof File ? 'uploaded' : selectedUser.photo_url ?? 'No photo'}
            </p>
            <p><strong>Reset Password:</strong> {selectedUser.isChecked ? 'Yes' : 'No'}</p>

            <div className="flex justify-end mt-4 space-x-4">
              <button
                onClick={handleConfirmEdit}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Confirm
              </button>
              <button
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
              Are you sure you want to delete <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-[#800000] text-white px-4 py-2 rounded"
              >
                Yes, Delete
              </button>
              <button
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
// const UsersContent: React.FC = () => {
//   const [search, setSearch] = useState('');

//   const users = [
//     {
//       id: 'Admin1',
//       name: 'Jane Smith',
//       role: 'Admin',
//       status: 'Active',
//       permissions: 'ALL',
//       dateAdded: 'March 20, 2025 11:00:09 AM',
//       lastLogin: 'March 20, 2025 11:05:10 AM',
//       image: '/avatars/avatar1.png',
//     },
//     {
//       id: '2025-0001-SJSFI',
//       name: 'Maria Reyes',
//       role: 'Faculty',
//       status: 'Active',
//       permissions: 'View and Edit Own Data',
//       dateAdded: 'March 20, 2025 11:00:59 AM',
//       lastLogin: 'March 20, 2025 11:15:10 AM',
//       image: '/avatars/avatar2.png',
//     },
//     {
//       id: '2025-0002-SJSFI',
//       name: 'Joseph Fajardo',
//       role: 'Faculty',
//       status: 'Active',
//       permissions: 'View and Edit Own Data',
//       dateAdded: 'March 20, 2025 11:01:45 AM',
//       lastLogin: 'March 20, 2025 11:15:30 AM',
//       image: '/avatars/avatar3.png',
//     },
//     {
//       id: '2025-0003-SJSFI',
//       name: 'Megan Lee',
//       role: 'Faculty',
//       status: 'Active',
//       permissions: 'View and Edit Own Data',
//       dateAdded: 'March 20, 2025 11:02:39 AM',
//       lastLogin: 'March 20, 2025 11:15:40 AM',
//       image: '/avatars/avatar4.png',
//     },
//     {
//       id: '2025-0004-SJSFI',
//       name: 'Danny Rubles',
//       role: 'Faculty',
//       status: 'Active',
//       permissions: 'View and Edit Own Data',
//       dateAdded: 'March 20, 2025 11:03:40 AM',
//       lastLogin: 'March 20, 2025 11:25:10 AM',
//       image: '/avatars/avatar5.png',
//     },
//   ];

//   const filtered = users.filter((user) =>
//     user.name.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">User Management</h1>

//       {/* Action Buttons */}
//       <div className="flex justify-end space-x-2 mb-4">
//         <button className="bg-[#800000] text-white px-4 py-2 rounded hover:opacity-90">
//           View Activity Logs
//         </button>
//         <button className="bg-[#800000] text-white px-4 py-2 rounded hover:opacity-90">
//           + Add User
//         </button>
//       </div>

//       {/* Search and Filter Bar */}
//       <div className="flex gap-3 mb-4">
//         <input
//           type="text"
//           placeholder="Search records..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="border p-2 rounded flex-grow"
//         />
//         <button className="border p-2 rounded flex items-center gap-2">
//           <Filter size={16} />
//           Filter Records...
//         </button>
//         <button className="border p-2 rounded flex items-center gap-2 text-sm bg-white">
//           <Calendar size={16} />
//           2025-02-01 - 2025-03-20
//         </button>
//       </div>

//       {/* User Table */}
//       <div className="overflow-x-auto border rounded-lg shadow-sm">
//         <table className="min-w-full text-sm">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="p-3 text-left">#</th>
//               <th className="p-3 text-left">User ID</th>
//               <th className="p-3 text-left">Image</th>
//               <th className="p-3 text-left">Name</th>
//               <th className="p-3 text-left">Role</th>
//               <th className="p-3 text-left">Status</th>
//               <th className="p-3 text-left">Permissions</th>
//               <th className="p-3 text-left">Date Added</th>
//               <th className="p-3 text-left">Last Login</th>
//               <th className="p-3 text-left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((user, index) => (
//               <tr key={user.id} className="border-t hover:bg-gray-50">
//                 <td className="p-3">{index + 1}</td>
//                 <td className="p-3">{user.id}</td>
//                 <td className="p-3">
//                   <img
//                     src={user.image}
//                     alt={user.name}
//                     className="h-8 w-8 rounded-full object-cover"
//                   />
//                 </td>
//                 <td className="p-3">{user.name}</td>
//                 <td className="p-3">{user.role}</td>
//                 <td className="p-3">{user.status}</td>
//                 <td className="p-3">{user.permissions}</td>
//                 <td className="p-3">{user.dateAdded}</td>
//                 <td className="p-3">{user.lastLogin}</td>
//                 <td className="p-3 flex gap-2">
//                   <Pencil className="w-4 h-4 text-blue-600 cursor-pointer" />
//                   <Trash className="w-4 h-4 text-red-600 cursor-pointer" />
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination Placeholder */}
//       <div className="mt-4 text-center text-sm text-gray-500">
//         ← Previous 1 2 3 ... 67 68 Next →
//       </div>
//     </div>
//   );
// };

// export default UsersContent;