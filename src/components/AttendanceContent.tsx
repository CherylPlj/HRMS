import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Image from 'next/image';

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

const fetchAllFacultyAttendance = async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
  // Replace with your actual backend
  let url = '/api/attendance/all';
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`;
  }
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
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

const AttendanceContent: React.FC = () => {
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

  // Schedule Modal Content
  const renderScheduleModal = (isEdit: boolean) => {
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
      handleScheduleSave(form);
    };

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#800000]">{isEdit ? 'Edit Schedule' : 'Add Schedule'}</h2>
            <button 
              onClick={isEdit ? handleCloseEditModal : handleCloseModal}
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

  // Delete Modal
  const renderDeleteModal = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
        <h2 className="text-2xl font-bold mb-4 text-[#800000]">Confirm Delete</h2>
        <p className="mb-6 text-gray-700">Are you sure you want to delete this schedule?</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleConfirmDelete}
            className="bg-red-600 hover:bg-[#800000] text-white px-4 py-2 rounded"
          >
            Yes, Delete
          </button>
          <button
            onClick={handleCloseDeleteModal}
            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="text-black p-4 min-h-screen">
      {/* Header with Toggle Switch */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          <span
            onClick={() => setActiveTab('attendance')}
            className={`cursor-pointer text-xl font-semibold ${activeTab === 'attendance' ? 'text-[#800000]' : 'text-gray-500'}`}
          >Attendance Management</span>
          <span className="text-gray-400">/</span>
          <span
            onClick={() => setActiveTab('schedule')}
            className={`cursor-pointer text-xl font-semibold ${activeTab === 'schedule' ? 'text-[#800000]' : 'text-gray-500'}`}
          >Schedule Management</span>
        </div>
        {activeTab === 'attendance' && (
          <button
            onClick={() => window.print()}
            className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded flex items-center"
          >
            <i className="fas fa-download mr-2"></i>
            Download
          </button>
        )}
        {activeTab === 'schedule' && (
          <button
            onClick={handleOpenModal}
            className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Schedule
          </button>
        )}
      </div>

      {/* Attendance Content */}
      {activeTab === 'attendance' && (
        <div>
          <div className="bg-white border-2 p-4 rounded-lg h-[75vh] flex flex-col items-stretch">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 mb-2 md:mb-0">
                <Search className="absolute left-2 top-2.5 text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or status..."
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <label className="text-gray-700">From</label>
                <input
                  type="date"
                  className="border px-2 py-1 rounded"
                  value={dateFilter.start}
                  onChange={e => handleDateChange('start', e.target.value)}
                />
                <label className="text-gray-700">To</label>
                <input
                  type="date"
                  className="border px-2 py-1 rounded"
                  value={dateFilter.end}
                  onChange={e => handleDateChange('end', e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-md text-left border-collapse border-t">
                <thead className="bg-gray-100 text-black text-md font-semibold">
                  <tr>
                    <th className="border border-white px-3 py-2 font-semibold text-black">Faculty</th>
                    <th className="border border-white px-3 py-2 font-semibold text-black">Date</th>
                    <th className="border border-white px-3 py-2 font-semibold text-black">Time In</th>
                    <th className="border border-white px-3 py-2 font-semibold text-black">Time Out</th>
                    <th className="border border-white px-3 py-2 font-semibold text-black">Status</th>
                    <th className="border border-white px-3 py-2 font-semibold text-black">Actions</th>
                    <th className="border border-white px-3 py-2 font-semibold text-black">DTR</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map(
                      ({ facultyId, name, date, in: timeIn, out: timeOut, status, color, icon, img }, idx) => (
                        <tr key={facultyId + date} className="border border-white">
                          <td className="border border-white px-3 py-2 flex items-center space-x-2">
                            <Image src={img} alt={`${name} profile`} width={24} height={24} className="w-6 h-6 rounded-full" />
                            {name}
                          </td>
                          <td className="px-3 py-2">{date}</td>
                          <td className="px-3 py-2">{timeIn}</td>
                          <td className="px-3 py-2">{timeOut}</td>
                          <td className={`px-3 py-2 ${color} flex items-center space-x-1`}>
                            <i className={`fas ${icon}`} />
                            <span>{status}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button className="text-gray-600 hover:text-black" aria-label={`Edit ${name} attendance`}>
                              <i className="fas fa-pencil-alt" />
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              className="bg-[#8B0000] text-white text-xs rounded px-3 py-1 hover:bg-[#6b0000]"
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
                      <td colSpan={7} className="text-center text-gray-400 py-8">
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Management Tab */}
      {activeTab === 'schedule' && (
        <div>
          <div className="bg-white border-2 p-4 rounded-lg h-[75vh] flex flex-col overflow-auto">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search schedule..."
                value={scheduleSearch}
                onChange={e => setScheduleSearch(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div className="overflow-auto flex-1">
              <table className="min-w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 border-b">Image</th>
                    <th className="p-2 border-b">Name</th>
                    <th className="p-2 border-b">Subject</th>
                    <th className="p-2 border-b">Class and Section</th>
                    <th className="p-2 border-b">Day</th>
                    <th className="p-2 border-b">Time</th>
                    <th className="p-2 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.length > 0 ? (
                    filteredSchedules.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-2 border-b">
                          <Image src={s.img} alt="Profile" width={40} height={40} className="w-10 h-10 rounded-full" />
                        </td>
                        <td className="p-2 border-b">{s.name}</td>
                        <td className="p-2 border-b">{s.subject}</td>
                        <td className="p-2 border-b">{s.classSection}</td>
                        <td className="p-2 border-b">{s.day}</td>
                        <td className="p-2 border-b">{s.time}</td>
                        <td className="p-2 border-b">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(s.id)}
                            className="bg-[#800000] hover:bg-red-600 text-white px-2 py-1 rounded text-sm ml-2"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-400 py-8">
                        No schedules found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && renderScheduleModal(false)}
      {isEditModalOpen && renderScheduleModal(true)}
      {isDeleteModalOpen && renderDeleteModal()}
    </div>
  );
};

export default AttendanceContent;