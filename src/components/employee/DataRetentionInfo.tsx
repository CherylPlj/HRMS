'use client';

import React from 'react';
import { AlertCircle, Calendar, Trash2 } from 'lucide-react';
import { Employee } from './types';

interface DataRetentionInfoProps {
  employee: Employee;
}

/**
 * Calculates data retention period and compliance status
 * Based on Data Privacy Act (Philippines) - minimum 3 years retention required
 */
const DataRetentionInfo: React.FC<DataRetentionInfoProps> = ({ employee }) => {
  // Get resignation/retirement date
  const resignationDate = (employee as any).ResignationDate || 
                          (employee as any).EmploymentDetail?.ResignationDate;
  
  if (!resignationDate) return null;

  const resignDate = new Date(resignationDate);
  const today = new Date();
  const daysSinceResignation = Math.floor((today.getTime() - resignDate.getTime()) / (1000 * 60 * 60 * 24));
  const yearsSinceResignation = daysSinceResignation / 365;
  const daysUntilExpiry = Math.max(0, (3 * 365) - daysSinceResignation);
  const yearsUntilExpiry = daysUntilExpiry / 365;

  // Status based on retention period
  const isExpired = yearsSinceResignation >= 3;
  const isNearExpiry = yearsSinceResignation >= 2.5 && yearsSinceResignation < 3;
  const isCompliant = yearsSinceResignation < 2.5;

  const getStatusColor = () => {
    if (isExpired) return 'text-red-600 bg-red-50 border-red-200';
    if (isNearExpiry) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (isExpired) return <Trash2 className="h-4 w-4" />;
    if (isNearExpiry) return <AlertCircle className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isExpired) return 'Data Retention Expired';
    if (isNearExpiry) return 'Approaching Retention Limit';
    return 'Within Retention Period';
  };

  return (
    <div className={`mt-2 p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-start gap-2">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1">{getStatusText()}</p>
          <div className="text-xs space-y-1">
            <p>
              <strong>Resigned:</strong> {resignDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p>
              <strong>Retention Period:</strong> {yearsSinceResignation.toFixed(1)} years / 3.0 years
            </p>
            {isExpired ? (
              <p className="font-semibold">
                ⚠️ Data should be securely disposed per DPA requirements
              </p>
            ) : (
              <p>
                <strong>Days Remaining:</strong> {Math.ceil(daysUntilExpiry)} days ({yearsUntilExpiry.toFixed(1)} years)
              </p>
            )}
            <p className="text-xs opacity-75 mt-1">
              Per Data Privacy Act (Philippines) & DOLE: Minimum 3-year retention required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRetentionInfo;

