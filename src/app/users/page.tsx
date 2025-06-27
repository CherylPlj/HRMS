'use client';

import { useState, useEffect } from 'react';
import { Plus, List, Users, Download, X, Save, Pencil, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import MigrateUsersButton from '@/components/MigrateUsersButton';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

interface Notification {
  type: 'success' | 'error' | 'warning';
  message: string;
}

export default function UsersPage() {
  const { user: currentUser, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isViewingLogs, setIsViewingLogs] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);

  // Check user authorization
  useEffect(() => {
    const checkUserRole = async () => {
      if (!isLoaded) return;
      
      if (!isSignedIn || !currentUser) {
        router.push('/sign-in');
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from('User')
          .select(`
            UserRole!inner (
              role:Role (
                name
              )
            )
          `)
          .eq('Email', currentUser.emailAddresses[0].emailAddress.toLowerCase().trim())
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setNotification({
            type: 'error',
            message: 'Unable to verify user permissions'
          });
          return;
        }

        const userRole = userData?.UserRole?.[0]?.role;
        const role = Array.isArray(userRole) 
          ? (userRole[0] as any)?.name?.toLowerCase()
          : (userRole as any)?.name?.toLowerCase();
        setUserRole(role || '');
        
        if (role !== 'super admin') {
          setIsAuthorized(false);
          setNotification({
            type: 'error',
            message: 'Access denied. This page is restricted to Super Administrators only.'
          });
          // Redirect based on user role
          setTimeout(() => {
            if (role === 'admin') {
              router.push('/dashboard/admin');
            } else if (role === 'faculty') {
              router.push('/dashboard/faculty');
            } else {
              router.push('/dashboard');
            }
          }, 3000);
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        setNotification({
          type: 'error',
          message: 'Unable to verify user permissions'
        });
      }
    };

    checkUserRole();
  }, [isLoaded, isSignedIn, currentUser, router]);

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

      const transformedUsers: User[] = usersData.map((rawUser) => {
        const facultyObj = Array.isArray(rawUser.Faculty) ? rawUser.Faculty[0] : rawUser.Faculty;
        const role = Array.isArray(rawUser.UserRole?.[0]?.role)
          ? (rawUser.UserRole?.[0]?.role[0] as { name: string } | undefined)?.name || ''
          : (rawUser.UserRole?.[0]?.role as { name: string } | undefined)?.name || '';

        return {
          UserID: rawUser.UserID,
          FirstName: rawUser.FirstName,
          LastName: rawUser.LastName,
          Email: rawUser.Email,
          Photo: rawUser.Photo || '',
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

  useEffect(() => {
    fetchUsers();
  }, []);

  // Show loading or unauthorized access
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow-sm text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="mb-4">This page is restricted to Super Administrators only.</p>
            <p className="text-sm">You will be redirected to your dashboard shortly...</p>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => setIsViewingLogs(!isViewingLogs)}
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
          {!isViewingLogs && (
            <>
              <MigrateUsersButton />
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add User
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rest of your component */}
    </div>
  );
} 