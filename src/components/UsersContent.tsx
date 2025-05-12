'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique file names
import { supabase } from '../lib/supabaseClient'; // Adjust to your actual Supabase client path

interface User {
  UserID: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string | null;
  Role: string;
  Status: string;
  DateCreated: string;
  DateModified: string;
  LastLogin: string | null;
}

interface NewUser {
  FirstName: string;
  LastName: string;
  Email: string;
  Photo?: File | null;
  Role: string;
  Status: string;
}

const UsersContent: React.FC = () => {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    FirstName: '',
    LastName: '',
    Email: '',
    Photo: null,
    Role: '',
    Status: '',
  });
  const [users, setUsers] = useState<User[]>([]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .order('DateCreated', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error.message);
      return;
    }

    setUsers(data ?? []);
  };

  const handleAddUser = async () => {
    let photoUrl = null;

    try {
      // Validate and upload photo if provided
      if (newUser.Photo) {
        const file = newUser.Photo;

        // Validate file type
        if (!file.type.startsWith('image/png') && !file.type.startsWith('image/jpeg')) {
          alert('Only PNG or JPEG files are allowed.');
          return;
        }

        // Validate file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB.');
          return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `user-photos/${fileName}`;

        // Upload photo to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('photos') // Ensure bucket name matches your Supabase configuration
          .upload(filePath, file, {
            cacheControl: '3600', // Cache for 1 hour
            upsert: false, // Prevent overwriting existing files
          });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError.message);
          alert('Failed to upload photo. Please try again.');
          return;
        }

        // Get public URL for the uploaded file
        const { data } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);

        if (!data || !data.publicUrl) {
          console.error('Failed to get public URL for the uploaded photo.');
          alert('Failed to get public URL for the uploaded photo.');
          return;
        }

        photoUrl = data.publicUrl;
      }

      // Insert new user into Supabase
      const { error } = await supabase.from('User').insert({
        FirstName: newUser.FirstName,
        LastName: newUser.LastName,
        Email: newUser.Email,
        Photo: photoUrl,
        Role: newUser.Role,
        Status: newUser.Status,
      });

      if (error) {
        console.error('Error adding user:', error.message);
        alert('Failed to add user. Please try again.');
        return;
      }

      // Reset state and refresh user list
      alert('User added successfully!');
      fetchUsers();
      setAddModalOpen(false);
      setNewUser({
        FirstName: '',
        LastName: '',
        Email: '',
        Photo: null,
        Role: '',
        Status: '',
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred.');
    }
  };

  return (
    <div className="text-black p-4 min-h-screen">
      {/* Add User Button */}
      <div className="flex justify-end mb-4">
        <button
          className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800 flex items-center"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border-2 border-gray-300 p-4 rounded-lg h-[75vh] overflow-auto">
        <table className="table-auto w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">#</th>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.UserID} className="border-t">
                <td className="p-2">{index + 1}</td>
                <td className="p-2">{user.FirstName} {user.LastName}</td>
                <td className="p-2">{user.Email}</td>
                <td className="p-2">{user.Role}</td>
                <td className="p-2">{user.Status}</td>
                <td className="p-2">
                  <button className="bg-blue-500 text-white px-3 py-1 rounded mr-2">Edit</button>
                  <button className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Add User</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  value={newUser.FirstName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, FirstName: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  value={newUser.LastName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, LastName: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  placeholder="Enter email"
                  value={newUser.Email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, Email: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <select
                  value={newUser.Role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, Role: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded w-full"
                >
                  <option value="">Select Role</option>
                  <option value="admin">Admin</option>
                  <option value="faculty">Faculty</option>
                  <option value="registrar">Registrar</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={newUser.Status}
                  onChange={(e) =>
                    setNewUser({ ...newUser, Status: e.target.value })
                  }
                  className="p-2 border border-gray-300 rounded w-full"
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Photo</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewUser({ ...newUser, Photo: file });
                    }
                  }}
                  className="p-2 border border-gray-300 rounded w-full"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleAddUser}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersContent;