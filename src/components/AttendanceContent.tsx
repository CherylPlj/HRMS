import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, Edit2, Trash2, Calendar, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/nextjs';
import { format, isAfter, isBefore, subDays, startOfMonth, endOfMonth } from 'date-fns';
import ScheduleGridView from './ScheduleGridView';

// Types
interface AttendanceRecord {
  facultyId: string;
  name: string;
  date: string;
  in: string;
  out: string;
  status: string;
  color: string;
  icon: string;
  img: string;
  userId: string;
}

interface AttendanceData {
  id: number;
  facultyId: number;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  Faculty: {
    User: {
      FirstName: string;
      LastName: string;
      Photo: string | null;
      UserID: string;
    };
  };
}

// Dummy for Schedule, replace with your actual type/model
interface ScheduleRecord {
  id: string;
  facultyId: number;
  subjectId: number;
  classSectionId: number;
  day: string;
  time: string;
  duration: number; // in minutes
  subject?: { name: string };
  classSection?: { name: string };
}

// Legacy interface for backward compatibility
interface LegacyScheduleRecord {
  id: string;
  facultyId: number;
  subject: string;
  classSection: string;
  day: string;
  time: string;
  duration: number;
}

interface AttendanceEdit {
  timeIn?: string;
  timeOut?: string;
  status?: string;
  remarks?: string;
}

const fetchUserProfilePhoto = async (userId: string): Promise<string> => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    const data = await response.json();
    return data.imageUrl || '/manprofileavatar.png';
  } catch (error) {
    console.error('Error fetching user profile photo:', error);
    return '/manprofileavatar.png';
  }
};

