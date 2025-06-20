import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Plus, Edit2, Trash2, Calendar, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/nextjs';
import { format, isAfter, isBefore, subDays, startOfMonth, endOfMonth } from 'date-fns';

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
  name: string;
  subject: string;
  classSection: string;
  day: string;
  time: string;
  img: string;
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
    // Parse the time string which comes in format "HH:mm:ss"
    const [hours, minutes] = timeString.split(':');
    
    // Convert to 12-hour format with AM/PM
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    // Ensure minutes are always two digits
    const formattedMinutes = minutes.padStart(2, '0');
    
    return `${hour12}:${formattedMinutes} ${ampm}`;
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

const initialSchedules: ScheduleRecord[] = [
  {
    id: "1",
    img: "/manprofileavatar.png",
    name: "John Doe",
    subject: "Mathematics",
    classSection: "Grade 9 - A",
    day: "Monday",
    time: "10:00 AM",
  },
];

// Add this new component before the AttendanceContent component
interface ScheduleModalProps {
  isEdit: boolean;
  editSchedule: ScheduleRecord | null;
  onClose: () => void;
  onSave: (schedule: ScheduleRecord) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isEdit, editSchedule, onClose, onSave }) => {
  const [form, setForm] = useState<ScheduleRecord>(
    isEdit && editSchedule
      ? editSchedule
      : {
          id: "",
          img: "/manprofileavatar.png",
          name: "",
          subject: "",
          classSection: "",
          day: "",
          time: "",
        }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

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
              <label htmlFor="name" className="block mb-1 font-semibold">Name</label>
              <input
                id="name" name="name" type="text"
                className="w-full border border-gray-300 rounded p-2"
                value={form.name} onChange={handleChange}
              />
            </div>
            <div className="flex-1 pb-6">
              <label htmlFor="classSection" className="block mb-1 font-semibold">Class and Section</label>
              <input
                id="classSection" name="classSection" type="text"
                className="w-full border border-gray-300 rounded p-2"
                value={form.classSection} onChange={handleChange}
              />
            </div>
            <div className="flex-1 pb-6">
              <label htmlFor="subject" className="block mb-1 font-semibold">Subject</label>
              <input
                id="subject" name="subject" type="text"
                className="w-full border border-gray-300 rounded p-2"
                value={form.subject} onChange={handleChange}
              />
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
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => (
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
  const [schedules, setSchedules] = useState<ScheduleRecord[]>(initialSchedules);
  const [scheduleSearch, setScheduleSearch] = useState("");

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

  // Load schedules from Supabase
  useEffect(() => {
    if (activeTab === 'schedule') {
      const fetchSchedules = async () => {
        const { data, error } = await supabase
          .from('Schedules')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) setSchedules(data as ScheduleRecord[]);
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
  const filteredSchedules = schedules.filter(s =>
    s.name.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    s.subject.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    s.classSection.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    s.day.toLowerCase().includes(scheduleSearch.toLowerCase())
  );

  // Schedule modal helpers
  const handleOpenModal = () => { setEditSchedule(null); setIsModalOpen(true);}
  const handleCloseModal = () => setIsModalOpen(false);
  const handleOpenEditModal = (sched: ScheduleRecord) => { setEditSchedule(sched); setIsEditModalOpen(true);}
  const handleCloseEditModal = () => setIsEditModalOpen(false);
  const handleOpenDeleteModal = (schedId: string) => { setDeleteScheduleId(schedId); setIsDeleteModalOpen(true);}
  const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);

// Handle schedule save (add or edit)
  const handleScheduleSave = async (sched: ScheduleRecord) => {
    if (editSchedule) {
      // Edit
      const { data, error } = await supabase
        .from('Schedules')
        .update({
          name: sched.name,
          subject: sched.subject,
          classSection: sched.classSection,
          day: sched.day,
          time: sched.time,
          img: sched.img,
        })
        .eq('id', sched.id)
        .select()
        .single();
      if (!error && data) {
        setSchedules(prev => prev.map(s => (s.id === data.id ? data : s)));
      }
      setIsEditModalOpen(false);
    } else {      
      // Add
 const { data, error } = await supabase
        .from('Schedules')
        .insert([{
          name: sched.name,
          subject: sched.subject,
          classSection: sched.classSection,
          day: sched.day,
          time: sched.time,
          img: sched.img || '/manprofileavatar.png',
        }])
        .select()
        .single();
      if (!error && data) {
        setSchedules(prev => [data, ...prev]);
      }
      setIsModalOpen(false);
    }
  };

 // Handle schedule delete
  const handleConfirmDelete = async () => {
    if (deleteScheduleId) {
      const { error } = await supabase
        .from('Schedules')
        .delete()
        .eq('id', deleteScheduleId);
      if (!error) {
        setSchedules(prev => prev.filter(s => s.id !== deleteScheduleId));
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
                          <td className="px-4 py-3">
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
                          </td>
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
                            <td colSpan={8} className="bg-gray-50 px-8 py-4">
                              <div className="overflow-x-auto">
                                {facultyHistoryLoading[facultyId] ? (
                                  <div className="text-center text-gray-400 py-4">Loading records...</div>
                                ) : (
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-600">Date</th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-600">Time In</th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-600">Time Out</th>
                                        <th className="px-2 py-1 text-left font-semibold text-gray-600">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(facultyAttendanceMap[facultyId] || []).length === 0 ? (
                                        <tr><td colSpan={4} className="text-center text-gray-400 py-4">No records found.</td></tr>
                                      ) : (
                                        facultyAttendanceMap[facultyId].map((rec: any) => (
                                          <tr key={rec.id}>
                                            <td className="px-2 py-1">{rec.date}</td>
                                            <td className="px-2 py-1">{rec.timeIn ? formatTime(rec.timeIn) : '-'}</td>
                                            <td className="px-2 py-1">{rec.timeOut ? formatTime(rec.timeOut) : '-'}</td>
                                            <td className="px-2 py-1">{rec.status}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                )}
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
                <div className="mb-4 flex gap-4 items-center">
                  <label className="font-semibold">Date:</label>
                  <input
                    ref={attendanceDateRef}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="border border-gray-300 rounded p-2"
                    title="Attendance Date (Cannot select future dates)"
                    aria-label="Attendance Date (Cannot select future dates)"
                    placeholder="Select date"
                  />
                  {(() => {
                    if (!attendanceDate) return null;
                    
                    const today = new Date();
                    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
                    
                    return attendanceDate > todayString ? (
                      <span className="text-sm text-red-500">(Cannot set attendance for future dates)</span>
                    ) : null;
                  })()}
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Faculty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time In</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time Out</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceLoading ? (
                        <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                      ) : mergedAttendance.map(row => {
                        const isAbsent = row.status === 'ABSENT';
                        // Always use the latest edit value for validation
                        const edit = attendanceEdits[row.facultyId] || {};
                        const fieldErrors = getAttendanceFieldErrors({
                          timeIn: edit.timeIn ?? '',
                          timeOut: edit.timeOut ?? '',
                          status: edit.status ?? row.status,
                          remarks: edit.remarks ?? '',
                        });
                        return (
                          <tr key={row.facultyId}>
                            <td className="px-4 py-2 flex items-center gap-2">
                              <img src={row.photo} alt="profile" className="w-8 h-8 rounded-full" />
                              <span>{row.name}</span>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="time"
                                value={edit.timeIn ?? ''}
                                disabled={isAbsent}
                                onChange={e => {
                                  handleAttendanceEdit(row.facultyId, 'timeIn', e.target.value);
                                  handleAttendanceStatusAuto(row.facultyId, e.target.value);
                                }}
                                className="border border-gray-300 rounded p-1"
                                title={`Time In for ${row.name}`}
                                aria-label={`Time In for ${row.name}`}
                                placeholder="Time In"
                              />
                              {fieldErrors.timeIn && <div className="text-xs text-red-600 mt-1">{fieldErrors.timeIn}</div>}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="time"
                                value={edit.timeOut ?? ''}
                                disabled={isAbsent}
                                onChange={e => handleAttendanceEdit(row.facultyId, 'timeOut', e.target.value)}
                                className="border border-gray-300 rounded p-1"
                                title={`Time Out for ${row.name}`}
                                aria-label={`Time Out for ${row.name}`}
                                placeholder="Time Out"
                              />
                              {fieldErrors.timeOut && <div className="text-xs text-red-600 mt-1">{fieldErrors.timeOut}</div>}
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={edit.status ?? row.status}
                                onChange={e => handleAttendanceEdit(row.facultyId, 'status', e.target.value)}
                                className="border border-gray-300 rounded p-1"
                                title={`Status for ${row.name}`}
                                aria-label={`Status for ${row.name}`}
                              >
                                <option value="PRESENT">Present</option>
                                <option value="LATE">Late</option>
                                <option value="ABSENT">Absent</option>
                                <option value="NOT_RECORDED">Not Recorded</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={edit.remarks ?? ''}
                                maxLength={100}
                                onChange={e => {
                                  const value = e.target.value;
                                  // Alphanumeric, spaces, basic punctuation, no more than 3 repeating symbols
                                  const valid = /^[a-zA-Z0-9 .,!?'-]*$/.test(value) && !/(.)\1{3,}/.test(value);
                                  if (valid || value === '') {
                                    handleAttendanceEdit(row.facultyId, 'remarks', value);
                                  }
                                }}
                                className="border border-gray-300 rounded p-1"
                                title={`Remarks for ${row.name}`}
                                aria-label={`Remarks for ${row.name}`}
                                placeholder="Remarks"
                              />
                              {fieldErrors.remarks && <div className="text-xs text-red-600 mt-1">{fieldErrors.remarks}</div>}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleAttendanceSave(row.facultyId)}
                                className={`px-4 py-1 rounded flex items-center gap-1 min-w-[120px] justify-center
                                  ${attendanceSaveStatus[row.facultyId] === 'saved'
                                    ? 'bg-green-600 text-white'
                                    : !hasChanges(row.facultyId) || Object.values(fieldErrors).some(Boolean) || attendanceSaveStatus[row.facultyId] === 'saving'
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'bg-[#800000] hover:bg-red-800 text-white'}`}
                                disabled={!hasChanges(row.facultyId) || attendanceSaveStatus[row.facultyId] === 'saving' || Object.values(fieldErrors).some(Boolean)}
                              >
                                {attendanceSaveStatus[row.facultyId] === 'saving' ? (
                                  <>
                                    <Loader2 className="animate-spin" size={16} /> Saving...
                                  </>
                                ) : attendanceSaveStatus[row.facultyId] === 'saved' ? (
                                  <>
                                    <CheckCircle size={16} /> Saved!
                                  </>
                                ) : !hasChanges(row.facultyId) ? (
                                  'No Changes'
                                ) : (
                                  'Save'
                                )}
                              </button>
                              {attendanceErrors[row.facultyId] && !Object.values(fieldErrors).some(Boolean) && (
                                <div className="text-xs text-red-600 mt-1">{attendanceErrors[row.facultyId]}</div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
  );
};

export default AttendanceContent;