import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export interface Schedule {
  id: number;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date | null;
  // Relations
  faculty?: {
    FacultyID: number;
    EmployeeID: string;
    User: {
      FirstName: string;
      LastName: string;
      Email: string;
    };
  };
  subject?: {
    id: number;
    name: string;
  };
  classSection?: {
    id: number;
    name: string;
  };
}

export interface ScheduleFormData {
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number;
}

interface ScheduleContextType {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  selectedSchedule: Schedule | null;
  
  // Actions
  fetchSchedules: () => Promise<void>;
  fetchScheduleById: (id: number) => Promise<void>;
  fetchSchedulesByFaculty: (facultyId: number) => Promise<void>;
  createSchedule: (data: ScheduleFormData) => Promise<boolean>;
  updateSchedule: (id: number, data: ScheduleFormData) => Promise<boolean>;
  deleteSchedule: (id: number) => Promise<boolean>;
  setSelectedSchedule: (schedule: Schedule | null) => void;
  clearError: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Fetch all schedules
  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schedules');
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      const data = await response.json();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single schedule by ID
  const fetchScheduleById = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedules/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }
      const data = await response.json();
      setSelectedSchedule(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch schedules by faculty
  const fetchSchedulesByFaculty = async (facultyId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedules/faculty/${facultyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch faculty schedules');
      }
      const data = await response.json();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching faculty schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new schedule
  const createSchedule = async (data: ScheduleFormData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to create schedule');
      }

      const newSchedule = await response.json();
      setSchedules((prev) => [...prev, newSchedule]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating schedule:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update schedule
  const updateSchedule = async (id: number, data: ScheduleFormData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to update schedule');
      }

      const updatedSchedule = await response.json();
      setSchedules((prev) =>
        prev.map((schedule) => (schedule.id === id ? updatedSchedule : schedule))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error updating schedule:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete schedule
  const deleteSchedule = async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }

      setSchedules((prev) => prev.filter((schedule) => schedule.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deleting schedule:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: ScheduleContextType = {
    schedules,
    loading,
    error,
    selectedSchedule,
    fetchSchedules,
    fetchScheduleById,
    fetchSchedulesByFaculty,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    setSelectedSchedule,
    clearError,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};
