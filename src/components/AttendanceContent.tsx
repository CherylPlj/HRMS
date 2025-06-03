import React, { useState, useEffect } from 'react';
import { Search, Download, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { useUser } from '@clerk/nextjs';

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

  // Load attendance from backend
  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAllFacultyAttendance(dateFilter.start, dateFilter.end).then(setAttendance);
    }
  }, [activeTab, dateFilter]);

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
  const handleScheduleSave = (sched: ScheduleRecord) => {
    if (editSchedule) {
      // Edit
      setSchedules(prev =>
        prev.map(s => (s.id === sched.id ? sched : s))
      );
      setIsEditModalOpen(false);
    } else {
      // Add
      setSchedules(prev => [...prev, { ...sched, id: Math.random().toString() }]);
      setIsModalOpen(false);
    }
  };

  // Handle schedule delete
  const handleConfirmDelete = () => {
    setSchedules(prev => prev.filter(s => s.id !== deleteScheduleId));
    setIsDeleteModalOpen(false);
  };

  // Date filter UI
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="text-black p-6 min-h-screen bg-gray-50">
      {/* Header with Toggle Switch */}
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
            Attendance Management
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`relative px-4 py-2 text-lg font-medium transition-all duration-200 ${
              activeTab === 'schedule'
                ? 'text-[#800000] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#800000]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Schedule Management
          </button>
        </div>
        {activeTab === 'attendance' && (
          <button
            onClick={() => window.print()}
            className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Download size={18} />
            Download
          </button>
        )}
        {activeTab === 'schedule' && (
          <button
            onClick={handleOpenModal}
            className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus size={18} />
            Add Schedule
          </button>
        )}
      </div>

      {/* Attendance Content */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-[75vh] flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            {/* Search Bar */}
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
            {/* Date Range */}
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">DTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttendance.length > 0 ? (
                  filteredAttendance.map(
                    ({ facultyId, name, date, in: timeIn, out: timeOut, status, color, icon, img, userId }, idx) => (
                      <tr key={facultyId + date} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8">
                              <Image 
                                src={img} 
                                alt={`${name} profile`} 
                                width={32} 
                                height={32} 
                                className="rounded-full"
                                onError={(e) => {
                                  // If image fails to load, use default avatar
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/manprofileavatar.png';
                                }}
                              />
                            </div>
                            <span className="font-medium">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{date}</td>
                        <td className="px-4 py-3 text-gray-600">{timeIn}</td>
                        <td className="px-4 py-3 text-gray-600">{timeOut}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${color}`}>
                            <i className={`fas ${icon}`} />
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-gray-400 hover:text-[#800000] transition-colors duration-200" aria-label={`Edit ${name} attendance`}>
                            <Edit2 size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="bg-[#800000] hover:bg-red-800 text-white text-xs rounded-lg px-3 py-1.5 transition-all duration-200 shadow-sm hover:shadow-md"
                            aria-label={`Download ${name} DTR`}
                            onClick={() =>
                              downloadDTR(
                                facultyId,
                                name,
                                dateFilter.start || "all",
                                dateFilter.end || "all"
                              )
                            }
                          >
                            Download DTR
                          </button>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-12">
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Management Tab */}
      {activeTab === 'schedule' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-[75vh] flex flex-col">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search schedule..."
                value={scheduleSearch}
                onChange={e => setScheduleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all duration-200"
              />
            </div>
          </div>
          <div className="overflow-auto flex-1 rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Image</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Subject</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Class and Section</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Day</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSchedules.length > 0 ? (
                  filteredSchedules.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-3">
                        <Image src={s.img} alt="Profile" width={40} height={40} className="rounded-full" />
                      </td>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.subject}</td>
                      <td className="px-4 py-3 text-gray-600">{s.classSection}</td>
                      <td className="px-4 py-3 text-gray-600">{s.day}</td>
                      <td className="px-4 py-3 text-gray-600">{s.time}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="text-green-600 hover:text-green-700 transition-colors duration-200"
                            title="Edit schedule"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(s.id)}
                            className="text-[#800000] hover:text-red-800 transition-colors duration-200"
                            title="Delete schedule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-12">
                      No schedules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <ScheduleModal
          isEdit={false}
          editSchedule={null}
          onClose={handleCloseModal}
          onSave={handleScheduleSave}
        />
      )}
      {isEditModalOpen && (
        <ScheduleModal
          isEdit={true}
          editSchedule={editSchedule}
          onClose={handleCloseEditModal}
          onSave={handleScheduleSave}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteModal
          onConfirm={handleConfirmDelete}
          onClose={handleCloseDeleteModal}
        />
      )}
    </div>
  );
};

export default AttendanceContent;