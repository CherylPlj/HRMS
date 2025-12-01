'use client';

import React from 'react';
import { SeverityLevel } from '@/types/disciplinary';

interface SeverityTagProps {
  severity: SeverityLevel;
  className?: string;
}

const SeverityTag: React.FC<SeverityTagProps> = ({ severity, className = '' }) => {
  const getSeverityStyles = (level: SeverityLevel) => {
    switch (level) {
      case 'Minor':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Moderate':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Major':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityStyles(severity)} ${className}`}
    >
      {severity}
    </span>
  );
};

export default SeverityTag;