const formatTime = (timeString: string | null): string => {
  if (!timeString) return '-';
  
  try {
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

const fetchAllFacultyAttendance = async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
  try {
    let query = supabase
      .from("Attendance")
      .select(`
        id,
        facultyId,
        date,
        timeIn,
        timeOut,
        status,
        Faculty (
          User (
            FirstName,
            LastName,
            Photo,
            UserID
          )
        )
      `);

    if (startDate && endDate) {
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching attendance:", error);
      return [];
    }

    // Fetch profile photos for all users
    const attendanceRecords = await Promise.all((data as unknown as AttendanceData[]).map(async (record) => {
      const profilePhoto = await fetchUserProfilePhoto(record.Faculty.User.UserID);
      
      // Format the time strings
      const timeIn = record.timeIn ? formatTime(record.timeIn) : '-';
      const timeOut = record.timeOut ? formatTime(record.timeOut) : '-';
      
      console.log('Time In:', record.timeIn, 'Formatted:', timeIn); // Debug log
      console.log('Time Out:', record.timeOut, 'Formatted:', timeOut); // Debug log
      
      return {
        facultyId: record.facultyId.toString(),
        name: `${record.Faculty.User.FirstName} ${record.Faculty.User.LastName}`,
        date: new Date(record.date).toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        in: timeIn,
        out: timeOut,
        status: record.status,
        color: record.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 
               record.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 
               'bg-yellow-100 text-yellow-800',
        icon: record.status === 'PRESENT' ? 'fa-check' : 
              record.status === 'ABSENT' ? 'fa-times' : 
              'fa-clock',
        img: profilePhoto,
        userId: record.Faculty.User.UserID
      };
    }));

    return attendanceRecords;
  } catch (error) {
    console.error("Error in fetchAllFacultyAttendance:", error);
    return [];
  }
};

// For DTR download
const downloadDTR = async (facultyId: string, name: string, startDate: string, endDate: string) => {
  // You need to implement this endpoint!
  const url = `/api/dtr/download?facultyId=${encodeURIComponent(facultyId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const response = await fetch(url);
  if (!response.ok) {
    alert("Failed to download DTR.");
    return;
  }
  // Assume backend returns PDF
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${name}_DTR_${startDate}_to_${endDate}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// Remove initialSchedules, data will be loaded from Supabase
// const initialSchedules: ScheduleRecord[] = [ ... ];

// Add this new component before the AttendanceContent component
interface ScheduleModalProps {
  isEdit: boolean;
  editSchedule: ScheduleRecord | null;
  onClose: () => void;
  onSave: (schedule: Omit<ScheduleRecord, 'id'>) => void;
  facultyList: any[]; // Pass faculty list for dropdown
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isEdit, editSchedule, onClose, onSave, facultyList }) => {
  const [form, setForm] = useState(
    isEdit && editSchedule
      ? { ...editSchedule }
      : {
          facultyId: facultyList[0]?.FacultyID || 0,
          subjectId: 0,
          classSectionId: 0,
          day: "Monday",
          time: "07:00",
          duration: 60,
        }
  );

  const [subjects, setSubjects] = useState<any[]>([]);
  const [classSections, setClassSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch subjects and class sections
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsRes, classSectionsRes] = await Promise.all([
          fetch('/api/subjects'),
          fetch('/api/class-sections')
        ]);

        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          setSubjects(subjectsData);
        }

        if (classSectionsRes.ok) {
          const classSectionsData = await classSectionsRes.json();
          setClassSections(classSectionsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: ['facultyId', 'subjectId', 'classSectionId', 'duration'].includes(name) 
        ? parseInt(value) 
        : value 
    }));
  };

  const handleSave = () => {
    onSave(form);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 relative">
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-[#800000]" />
            <span className="ml-2">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#800000]">{isEdit ? 'Edit Schedule' : 'Add Schedule'}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
          >
            &times;
          </button>
        </div>
        <div className="space-y-6">
          <div className="flex space-x-4">
            <div className="flex-1 pb-6">
              <label htmlFor="facultyId" className="block mb-1 font-semibold">Faculty</label>
              <select
                id="facultyId" name="facultyId"
                className="w-full border border-gray-300 rounded p-2"
                value={form.facultyId} onChange={handleChange}
                disabled={isEdit} // Prevent changing faculty when editing
              >
                <option value="">Select Faculty</option>
                {facultyList.map(f => (
                  <option key={f.FacultyID} value={f.FacultyID}>
                    {f.User.FirstName} {f.User.LastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 pb-6">
              <label htmlFor="classSectionId" className="block mb-1 font-semibold">Class and Section</label>
              <select
                id="classSectionId" name="classSectionId"
                className="w-full border border-gray-300 rounded p-2"
                value={form.classSectionId} onChange={handleChange}
              >
                <option value="">Select Class Section</option>
                {classSections.map(cs => (
                  <option key={cs.id} value={cs.id}>
                    {cs.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 pb-6">
              <label htmlFor="subjectId" className="block mb-1 font-semibold">Subject</label>
              <select
                id="subjectId" name="subjectId"
                className="w-full border border-gray-300 rounded p-2"
                value={form.subjectId} onChange={handleChange}
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="flex-1 pb-6">
              <label htmlFor="day" className="block mb-1 font-semibold">Day</label>
              <select
                id="day" name="day"
                className="w-full border border-gray-300 rounded p-2"
                value={form.day} onChange={handleChange}
              >
                <option value="">Select Day</option>
                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 pb-6">
              <label htmlFor="time" className="block mb-1 font-semibold">Time</label>
              <input
                id="time" name="time" type="time"
                className="w-full border border-gray-300 rounded p-2"
                value={form.time} onChange={handleChange}
              />
            </div>
            <div className="flex-1 pb-6">
              <label htmlFor="duration" className="block mb-1 font-semibold">Duration (mins)</label>
              <input
                id="duration" name="duration" type="number"
                step="15"
                className="w-full border border-gray-300 rounded p-2"
                value={form.duration} 
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            className="bg-[#800000] hover:bg-red-800 text-white px-6 py-2 rounded"
          >
            {isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add this new component before the AttendanceContent component
interface DeleteModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
    <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
      <h2 className="text-2xl font-bold mb-4 text-[#800000]">Confirm Delete</h2>
      <p className="mb-6 text-gray-700">Are you sure you want to delete this schedule?</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onConfirm}
          className="bg-red-600 hover:bg-[#800000] text-white px-4 py-2 rounded"
        >
          Yes, Delete
        </button>
        <button
          onClick={onClose}
          className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const AttendanceContent: React.FC = () => {
  const { user } = useUser();
  // Tab state
  const [activeTab, setActiveTab] = useState<'attendance' | 'schedule'>('attendance');

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<{start: string; end: string}>({
    start: "",
    end: ""
  });

  // Schedule state
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduleRecord | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);

  // New states for Record Attendance
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceEdits, setAttendanceEdits] = useState<Record<string, any>>({});
  const attendanceDateRef = useRef<HTMLInputElement>(null);
  const [attendanceSaveStatus, setAttendanceSaveStatus] = useState<Record<number, 'idle' | 'saving' | 'saved'>>({});

  // New states for expanded faculty
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [facultyAttendanceMap, setFacultyAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});

  // New states for faculty loading
  const [facultyLoading, setFacultyLoading] = useState(true);

  // New states for profile photos
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});

  // New states for faculty history loading
  const [facultyHistoryLoading, setFacultyHistoryLoading] = useState<Record<string, boolean>>({});

  // New states for attendance errors
  const [attendanceErrors, setAttendanceErrors] = useState<Record<number, string>>({});

  // Load attendance from backend
  const loadAttendanceData = () => {
    if (activeTab === 'attendance') {
      // If no date range, default to current month
      if (!dateFilter.start && !dateFilter.end) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        fetchAllFacultyAttendance(
          format(start, 'yyyy-MM-dd'),
          format(end, 'yyyy-MM-dd')
        ).then(setAttendance);
      } else {
        fetchAllFacultyAttendance(dateFilter.start, dateFilter.end).then(setAttendance);
      }
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [activeTab, dateFilter]);

  // Load schedules from API
  useEffect(() => {
    if (activeTab === 'schedule') {
      const fetchSchedules = async () => {
        try {
          const response = await fetch('/api/schedules');
          if (response.ok) {
            const data = await response.json();
            setSchedules(data);
          } else {
            console.error('Failed to fetch schedules');
          }
        } catch (error) {
          console.error('Error fetching schedules:', error);
        }
      };
      fetchSchedules();
    }
  }, [activeTab]);

  // Fetch faculty list
  useEffect(() => {
    setFacultyLoading(true);
    fetch('/api/faculty', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Important for Clerk authentication
    })
      .then(async res => {
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to fetch faculty list');
        }
        return res.json();
      })
      .then(data => setFacultyList(Array.isArray(data) ? data : []))
      .catch(error => {
        console.error('Error fetching faculty:', error);
        setFacultyList([]);
      })
      .finally(() => setFacultyLoading(false));
  }, []);

  // Fetch attendance records for selected date
  useEffect(() => {
    if (isAttendanceModalOpen && attendanceDate) {
      setAttendanceLoading(true);
      fetch(`/api/attendance/history?date=${attendanceDate}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for Clerk authentication
      })
        .then(async res => {
          if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to fetch attendance records');
          }
          return res.json();
        })
        .then(data => setAttendanceRecords(Array.isArray(data) ? data : []))
        .catch(error => {
          console.error('Error fetching attendance records:', error);
          setAttendanceRecords([]);
        })
        .finally(() => setAttendanceLoading(false));
    }
  }, [isAttendanceModalOpen, attendanceDate]);

  // After fetching facultyList, fetch profile photos
  useEffect(() => {
    if (facultyList.length > 0) {
      const fetchPhotos = async () => {
        const photoPromises = facultyList.map(async (faculty) => {
          const userId = faculty.User?.UserID;
          if (userId) {
            try {
              const url = await fetchUserProfilePhoto(userId);
              return [faculty.FacultyID, url];
            } catch {
              return [faculty.FacultyID, '/manprofileavatar.png'];
            }
          }
          return [faculty.FacultyID, '/manprofileavatar.png'];
        });
        const results = await Promise.all(photoPromises);
        setProfilePhotos(Object.fromEntries(results));
      };
      fetchPhotos();
    }
  }, [facultyList]);

  // Attendance filter
  const filteredAttendance = attendance.filter((record) => {
    const search = searchQuery.toLowerCase();
    return (
      record.name.toLowerCase().includes(search) ||
      record.status.toLowerCase().includes(search)
    );
  });

  // Schedule filter
  const filteredSchedules = schedules.filter(s => {
    const faculty = facultyList.find(f => f.facultyId === s.facultyId);
    const facultyName = faculty ? `${faculty.User.FirstName} ${faculty.User.LastName}` : '';
    const search = scheduleSearch.toLowerCase();

    return (
      facultyName.toLowerCase().includes(search) ||
      (s.subject?.name || '').toLowerCase().includes(search) ||
      (s.classSection?.name || '').toLowerCase().includes(search) ||
      s.day.toLowerCase().includes(search)
    );
  });

  // Schedule modal helpers
  const handleOpenModal = () => { setEditSchedule(null); setIsModalOpen(true);}
  const handleCloseModal = () => setIsModalOpen(false);
  const handleOpenEditModal = (sched: ScheduleRecord) => { setEditSchedule(sched); setIsEditModalOpen(true);}
  const handleCloseEditModal = () => setIsEditModalOpen(false);
  const handleOpenDeleteModal = (schedId: string) => { setDeleteScheduleId(schedId); setIsDeleteModalOpen(true);}
  const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);

  const handleAddNewSchedule = (day: string, time: string) => {
    setEditSchedule(null); // Important: signify that this is a new schedule
    setIsModalOpen(true); // Open the generic modal
    // Note: You might want to pre-fill the modal state here if the modal supports it
  };

  // Handle schedule save (add or edit)
  const handleScheduleSave = async (sched: Omit<ScheduleRecord, 'id'> & { id?: string }) => {
    // Validation
    if (!sched.time || !sched.duration || !sched.facultyId || !sched.day) {
      alert('Please fill all required fields: Faculty, Day, Time, and Duration.');
      return;
    }

    const [startHours, startMinutes] = sched.time.split(':').map(Number);
    
    // Using a fixed date for comparison purposes
    const scheduleStart = new Date(2024, 1, 1, startHours, startMinutes);
    const scheduleEnd = new Date(scheduleStart.getTime() + (sched.duration || 0) * 60000);

    const classStart = new Date(2024, 1, 1, 7, 0); // 7:00 AM
    const classEnd = new Date(2024, 1, 1, 15, 30); // 3:30 PM
    const lunchStart = new Date(2024, 1, 1, 12, 0); // 12:00 PM
    const lunchEnd = new Date(2024, 1, 1, 12, 30); // 12:30 PM

    if (scheduleStart < classStart || scheduleEnd > classEnd) {
      alert('Schedule must be between 7:00 AM and 3:30 PM.');
      return;
    }

    if (scheduleStart < lunchEnd && scheduleEnd > lunchStart) {
      alert('Schedule conflicts with the 12:00 PM - 12:30 PM lunch break.');
      return;
    }

    // Check for conflicts with other schedules
    const conflictingSchedule = schedules.find(s => {
      // Don't compare with itself during an edit
      if (editSchedule && s.id === sched.id) return false;

      if (s.facultyId === sched.facultyId && s.day === sched.day) {
        const [existingStartHours, existingStartMinutes] = s.time.split(':').map(Number);
        const existingStart = new Date(2024, 1, 1, existingStartHours, existingStartMinutes);
        const existingEnd = new Date(existingStart.getTime() + (s.duration || 0) * 60000);
        
        // Check for overlap
        return scheduleStart < existingEnd && scheduleEnd > existingStart;
      }
      return false;
    });

    if (conflictingSchedule) {
      const faculty = facultyList.find(f => f.facultyId === sched.facultyId);
      const facultyName = faculty ? `${faculty.User.FirstName} ${faculty.User.LastName}` : 'the selected faculty';
      alert(`This schedule conflicts with an existing schedule for ${facultyName} on ${sched.day}.`);
      return;
    }

    if (editSchedule) {
      // Edit
      try {
        const response = await fetch(`/api/schedules/${sched.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: sched.subjectId,
            classSectionId: sched.classSectionId,
            day: sched.day,
            time: sched.time,
            duration: sched.duration,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setSchedules(prev => prev.map(s => (s.id === data.id ? data : s)));
        } else {
          console.error('Failed to update schedule');
        }
      } catch (error) {
        console.error('Error updating schedule:', error);
      }
      setIsEditModalOpen(false);
    } else {      
      // Add
      try {
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facultyId: sched.facultyId,
            subjectId: sched.subjectId,
            classSectionId: sched.classSectionId,
            day: sched.day,
            time: sched.time,
            duration: sched.duration,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setSchedules(prev => [data, ...prev]);
        } else {
          console.error('Failed to create schedule');
        }
      } catch (error) {
        console.error('Error creating schedule:', error);
      }
      setIsModalOpen(false);
    }
  };

 // Handle schedule delete
  const handleConfirmDelete = async () => {
    if (deleteScheduleId) {
      try {
        const response = await fetch(`/api/schedules/${deleteScheduleId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setSchedules(prev => prev.filter(s => s.id !== deleteScheduleId));
        } else {
          console.error('Failed to delete schedule');
        }
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
    setIsDeleteModalOpen(false);
  };

  // Date filter UI
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  };

  // Merge faculty list and attendance records
  const mergedAttendance = facultyList.map(faculty => {
    const record = attendanceRecords.find((r: any) => Number(r.facultyId) === faculty.FacultyID);
    const edit = attendanceEdits[faculty.FacultyID] || {};
    return {
      facultyId: faculty.FacultyID,
      name: `${faculty.User?.FirstName || ''} ${faculty.User?.LastName || ''}`.trim(),
      photo: faculty.User?.Photo && faculty.User.Photo.trim() !== '' ? faculty.User.Photo : '/manprofileavatar.png',
      timeIn: edit.timeIn ?? record?.timeIn ?? '',
      timeOut: edit.timeOut ?? record?.timeOut ?? '',
      status: edit.status ?? record?.status ?? 'NOT_RECORDED',
      remarks: edit.remarks ?? record?.remarks ?? '',
      recordId: record?.id,
    };
  });

  const handleAttendanceEdit = (facultyId: number, field: string, value: string) => {
    setAttendanceEdits(prev => ({
      ...prev,
      [facultyId]: {
        ...prev[facultyId],
        [field]: value,
      },
    }));
  };

  const handleAttendanceStatusAuto = (facultyId: number, timeIn: string) => {
    if (!timeIn) return;
    const [h, m] = timeIn.split(':').map(Number);
    if (h > 7 || (h === 7 && m >= 15)) {
      handleAttendanceEdit(facultyId, 'status', 'LATE');
    } else {
      handleAttendanceEdit(facultyId, 'status', 'PRESENT');
    }
  };

  function getAttendanceFieldErrors(edit: AttendanceEdit) {
    const errors: { timeIn?: string; timeOut?: string; remarks?: string } = {};
    if ((edit.status === 'PRESENT' || edit.status === 'LATE') && !edit.timeIn) {
      errors.timeIn = 'Time in is required for present or late status.';
    }
    if (edit.status === 'ABSENT' && (edit.timeIn || edit.timeOut)) {
      errors.timeIn = 'Absent status should not have time in or time out.';
      errors.timeOut = 'Absent status should not have time in or time out.';
    }
    if (edit.timeIn && edit.timeOut && edit.timeIn >= edit.timeOut) {
      errors.timeIn = 'Time in must be earlier than time out.';
      errors.timeOut = 'Time out must be after time in.';
    }
    if (edit.timeOut && !edit.timeIn) {
      errors.timeOut = 'Cannot record time out without a time in.';
    }
    if (edit.timeIn) {
      const [h] = edit.timeIn.split(':').map(Number);
      if (h < 6) errors.timeIn = 'Time in cannot be earlier than 06:00.';
    }
    if (edit.timeOut) {
      const [h, m] = edit.timeOut.split(':').map(Number);
      if (h > 18 || (h === 18 && m > 0)) errors.timeOut = 'Time out cannot be later than 18:00.';
    }
    if (edit.remarks && (!/^[a-zA-Z0-9 .,!?'-]*$/.test(edit.remarks) || /(.)\1{3,}/.test(edit.remarks) || edit.remarks.length > 100)) {
      errors.remarks = 'Invalid remarks.';
    }
    return errors;
  }

  const handleAttendanceSave = async (facultyId: number) => {
    const edit = attendanceEdits[facultyId];
    if (!edit) return;

    // Check if there are actual changes
    if (!hasChanges(facultyId)) {
      return;
    }

    // Validate that the date is not in the future
    const selectedDate = new Date(attendanceDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
    
    if (selectedDate > today) {
      setAttendanceErrors(prev => ({ ...prev, [facultyId]: 'Cannot set attendance for future dates.' }));
      return;
    }

    // Validate before sending
    const fieldErrors = getAttendanceFieldErrors(edit);
    if (Object.values(fieldErrors).some(Boolean)) {
      setAttendanceErrors(prev => ({ ...prev, [facultyId]: Object.values(fieldErrors).join('\n') }));
      return;
    } else {
      setAttendanceErrors(prev => ({ ...prev, [facultyId]: '' }));
    }

    setAttendanceSaveStatus(prev => ({ ...prev, [facultyId]: 'saving' }));
    
    // Add timeout protection to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setAttendanceSaveStatus(prev => ({ ...prev, [facultyId]: 'idle' }));
      setAttendanceErrors(prev => ({ ...prev, [facultyId]: 'Request timed out. Please try again.' }));
    }, 30000); // 30 second timeout

    try {
      const response = await fetch('/api/attendance/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          facultyId: Number(facultyId),
          date: attendanceDate,
          timeIn: edit.timeIn,
          timeOut: edit.timeOut,
          status: edit.status,
          remarks: edit.remarks || '',
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save attendance record: ${response.status} ${response.statusText}`);
      }

      setAttendanceSaveStatus(prev => ({ ...prev, [facultyId]: 'saved' }));
      
      // Reload attendance data after successful save
      loadAttendanceData();
      
      // Also reload attendance records for the modal if it's open
      if (isAttendanceModalOpen && attendanceDate) {
        setAttendanceLoading(true);
        fetch(`/api/attendance/history?date=${attendanceDate}`, {
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
          .then(async res => {
            if (!res.ok) {
              const error = await res.json().catch(() => ({}));
              throw new Error(error.error || 'Failed to fetch attendance records');
            }
            return res.json();
          })
          .then(data => setAttendanceRecords(Array.isArray(data) ? data : []))
          .catch(error => {
            console.error('Error fetching attendance records:', error);
            setAttendanceRecords([]);
          })
          .finally(() => setAttendanceLoading(false));
      }

      setTimeout(() => {
        setAttendanceSaveStatus(prev => ({ ...prev, [facultyId]: 'idle' }));
      }, 1500);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('Error saving attendance:', e);
      setAttendanceSaveStatus(prev => ({ ...prev, [facultyId]: 'idle' }));
      setAttendanceErrors(prev => ({ ...prev, [facultyId]: e instanceof Error ? e.message : 'Failed to save. Please try again.' }));
    }
  };

  const minDate = format(subDays(startOfMonth(new Date()), 15), 'yyyy-MM-dd');
  const maxDate = format(new Date(), 'yyyy-MM-dd');

  // Build a map of most recent attendance record per facultyId (regardless of date range)
  const mostRecentAttendance: Record<string, AttendanceRecord | undefined> = {};
  attendance.forEach(record => {
    if (!mostRecentAttendance[record.facultyId] || new Date(record.date) > new Date(mostRecentAttendance[record.facultyId]!.date)) {
      mostRecentAttendance[record.facultyId] = record;
    }
  });

  // Fetch attendance history for a faculty (filtered by date range if selected)
  const fetchFacultyAttendanceHistory = async (facultyId: string) => {
    setFacultyHistoryLoading(prev => ({ ...prev, [facultyId]: true }));
    try {
      let url = `/api/attendance/history?facultyId=${facultyId}`;
      if (dateFilter.start && dateFilter.end) {
        url += `&startDate=${dateFilter.start}&endDate=${dateFilter.end}`;
      } else {
        // Default to current month
        const now = new Date();
        const start = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        const end = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
        url += `&startDate=${start}&endDate=${end}`;
      }
      console.log('Fetching attendance history:', url); // Debug log
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for Clerk authentication
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Error fetching attendance history:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        });
        throw new Error(`Failed to fetch attendance history: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      console.log('Received attendance history:', data); // Debug log
      setFacultyAttendanceMap(prev => ({ ...prev, [facultyId]: data || [] }));
    } catch (error) {
      console.error('Error in fetchFacultyAttendanceHistory:', error);
      // Set empty array on error to prevent undefined errors in the UI
      setFacultyAttendanceMap(prev => ({ ...prev, [facultyId]: [] }));
    } finally {
      setFacultyHistoryLoading(prev => ({ ...prev, [facultyId]: false }));
    }
  };

  const handleExpandFaculty = (facultyId: string) => {
    if (expandedFaculty === facultyId) {
      setExpandedFaculty(null);
    } else {
      setExpandedFaculty(facultyId);
      if (!facultyAttendanceMap[facultyId]) {
        fetchFacultyAttendanceHistory(facultyId);
      }
    }
  };

  // When opening the attendance modal, prefill attendanceEdits with current records for the selected date
  useEffect(() => {
    if (isAttendanceModalOpen) {
      const newEdits: Record<string, any> = {};
      facultyList.forEach(faculty => {
        const record = attendanceRecords.find((r: any) => Number(r.facultyId) === faculty.FacultyID);
        if (record) {
          newEdits[faculty.FacultyID] = {
            timeIn: record.timeIn || '',
            timeOut: record.timeOut || '',
            status: record.status || 'NOT_RECORDED',
            remarks: record.remarks || '',
          };
        } else {
          // Initialize empty edit for faculty with no record
          newEdits[faculty.FacultyID] = {
            timeIn: '',
            timeOut: '',
            status: 'NOT_RECORDED',
            remarks: '',
          };
        }
      });
      setAttendanceEdits(newEdits);
      // Clear any existing errors when date changes
      setAttendanceErrors({});
    }
    // If modal is closed, clear edits
    if (!isAttendanceModalOpen) {
      setAttendanceEdits({});
      setAttendanceSaveStatus({});
      setAttendanceErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAttendanceModalOpen, attendanceRecords, facultyList, attendanceDate]);

  // Add a helper to get validation error for a row
  const getRowValidationError = (row: any) => {
    const edit = attendanceEdits[row.facultyId] || {};
    return getAttendanceFieldErrors(edit);
  };

  // Helper function to check if there are actual changes made
  const hasChanges = (facultyId: number) => {
    const edit = attendanceEdits[facultyId];
    if (!edit) return false;
    
    const record = attendanceRecords.find((r: any) => Number(r.facultyId) === facultyId);
    
    // If no record exists, check if any field has been filled
    if (!record) {
      return edit.timeIn || edit.timeOut || edit.status !== 'NOT_RECORDED' || edit.remarks;
    }
    
    // Compare with existing record
    return (
      edit.timeIn !== (record.timeIn || '') ||
      edit.timeOut !== (record.timeOut || '') ||
      edit.status !== (record.status || 'NOT_RECORDED') ||
      edit.remarks !== (record.remarks || '')
    );
  };

  const getEndTime = (startTime: string, duration: number): string => {
    if (!startTime || duration === undefined) return '-';
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      return endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '-';
    }
  };

  return (
    <div className="text-black p-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-6">
        
          <button
            onClick={() => setActiveTab('attendance')}
            className={`relative px-4 py-2 text-lg font-medium transition-all duration-200 ${
              activeTab === 'attendance'
                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Attendance Records
          </button>
          
          <button
            onClick={() => setActiveTab('schedule')}
            className={`relative px-4 py-2 text-lg font-medium transition-all duration-200 ${
              activeTab === 'schedule'
                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedule Assignment
          </button>
        </div>
        {activeTab === 'attendance' && (
          <>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download size={18} />
              Download
            </button>
            <button
              onClick={() => setIsAttendanceModalOpen(true)}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              Record Attendance
            </button>
          </div>
          </>
        )}
        {activeTab === 'schedule' && (
          <>
          <button
            onClick={handleOpenModal}
            className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            Add Schedule
          </button>
          </>
        )}
</div>
      {activeTab === 'attendance' && (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or status..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all duration-200"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <input
                  title="Start Date"
                  type="date"
                  className="border border-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all duration-200"
                  value={dateFilter.start}
                  onChange={e => handleDateChange('start', e.target.value)}
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <input
                  title="End Date"
                  type="date"
                  className="border border-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all duration-200"
                  value={dateFilter.end}
                  onChange={e => handleDateChange('end', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto flex-1 rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Faculty</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Time In</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Time Out</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  {/* <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th> */}
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">DTR</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {facultyLoading ? (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-12">Loading faculty...</td></tr>
                ) : facultyList.length > 0 ? (
                  facultyList.map(faculty => {
                    const facultyId = faculty.FacultyID.toString();
                    const record = mostRecentAttendance[facultyId];
                    return (
                      <React.Fragment key={facultyId}>
                        <tr className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <Image
                              src={profilePhotos[faculty.FacultyID] || '/manprofileavatar.png'}
                              alt={`${faculty.User?.FirstName} ${faculty.User?.LastName} profile`}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                            <span className="font-medium">{faculty.User?.FirstName} {faculty.User?.LastName}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{record ? record.date : 'No record'}</td>
                          <td className="px-4 py-3 text-gray-600">{record ? record.in : 'No record'}</td>
                          <td className="px-4 py-3 text-gray-600">{record ? record.out : 'No record'}</td>
                          <td className="px-4 py-3">
                            {record ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${record.color}`}>
                                <i className={`fas ${record.icon}`} />
                                {record.status}
                              </span>
                            ) : (
                              <span className="text-gray-400">No record</span>
                            )}
                          </td>
                          {/* <td className="px-4 py-3">
                            <button className="text-gray-400 hover:text-[#800000] transition-colors duration-200" aria-label={`Edit ${faculty.User?.FirstName} ${faculty.User?.LastName} attendance`}>
                              <Edit2 size={16} />
                            </button>
                          </td> */}
                          {/* <td className="px-4 py-3">
                            <button
                              className="bg-[#800000] hover:bg-red-800 text-white text-xs rounded-lg px-3 py-1.5 transition-all duration-200 shadow-sm hover:shadow-md"
                              aria-label={`Download ${faculty.User?.FirstName} ${faculty.User?.LastName} DTR`}
                              onClick={() =>
                                downloadDTR(
                                  facultyId,
                                  `${faculty.User?.FirstName} ${faculty.User?.LastName}`,
                                  dateFilter.start || "all",
                                  dateFilter.end || "all"
                                )
                              }
                            >
                              Download DTR
                            </button>
                          </td> */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleExpandFaculty(facultyId)}
                              className="flex items-center gap-1 text-[#800000] hover:text-[#a00000] font-medium"
                              aria-expanded={expandedFaculty === facultyId ? "true" : "false"}
                              aria-controls={`attendance-row-${facultyId}`}
                            >
                              {expandedFaculty === facultyId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              {expandedFaculty === facultyId ? 'Hide Records' : 'View Records'}
                            </button>
                          </td>
                        </tr>
                        {expandedFaculty === facultyId && (
                          <tr id={`attendance-row-${facultyId}`}>
                            <td colSpan={8} className="bg-gray-50 px-8 py-6">
                              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200">
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    Attendance History for {faculty.User?.FirstName} {faculty.User?.LastName}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Showing records for the selected date range
                                  </p>
                                </div>
                                <div className="overflow-x-auto">
                                  {facultyHistoryLoading[facultyId] ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Loader2 className="animate-spin h-6 w-6 text-[#800000] mr-3" />
                                      <span className="text-gray-600">Loading attendance records...</span>
                                    </div>
                                  ) : (
                                    <table className="w-full">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time In</th>
                                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time Out</th>
                                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {(facultyAttendanceMap[facultyId] || []).length === 0 ? (
                                          <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center">
                                              <div className="text-gray-500">
                                                <div className="text-lg font-medium mb-2">No records found</div>
                                                <div className="text-sm">No attendance records available for the selected date range.</div>
                                              </div>
                                            </td>
                                          </tr>
                                        ) : (
                                          facultyAttendanceMap[facultyId].map((rec: any) => {
                                            const timeIn = rec.timeIn ? formatTime(rec.timeIn) : '-';
                                            const timeOut = rec.timeOut ? formatTime(rec.timeOut) : '-';
                                            
                                            // Calculate duration if both times are available
                                            let duration = '-';
                                            if (rec.timeIn && rec.timeOut) {
                                              try {
                                                const [inHours, inMinutes] = rec.timeIn.split(':').map(Number);
                                                const [outHours, outMinutes] = rec.timeOut.split(':').map(Number);
                                                const inTotal = inHours * 60 + inMinutes;
                                                const outTotal = outHours * 60 + outMinutes;
                                                const diffMinutes = outTotal - inTotal;
                                                const hours = Math.floor(diffMinutes / 60);
                                                const minutes = diffMinutes % 60;
                                                duration = `${hours}h ${minutes}m`;
                                              } catch (error) {
                                                duration = '-';
                                              }
                                            }

                                            // Status styling
                                            const statusStyles = {
                                              'PRESENT': 'bg-green-100 text-green-800',
                                              'LATE': 'bg-yellow-100 text-yellow-800',
                                              'ABSENT': 'bg-red-100 text-red-800',
                                              'NOT_RECORDED': 'bg-gray-100 text-gray-800'
                                            };

                                            return (
                                              <tr key={rec.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                  {new Date(rec.date).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                  })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                  {timeIn}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                  {timeOut}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[rec.status as keyof typeof statusStyles] || statusStyles['NOT_RECORDED']}`}>
                                                    {rec.status.replace('_', ' ')}
                                                  </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                  {duration}
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-400 py-12">
                      No faculty found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </>
      )}
          
      {activeTab === 'schedule' && (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, subject, class..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all duration-200"
                value={scheduleSearch}
                onChange={e => setScheduleSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedDay === day 
                      ? 'bg-[#800000] text-white shadow' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          
          <ScheduleGridView
            schedules={schedules}
            facultyList={facultyList}
            profilePhotos={profilePhotos}
            scheduleSearch={scheduleSearch}
            selectedDay={selectedDay}
            onEdit={handleOpenEditModal}
            onAdd={handleAddNewSchedule}
          />
        </>
      )}

      {isModalOpen && <ScheduleModal isEdit={false} editSchedule={null} onClose={handleCloseModal} onSave={handleScheduleSave} facultyList={facultyList} />}
      {isEditModalOpen && <ScheduleModal isEdit={true} editSchedule={editSchedule} onClose={handleCloseEditModal} onSave={handleScheduleSave} facultyList={facultyList} />}
      {isDeleteModalOpen && <DeleteModal onConfirm={handleConfirmDelete} onClose={handleCloseDeleteModal} />}

      {isAttendanceModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-8 relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#800000]">Record Attendance</h2>
              <button 
                onClick={() => setIsAttendanceModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-6">
              <label htmlFor="attendanceDate" className="block mb-2 font-semibold">Date</label>
              <input
                ref={attendanceDateRef}
                id="attendanceDate"
                type="date"
                className="border border-gray-300 rounded p-2"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                min={minDate}
                max={maxDate}
              />
            </div>

            {attendanceLoading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-[#800000] mx-auto mb-4" />
                <p>Loading attendance records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Faculty</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Time In</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Time Out</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Remarks</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mergedAttendance.map((row) => {
                      const errors = getRowValidationError(row);
                      const hasError = attendanceErrors[row.facultyId];
                      const saveStatus = attendanceSaveStatus[row.facultyId] || 'idle';
                      
                      return (
                        <tr key={row.facultyId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <Image
                              src={row.photo}
                              alt={`${row.name} profile`}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                            <span className="font-medium">{row.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              className={`border rounded p-2 w-32 ${errors.timeIn ? 'border-red-500' : 'border-gray-300'}`}
                              value={row.timeIn}
                              onChange={e => handleAttendanceEdit(row.facultyId, 'timeIn', e.target.value)}
                              onBlur={() => handleAttendanceStatusAuto(row.facultyId, row.timeIn)}
                              title="Time In"
                              aria-label={`Time In for ${row.name}`}
                            />
                            {errors.timeIn && <div className="text-red-500 text-xs mt-1">{errors.timeIn}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              className={`border rounded p-2 w-32 ${errors.timeOut ? 'border-red-500' : 'border-gray-300'}`}
                              value={row.timeOut}
                              onChange={e => handleAttendanceEdit(row.facultyId, 'timeOut', e.target.value)}
                              title="Time Out"
                              aria-label={`Time Out for ${row.name}`}
                            />
                            {errors.timeOut && <div className="text-red-500 text-xs mt-1">{errors.timeOut}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="border border-gray-300 rounded p-2"
                              value={row.status}
                              onChange={e => handleAttendanceEdit(row.facultyId, 'status', e.target.value)}
                              title="Attendance Status"
                              aria-label={`Status for ${row.name}`}
                            >
                              <option value="NOT_RECORDED">Not Recorded</option>
                              <option value="PRESENT">Present</option>
                              <option value="LATE">Late</option>
                              <option value="ABSENT">Absent</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="border border-gray-300 rounded p-2 w-32"
                              placeholder="Optional remarks"
                              value={row.remarks}
                              onChange={e => handleAttendanceEdit(row.facultyId, 'remarks', e.target.value)}
                              maxLength={100}
                            />
                            {errors.remarks && <div className="text-red-500 text-xs mt-1">{errors.remarks}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleAttendanceSave(row.facultyId)}
                              disabled={saveStatus === 'saving' || !hasChanges(row.facultyId)}
                              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                                saveStatus === 'saving'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : saveStatus === 'saved'
                                  ? 'bg-green-600 text-white'
                                  : hasChanges(row.facultyId)
                                  ? 'bg-[#800000] hover:bg-red-800 text-white'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {saveStatus === 'saving' ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="animate-spin h-4 w-4" />
                                  Saving...
                                </div>
                              ) : saveStatus === 'saved' ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Saved
                                </div>
                              ) : (
                                'Save'
                              )}
                            </button>
                            {hasError && (
                              <div className="text-red-500 text-xs mt-2 max-w-48">{hasError}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceContent;