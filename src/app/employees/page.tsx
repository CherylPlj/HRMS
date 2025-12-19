"use client";

import { Suspense } from 'react';
import EmployeeContentNew from '@/components/EmployeeContentNew';

function EmployeeContentFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Employee Management</h1>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee management...</p>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Employee Management</h1>
      <Suspense fallback={<EmployeeContentFallback />}>
        <EmployeeContentNew />
      </Suspense>
    </div>
  );
} 