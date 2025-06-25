'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Status: string;
  DateCreated: string;
  LastLogin: string | null;
  isDeleted: boolean;
  UserRole: {
    role: {
      name: string;
    }[];
  }[];
}

export default function UserManagementContent() {
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('User')
        .select(`
          UserID,
          FirstName,
          LastName,
          Email,
          Status,
          DateCreated,
          LastLogin,
          isDeleted,
          UserRole (
            role:Role (
              name
            )
          )
        `)
        .order('DateCreated', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(userItem => {
    const matchesSearch = 
      userItem.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userItem.Email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || userItem.Status === statusFilter;
    
    const userRole = userItem.UserRole?.[0]?.role?.[0]?.name || 'No Role';
    const matchesRole = roleFilter === 'All' || userRole === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole && !userItem.isDeleted;
  });

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      const { error } = await supabase
        .from('User')
        .update({ Status: newStatus, DateModified: new Date().toISOString() })
        .eq('UserID', userId);

      if (error) throw error;
      await fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleSoftDelete = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from('User')
        .update({ 
          isDeleted: true, 
          Status: 'Inactive',
          DateModified: new Date().toISOString() 
        })
        .eq('UserID', userToDelete.UserID);

      if (error) throw error;
      await fetchUsers(); // Refresh the list
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
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
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
        <p className="text-gray-600">Manage all system users and their access permissions.</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#800000]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#800000]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Invited">Invited</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#800000]"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Faculty">Faculty</option>
              <option value="Registrar">Registrar</option>
              <option value="Cashier">Cashier</option>
              <option value="Student">Student</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((userItem) => {
                const userRole = userItem.UserRole?.[0]?.role?.[0]?.name || 'No Role';
                return (
                  <tr key={userItem.UserID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userItem.FirstName} {userItem.LastName}
                        </div>
                        <div className="text-sm text-gray-500">{userItem.Email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userRole === 'Super Admin' ? 'bg-purple-100 text-purple-800' :
                        userRole === 'Admin' ? 'bg-red-100 text-red-800' :
                        userRole === 'Faculty' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {userRole}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userItem.Status === 'Active' ? 'bg-green-100 text-green-800' :
                        userItem.Status === 'Inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {userItem.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.LastLogin 
                        ? new Date(userItem.LastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userItem.DateCreated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleStatusToggle(userItem.UserID, userItem.Status)}
                        className={`px-3 py-1 rounded text-xs ${
                          userItem.Status === 'Active'
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {userItem.Status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      {userItem.UserID !== user?.id && (
                        <button
                          onClick={() => {
                            setUserToDelete(userItem);
                            setShowDeleteModal(true);
                          }}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found matching the current filters.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{userToDelete.FirstName} {userToDelete.LastName}</strong>? 
              This action cannot be undone and will deactivate their account.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSoftDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 