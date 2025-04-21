'use client';

import { useState } from 'react';
import { Calendar, Filter, Pencil, Trash } from 'lucide-react';
import React from 'react';

const UsersContent: React.FC = () => {
  const [search, setSearch] = useState('');

  const users = [
    {
      id: 'Admin1',
      name: 'Jane Smith',
      role: 'Admin',
      status: 'Active',
      permissions: 'ALL',
      dateAdded: 'March 20, 2025 11:00:09 AM',
      lastLogin: 'March 20, 2025 11:05:10 AM',
      image: '/avatars/avatar1.png',
    },
    {
      id: '2025-0001-SJSFI',
      name: 'Maria Reyes',
      role: 'Faculty',
      status: 'Active',
      permissions: 'View and Edit Own Data',
      dateAdded: 'March 20, 2025 11:00:59 AM',
      lastLogin: 'March 20, 2025 11:15:10 AM',
      image: '/avatars/avatar2.png',
    },
    {
      id: '2025-0002-SJSFI',
      name: 'Joseph Fajardo',
      role: 'Faculty',
      status: 'Active',
      permissions: 'View and Edit Own Data',
      dateAdded: 'March 20, 2025 11:01:45 AM',
      lastLogin: 'March 20, 2025 11:15:30 AM',
      image: '/avatars/avatar3.png',
    },
    {
      id: '2025-0003-SJSFI',
      name: 'Megan Lee',
      role: 'Faculty',
      status: 'Active',
      permissions: 'View and Edit Own Data',
      dateAdded: 'March 20, 2025 11:02:39 AM',
      lastLogin: 'March 20, 2025 11:15:40 AM',
      image: '/avatars/avatar4.png',
    },
    {
      id: '2025-0004-SJSFI',
      name: 'Danny Rubles',
      role: 'Faculty',
      status: 'Active',
      permissions: 'View and Edit Own Data',
      dateAdded: 'March 20, 2025 11:03:40 AM',
      lastLogin: 'March 20, 2025 11:25:10 AM',
      image: '/avatars/avatar5.png',
    },
  ];

  const filtered = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 mb-4">
        <button className="bg-red-700 text-white px-4 py-2 rounded hover:opacity-90">
          View Activity Logs
        </button>
        <button className="bg-red-700 text-white px-4 py-2 rounded hover:opacity-90">
          + Add User
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-grow"
        />
        <button className="border p-2 rounded flex items-center gap-2">
          <Filter size={16} />
          Filter Records...
        </button>
        <button className="border p-2 rounded flex items-center gap-2 text-sm bg-white">
          <Calendar size={16} />
          2025-02-01 - 2025-03-20
        </button>
      </div>

      {/* User Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">User ID</th>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Permissions</th>
              <th className="p-3 text-left">Date Added</th>
              <th className="p-3 text-left">Last Login</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, index) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{user.id}</td>
                <td className="p-3">
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                </td>
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">{user.status}</td>
                <td className="p-3">{user.permissions}</td>
                <td className="p-3">{user.dateAdded}</td>
                <td className="p-3">{user.lastLogin}</td>
                <td className="p-3 flex gap-2">
                  <Pencil className="w-4 h-4 text-blue-600 cursor-pointer" />
                  <Trash className="w-4 h-4 text-red-600 cursor-pointer" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Placeholder */}
      <div className="mt-4 text-center text-sm text-gray-500">
        ← Previous 1 2 3 ... 67 68 Next →
      </div>
    </div>
  );
};

export default UsersContent;