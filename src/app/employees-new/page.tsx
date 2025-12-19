'use client';

import React, { Suspense } from 'react';
import EmployeeContentNew from '@/components/EmployeeContentNew';

function EmployeeContentFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading employee management...</p>
      </div>
    </div>
  );
}

const EmployeesNewPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<EmployeeContentFallback />}>
        <EmployeeContentNew />
      </Suspense>
    </div>
  );
};

export default EmployeesNewPage; 