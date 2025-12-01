'use client';

import React from 'react';
import { DisciplinaryStatus } from '@/types/disciplinary';

interface StatusTagProps {
  status: DisciplinaryStatus;
  className?: string;
}

const StatusTag: React.FC<StatusTagProps> = ({ status, className = '' }) => {
  const getStatusStyles = (status: DisciplinaryStatus) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'For_Review':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)} ${className}`}
    >
      {status}
    </span>
  );
};

export default StatusTag;

