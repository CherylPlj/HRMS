'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

// This component is deprecated - User management is now handled by UserManagementContent in Super Admin
console.warn('UsersContent component is deprecated. Use UserManagementContent instead.');

const UsersContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-6 rounded-lg shadow-sm text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Component Deprecated</h2>
          <p className="mb-4">This user management interface has been moved to the Super Admin dashboard.</p>
          <p className="text-sm">Please access user management through the Super Admin portal.</p>
        </div>
        </div>
    </div>
  );
};

export default UsersContent;