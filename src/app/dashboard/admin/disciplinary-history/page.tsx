"use client";

import DisciplinaryHistoryContent from '@/components/disciplinary/DisciplinaryHistoryContent';
import { useState, useEffect } from 'react';

export default function DisciplinaryHistoryPage() {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [supervisors, setSupervisors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch employees and supervisors
    const fetchData = async () => {
      try {
        // Mock employees data
        const mockEmployees = [
          { id: 'EMP001', name: 'John Doe' },
          { id: 'EMP002', name: 'Alice Johnson' },
          { id: 'EMP003', name: 'Michael Chen' },
          { id: 'EMP004', name: 'Emily Davis' },
        ];

        // Mock supervisors data
        const mockSupervisors = [
          { id: 'SUP001', name: 'Jane Smith' },
          { id: 'SUP002', name: 'Robert Brown' },
          { id: 'SUP003', name: 'Sarah Williams' },
        ];

        setEmployees(mockEmployees);
        setSupervisors(mockSupervisors);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return <DisciplinaryHistoryContent employees={employees} supervisors={supervisors} />;
}

