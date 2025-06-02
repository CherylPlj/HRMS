import React, { createContext, useContext, useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceSummary } from '../types/attendance';
// ...existing code...

interface AttendanceContextType {
  currentRecord: AttendanceRecord | null;
  setCurrentRecord: (record: AttendanceRecord | null) => void;
  currentTime: string;
  currentDate: string;
  summary: AttendanceSummary;
  setSummary: (summary: AttendanceSummary) => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [summary, setSummary] = useState<AttendanceSummary>({
    present: 0,
    absent: 0,
    late: 0,
    total: 0
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      setCurrentDate(now.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AttendanceContext.Provider value={{ 
      currentRecord, 
      setCurrentRecord, 
      currentTime, 
      currentDate,
      summary,
      setSummary
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
} 