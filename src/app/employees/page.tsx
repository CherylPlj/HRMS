"use client";

import EmployeeContentNew from '@/components/EmployeeContentNew';

export default function EmployeesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Employee Management</h1>
      <EmployeeContentNew />
    </div>
  );
} 