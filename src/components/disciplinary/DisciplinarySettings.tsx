'use client';

import React, { useState, useMemo } from 'react';
import CategoryManagement from './CategoryManagement';
import ViolationTypeManagement from './ViolationTypeManagement';
import SupervisorManagement from './SupervisorManagement';
import { SeverityLevel } from '@/types/disciplinary';

interface DisciplinarySettingsProps {
  categories: string[];
  violationTypes: { id: string; name: string; category: string; defaultSeverity: SeverityLevel }[];
  supervisors: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  records?: any[];
  onCategoriesChange: (categories: string[]) => void;
  onViolationTypesChange: (violationTypes: { id: string; name: string; category: string; defaultSeverity: SeverityLevel }[]) => void;
  onSupervisorsChange: (supervisors: { id: string; name: string }[]) => void;
}

const DisciplinarySettings: React.FC<DisciplinarySettingsProps> = ({
  categories: initialCategories,
  violationTypes: initialViolationTypes,
  supervisors: initialSupervisors,
  employees,
  records = [],
  onCategoriesChange,
  onViolationTypesChange,
  onSupervisorsChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'categories' | 'violations' | 'supervisors'>('categories');
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [violationTypes, setViolationTypes] = useState<{ id: string; name: string; category: string; defaultSeverity: SeverityLevel }[]>(initialViolationTypes);
  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>(initialSupervisors);

  const handleCategoriesChange = (newCategories: string[]) => {
    setCategories(newCategories);
    onCategoriesChange(newCategories);
  };

  const handleViolationTypesChange = (newViolationTypes: { id: string; name: string; category: string; defaultSeverity: SeverityLevel }[]) => {
    setViolationTypes(newViolationTypes);
    onViolationTypesChange(newViolationTypes);
  };

  const handleSupervisorsChange = (newSupervisors: { id: string; name: string }[]) => {
    setSupervisors(newSupervisors);
    onSupervisorsChange(newSupervisors);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeSubTab === 'categories'
              ? 'border-[#800000] text-[#800000]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveSubTab('violations')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeSubTab === 'violations'
              ? 'border-[#800000] text-[#800000]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Violation Types
        </button>
        <button
          onClick={() => setActiveSubTab('supervisors')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            activeSubTab === 'supervisors'
              ? 'border-[#800000] text-[#800000]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Supervisors
        </button>
      </div>

      {/* Tab Content */}
      {activeSubTab === 'categories' && (
        <CategoryManagement
          categories={categories}
          onCategoriesChange={handleCategoriesChange}
          records={records}
        />
      )}

      {activeSubTab === 'violations' && (
        <ViolationTypeManagement
          violationTypes={violationTypes}
          categories={categories}
          onViolationTypesChange={handleViolationTypesChange}
          records={records}
        />
      )}

      {activeSubTab === 'supervisors' && (
        <SupervisorManagement
          supervisors={supervisors}
          employees={employees}
          onSupervisorsChange={handleSupervisorsChange}
          records={records}
        />
      )}
    </div>
  );
};

export default DisciplinarySettings;

