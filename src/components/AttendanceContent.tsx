import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
// import { FaCalendarAlt } from 'react-icons/fa';
// import Head from 'next/head';
// import { BsFillPersonPlusFill } from 'react-icons/bs';
// import { MdDownload } from 'react-icons/md';    
// import { AiOutlineEdit } from 'react-icons/ai';
// import { BiTrash } from 'react-icons/bi';
// import { BsFillPersonFill } from 'react-icons/bs';
// import { BsFillPersonCheckFill } from 'react-icons/bs';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupabaseSchedule {
    ScheduleID: number;
    FacultyID: number;
    DaySchedules: Array<{
        DayOfWeek: string;
        StartTime: string;
        EndTime: string;
    }>;
    Subject: string;
    ClassSection: string;
    Faculty: {
        FirstName: string;
        LastName: string;
    } | null;
}

// Update the DayOfWeek type to match exactly what's in the database
type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DaySchedule {
    day: DayOfWeek;
    startTime: string;
    endTime: string;
}

interface Schedule {
    ScheduleID: number;
    FacultyID: number;
    DaySchedules: DaySchedule[];
    Subject: string;
    ClassSection: string;
    Faculty?: {
        FirstName: string;
        LastName: string;
    };
}

interface Faculty {
    FacultyID: number;
    FirstName: string;
    LastName: string;
}

interface SupabaseFaculty {
    FacultyID: number;
    User: {
        FirstName: string;
        LastName: string;
    };
}

interface SubjectSchedule {
    subject: string;
    classSection: string;
    daySchedules: DaySchedule[];
}

// Add helper function to check for time overlap
const isTimeOverlap = (
    startTime1: string,
    endTime1: string,
    startTime2: string,
    endTime2: string
): boolean => {
    const start1 = new Date(`2000-01-01T${startTime1}`);
    const end1 = new Date(`2000-01-01T${endTime1}`);
    const start2 = new Date(`2000-01-01T${startTime2}`);
    const end2 = new Date(`2000-01-01T${endTime2}`);

    return start1 < end2 && start2 < end1;
};

const AttendanceContent: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'attendance' | 'schedule'>('attendance');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        FacultyID: '',
        subjectSchedules: [] as SubjectSchedule[]
    });
    const [currentSubject, setCurrentSubject] = useState<SubjectSchedule>({
        subject: '',
        classSection: '',
        daySchedules: []
    });
    const [step, setStep] = useState(1); // 1: Faculty, 2: Subject Details

    // Add current faculty schedules state
    const [currentFacultySchedules, setCurrentFacultySchedules] = useState<Schedule[]>([]);

    // Add error clearing timeout
    const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

    // Function to set error with auto-clear
    const setErrorWithTimeout = (message: string) => {
        // Clear any existing timeout
        if (errorTimeout) {
            clearTimeout(errorTimeout);
        }
        
        // Set the error message
        setError(message);
        
        // Set a new timeout to clear the error after 5 seconds
        const timeout = setTimeout(() => {
            setError(null);
        }, 5000);
        
        setErrorTimeout(timeout);
    };

    // Helper function to format time for display
    const formatTime = (time: string) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Function to fetch faculties
    const fetchFaculties = async () => {
        try {
            const { data, error } = await supabase
                .from('Faculty')
                .select(`
                    FacultyID,
                    User!inner (
                        FirstName,
                        LastName
                    )
                `)
                .eq('EmploymentStatus', 'Hired');

            if (error) {
                console.error('Error fetching faculties:', error);
                return;
            }

            if (data) {
                console.log('Fetched faculty data:', data);
                const formattedFaculties: Faculty[] = (data as unknown as SupabaseFaculty[]).map(faculty => ({
                    FacultyID: faculty.FacultyID,
                    FirstName: faculty.User.FirstName,
                    LastName: faculty.User.LastName
                }));
                console.log('Formatted faculties:', formattedFaculties);
                setFaculties(formattedFaculties);
            } else {
                console.log('No faculty data returned');
                setFaculties([]);
            }
        } catch (error) {
            console.error('Error:', error);
            setFaculties([]);
        }
    };

    // Load faculties on component mount
    useEffect(() => {
        fetchFaculties();
    }, []);

    // Function to fetch schedules
    const fetchSchedules = async () => {
        try {
            const { data, error } = await supabase
                .from('Schedule')
                .select(`
                    ScheduleID,
                    FacultyID,
                    DaySchedules,
                    Subject,
                    ClassSection,
                    Faculty:faculty (
                        FirstName,
                        LastName
                    )
                `)
                .order('ScheduleID', { ascending: false });

            if (error) {
                console.error('Error fetching schedules:', error);
                return;
            }

            if (data) {
                const formattedData: Schedule[] = (data as unknown as SupabaseSchedule[]).map(item => ({
                    ScheduleID: item.ScheduleID,
                    FacultyID: item.FacultyID,
                    DaySchedules: item.DaySchedules.map(ds => ({
                        day: ds.DayOfWeek as DayOfWeek,
                        startTime: ds.StartTime,
                        endTime: ds.EndTime
                    })),
                    Subject: item.Subject,
                    ClassSection: item.ClassSection,
                    Faculty: item.Faculty ? {
                        FirstName: item.Faculty.FirstName,
                        LastName: item.Faculty.LastName
                    } : undefined
                }));
                setSchedules(formattedData);
            } else {
                setSchedules([]);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load schedules on component mount
    useEffect(() => {
        fetchSchedules();
    }, []);

    // Modify handleFacultySelect to fetch current schedules
    const handleFacultySelect = async (facultyId: string) => {
        setFormData(prev => ({
            ...prev,
            FacultyID: facultyId
        }));

        try {
            const { data, error } = await supabase
                .from('Schedule')
                .select('*')
                .eq('FacultyID', facultyId);

            if (error) {
                console.error('Error fetching faculty schedules:', error);
                return;
            }

            setCurrentFacultySchedules(data || []);
        } catch (error) {
            console.error('Error:', error);
        }

        setStep(2);
    };

    // Handle subject input changes
    const handleSubjectInputChange = (field: keyof SubjectSchedule, value: string) => {
        setCurrentSubject(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle day and time changes for current subject
    const handleDayTimeChange = (day: string, checked: boolean, startTime: string = '', endTime: string = '') => {
        setCurrentSubject(prev => {
            if (checked) {
                return {
                    ...prev,
                    daySchedules: [...prev.daySchedules, { day: day as DayOfWeek, startTime, endTime }]
                };
            } else {
                return {
                    ...prev,
                    daySchedules: prev.daySchedules.filter(ds => ds.day !== day)
                };
            }
        });
    };

    // Modify handleTimeChange to use the new error handling
    const handleTimeChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
        setCurrentSubject(prev => {
            const updatedSchedules = prev.daySchedules.map(ds => {
                if (ds.day === day) {
                    const updatedSchedule = { ...ds, [field]: value };
                    
                    // If both times are set, validate end time is after start time
                    if (updatedSchedule.startTime && updatedSchedule.endTime) {
                        const start = new Date(`2000-01-01T${updatedSchedule.startTime}`);
                        const end = new Date(`2000-01-01T${updatedSchedule.endTime}`);
                        
                        if (end <= start) {
                            setErrorWithTimeout(`Invalid time range: End time (${formatTime(updatedSchedule.endTime)}) must be after start time (${formatTime(updatedSchedule.startTime)})`);
                            return ds; // Return original schedule if invalid
                        }
                    }
                    
                    return updatedSchedule;
                }
                return ds;
            });

            return {
                ...prev,
                daySchedules: updatedSchedules
            };
        });
    };

    // Modify handleAddSubject to provide more detailed conflict messages
    const handleAddSubject = () => {
        if (!currentSubject.subject || !currentSubject.classSection) {
            setErrorWithTimeout('Please fill in both Subject and Class Section fields');
            return;
        }

        if (currentSubject.daySchedules.length === 0) {
            setErrorWithTimeout('Please select at least one day and set its schedule');
            return;
        }

        // Check for conflicts with existing schedules in formData
        for (const newSchedule of currentSubject.daySchedules) {
            // Check conflicts with schedules being added
            for (const existingSubject of formData.subjectSchedules) {
                for (const existingSchedule of existingSubject.daySchedules) {
                    if (existingSchedule.day === newSchedule.day &&
                        isTimeOverlap(
                            existingSchedule.startTime,
                            existingSchedule.endTime,
                            newSchedule.startTime,
                            newSchedule.endTime
                        )) {
                        setErrorWithTimeout(
                            `Schedule conflict detected on ${newSchedule.day}:\n` +
                            `New schedule (${formatTime(newSchedule.startTime)} - ${formatTime(newSchedule.endTime)}) ` +
                            `overlaps with existing schedule for ${existingSubject.subject} ` +
                            `(${formatTime(existingSchedule.startTime)} - ${formatTime(existingSchedule.endTime)})`
                        );
                        return;
                    }
                }
            }

            // Check conflicts with existing schedules in database
            for (const existingSchedule of currentFacultySchedules) {
                const conflictingSchedule = existingSchedule.DaySchedules.find(ds => 
                    ds.day === newSchedule.day &&
                    isTimeOverlap(
                        ds.startTime,
                        ds.endTime,
                        newSchedule.startTime,
                        newSchedule.endTime
                    )
                );

                if (conflictingSchedule) {
                    setErrorWithTimeout(
                        `Schedule conflict detected on ${newSchedule.day}:\n` +
                        `New schedule (${formatTime(newSchedule.startTime)} - ${formatTime(newSchedule.endTime)}) ` +
                        `overlaps with existing schedule in database ` +
                        `(${formatTime(conflictingSchedule.startTime)} - ${formatTime(conflictingSchedule.endTime)})`
                    );
                    return;
                }
            }
        }
        
        setFormData(prev => ({
            ...prev,
            subjectSchedules: [...prev.subjectSchedules, currentSubject]
        }));
        
        // Reset current subject form
        setCurrentSubject({
            subject: '',
            classSection: '',
            daySchedules: []
        });

        // Clear any existing error
        setError(null);
    };

    // Remove subject from form data
    const handleRemoveSubject = (index: number) => {
        setFormData(prev => ({
            ...prev,
            subjectSchedules: prev.subjectSchedules.filter((_, i) => i !== index)
        }));
    };

    // Validate form data
    const validateForm = () => {
        if (!formData.FacultyID) {
            setError('Please select a faculty member');
            return false;
        }
        if (formData.subjectSchedules.length === 0) {
            setError('Please add at least one subject schedule');
            return false;
        }
        return true;
    };

    // Handle form submission
    const handleSubmit = async () => {
        setError(null);
        if (!validateForm()) {
            return;
        }

        try {
            setSaving(true);
            
            // Helper function to convert time to proper DateTime format
            const timeToDateTime = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':');
                const date = new Date();
                date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                return date.toISOString();
            };

            // Validate and prepare schedule data
            if (!formData.FacultyID) {
                throw new Error('Faculty ID is required');
            }

            // Create individual schedule entries for each day and time combination
            const scheduleData = formData.subjectSchedules.flatMap(subjectSchedule => {
                if (!subjectSchedule.subject || !subjectSchedule.classSection) {
                    throw new Error('Subject and Class Section are required for all schedules');
                }

                // Create separate entries for each day schedule
                return subjectSchedule.daySchedules.map(ds => {
                    if (!ds.startTime || !ds.endTime) {
                        throw new Error('Start time and end time are required for all selected days');
                    }

                    return {
                        FacultyID: parseInt(formData.FacultyID),
                        Subject: subjectSchedule.subject,
                        ClassSection: subjectSchedule.classSection,
                        DayOfWeek: ds.day,
                        StartTime: timeToDateTime(ds.startTime),
                        EndTime: timeToDateTime(ds.endTime)
                    };
                });
            });

            if (scheduleData.length === 0) {
                throw new Error('No schedule data to save');
            }

            console.log('Saving schedule data:', JSON.stringify(scheduleData, null, 2));

            // First try to enable RLS for the current user
            const { error: rpcError } = await supabase.rpc('grant_schedule_permissions');
            if (rpcError) {
                console.warn('Could not grant permissions via RPC:', rpcError);
                // Continue anyway as the permissions might already exist
            }

            // Insert each schedule entry
            const { data, error } = await supabase
                .from('Schedule')
                .insert(scheduleData)
                .select();

            if (error) {
                console.error('Supabase error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                
                if (error.code === '42501') {
                    setErrorWithTimeout('Permission denied. Please make sure you have the necessary permissions to add schedules.');
                    return;
                }
                
                throw new Error(`Database error: ${error.message}`);
            }

            console.log('Successfully saved schedules:', data);

            // Show success message
            setErrorWithTimeout('Schedules saved successfully!');

            await fetchSchedules();
            handleCloseModal();
            setFormData({
                FacultyID: '',
                subjectSchedules: []
            });
            setCurrentSubject({
                subject: '',
                classSection: '',
                daySchedules: []
            });
            setStep(1);
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            setErrorWithTimeout(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleOpenEditModal = () => setIsEditModalOpen(true);
    const handleCloseEditModal = () => setIsEditModalOpen(false);

    const handleOpenDeleteModal = () => setIsDeleteModalOpen(true);
    const handleCloseDeleteModal = () => setIsDeleteModalOpen(false);

    const handleConfirmDelete = () => {
        // Put your delete logic here
        console.log('User deleted');
        handleCloseDeleteModal();
    };

    const renderModalContent = (isEdit: boolean) => (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg w-2/3 p-6 relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#800000]">{isEdit ? 'Edit Schedule' : 'Add Schedule'}</h2>
                    <button 
                        onClick={isEdit ? handleCloseEditModal : handleCloseModal}
                        className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                    >
                        &times;
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="whitespace-pre-line">{error}</div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Step 1: Faculty Selection */}
                    {step === 1 && (
                        <div>
                            <label htmlFor='FacultyID' className="block mb-1 font-semibold">Select Faculty</label>
                            <select 
                                id="FacultyID" 
                                value={formData.FacultyID}
                                onChange={(e) => handleFacultySelect(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2"
                            >
                                <option value="">Select Name</option>
                                {faculties.map(faculty => (
                                    <option key={faculty.FacultyID} value={faculty.FacultyID}>
                                        {faculty.FirstName} {faculty.LastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Step 2: Subject and Schedule */}
                    {step === 2 && (
                        <>
                            {/* Added Schedules List */}
                            {formData.subjectSchedules.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-2">Added Schedules</h3>
                                    <div className="space-y-2">
                                        {formData.subjectSchedules.map((schedule, index) => (
                                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                <div>
                                                    <span className="font-medium">{schedule.subject}</span>
                                                    <span className="text-gray-500 mx-2">|</span>
                                                    <span>{schedule.classSection}</span>
                                                    <span className="text-gray-500 mx-2">|</span>
                                                    <span className="text-sm text-gray-600">
                                                        {schedule.daySchedules.map(ds => 
                                                            `${ds.day} (${ds.startTime}-${ds.endTime})`
                                                        ).join(', ')}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveSubject(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Subject Form */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-4">Add New Schedule</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label htmlFor="subject" className="block mb-1">Subject</label>
                                        <select 
                                            id="subject" 
                                            value={currentSubject.subject}
                                            onChange={(e) => handleSubjectInputChange('subject', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-2"
                                        >
                                            <option value="">Select Subject</option>
                                            <option value="Mathematics">Mathematics</option>
                                            <option value="Science">Science</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="classSection" className="block mb-1">Class and Section</label>
                                        <select 
                                            id="classSection" 
                                            value={currentSubject.classSection}
                                            onChange={(e) => handleSubjectInputChange('classSection', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-2"
                                        >
                                            <option value="">Select Class & Section</option>
                                            <option value="Grade 9 - A">Grade 9 - A</option>
                                            <option value="Grade 10 - B">Grade 10 - B</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block font-semibold">Schedule</label>
                                    <div className="grid grid-cols-2 gap-6">
                                        {DAYS_OF_WEEK.map((day) => {
                                            const daySchedule = currentSubject.daySchedules.find(ds => ds.day === day);
                                            return (
                                                <div key={day} className="flex items-center space-x-2">
                                                    <input 
                                                        type="checkbox" 
                                                        id={`current-${day}`}
                                                        checked={!!daySchedule}
                                                        onChange={(e) => handleDayTimeChange(day, e.target.checked)}
                                                        className="h-4 w-4" 
                                                    />
                                                    <label htmlFor={`current-${day}`} className="w-24">{day}</label>
                                                    {daySchedule && (
                                                        <div className="flex items-center space-x-2">
                                                            <input 
                                                                type="time" 
                                                                value={daySchedule.startTime}
                                                                onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                                                                className="border border-gray-300 rounded p-1 w-32" 
                                                            />
                                                            <span className="text-gray-500">-</span>
                                                            <input 
                                                                type="time" 
                                                                value={daySchedule.endTime}
                                                                onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                                                                className="border border-gray-300 rounded p-1 w-32" 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button
                                        onClick={handleAddSubject}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                    >
                                        Add Subject
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end mt-8 space-x-2">
                    <button
                        onClick={handleCloseModal}
                        className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-2 rounded"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    {step === 2 && (
                        <button
                            onClick={handleSubmit}
                            className="bg-[#800000] hover:bg-red-800 text-white px-6 py-2 rounded flex items-center"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : 'Save All'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDeleteModal = () => (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-96 text-center">
                <h2 className="text-2xl font-bold mb-4 text-[#800000]">Confirm Delete</h2>
                <p className="mb-6 text-gray-700">Are you sure you want to delete this user?</p>
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
                {/* Tabs for Attendance and Schedule */}
                <div className="flex space-x-4">
                    <span 
                        onClick={() => setActiveTab('attendance')}
                        className={`cursor-pointer text-xl font-semibold ${activeTab === 'attendance' ? 'text-[#800000]' : 'text-gray-500'}`}
                    >Attendance Management</span>
                    <span className="text-gray-400">/</span>
                    <span 
                        onClick={() => setActiveTab('schedule')}
                        className={`cursor-pointer text-xl font-semibold ${activeTab === 'schedule' ? 'text-[#800000]' : 'text-gray-500'}`}
                    >Schedule Management
                    </span>
                </div>
                {/* Add Download Button */}
                {activeTab === 'attendance' && (
                <button
                    onClick={() => console.log("Download Attendance")}
                    className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded flex items-center"
                >
                    <i className="fas fa-download mr-2"></i>
                    Download
                </button>
                )}

                {/* Add Schedule Button */}
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
                    <div className="bg-white border-2 p-4 rounded-lg h-[75vh] flex items-start justify-center">
                    <main className="flex-1 p-6">
                        {/* <div className="border border-[#8B0000] rounded-sm p-4"> */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                            {/* <div className="flex items-center border border-gray-300 rounded text-gray-700 text-sm px-3 py-1 w-full sm:w-[300px]"> */}
                                {/* Search Bar */}
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2 top-2.5 text-gray-500" size={18} />
                                        <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                </div>
                            {/* <input
                                type="text"
                                placeholder="Search..."
                                aria-label="Search attendance"
                                className="w-full bg-transparent focus:outline-none text-xs"
                            /> */}
                            {/* </div> */}
                            <button className="flex items-center bg-black text-white text-md font-semibold rounded px-3 py-1">
                            <i className="fas fa-calendar-alt mr-2" />
                            2025-03-20 - 2025-03-20
                            </button>
                        </div>
                        <table className="w-full text-md text-left border-collapse border-t">
                            <thead className="bg-gray-100 text-black text-md font-semibold">
                            <tr>
                                {[
                                "Faculty",
                                "Date",
                                "Time In",
                                "Time Out",
                                "Status",
                                "Actions",
                                "DTR",
                                ].map((header) => (
                                <th
                                    key={header}
                                    className="border border-white px-3 py-2 font-semibold text-black"
                                >
                                    {header}
                                </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {[
                                {
                                name: "Jane Smith",
                                date: "2025-03-20",
                                in: "08:30 AM",
                                out: "03:50 PM",
                                status: "Late",
                                color: "text-yellow-500",
                                icon: "fa-exclamation-triangle",
                                img: "https://storage.googleapis.com/a1aa/image/0c7638f7-d5c8-47ab-3ea5-893e97de3cb9.jpg",
                                },
                                {
                                name: "John Smith",
                                date: "2025-03-20",
                                in: "08:05 AM",
                                out: "04:00 PM",
                                status: "Present",
                                color: "text-green-600",
                                icon: "fa-check-square",
                                img: "https://storage.googleapis.com/a1aa/image/84501257-0104-4432-6d67-54cc99d95ea7.jpg",
                                },
                                {
                                name: "Ronel Reyes",
                                date: "2025-03-20",
                                in: "08:30 AM",
                                out: "03:50 PM",
                                status: "Late",
                                color: "text-yellow-500",
                                icon: "fa-exclamation-triangle",
                                img: "https://storage.googleapis.com/a1aa/image/5cdfcb17-411b-49de-89ee-3627f14ca548.jpg",
                                },
                            ].map(({ name, date, in: timeIn, out: timeOut, status, color, icon, img }) => (
                                <tr key={name} className="border border-white">
                                <td className="border border-white px-3 py-2 flex items-center space-x-2">
                                    <img src={img} alt={`${name} profile picture`} className="w-6 h-6 rounded-full" />
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
                                    <button className="bg-[#8B0000] text-white text-xs rounded px-3 py-1 hover:bg-[#6b0000]" aria-label={`View ${name} DTR`}>
                                    View
                                    </button>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {/* </div> */}
                        </main>
                        </div>
                        </div>
                        )}

            {/* Content based on the active tab */}
            {activeTab === 'schedule' && (
                <div>
                    {/* Big Container for Schedule */}
                    <div className="bg-white border-2  p-4 rounded-lg h-[75vh] flex flex-col overflow-auto">
                        {/* Search Bar */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded"
                            />
                        </div>

                        {/* Table */}
                        <div className="overflow-auto flex-1">
                            <table className="min-w-full table-auto border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="p-2 border-b">Image</th>
                                        <th className="p-2 border-b">Name</th>
                                        <th className="p-2 border-b">Subject</th>
                                        <th className="p-2 border-b">Class and Section</th>
                                        <th className="p-2 border-b">Day</th>
                                        <th className="p-2 border-b">Time Range</th>
                                        <th className="p-2 border-b">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center p-4">Loading...</td>
                                        </tr>
                                    ) : schedules.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center p-4">No schedules found</td>
                                        </tr>
                                    ) : (
                                        schedules
                                            .filter(schedule => 
                                                schedule.FacultyID.toString().includes(searchQuery) ||
                                                schedule.Subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                schedule.ClassSection.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((schedule) => (
                                                <tr key={schedule.ScheduleID} className="hover:bg-gray-50">
                                                    <td className="p-2 border-b">
                                                        <img src="/manprofileavatar.png" alt="Profile" className="w-10 h-10 rounded-full" />
                                                    </td>
                                                    <td className="p-2 border-b">
                                                        {schedule.Faculty ? `${schedule.Faculty.FirstName} ${schedule.Faculty.LastName}` : `Faculty ${schedule.FacultyID}`}
                                                    </td>
                                                    <td className="p-2 border-b">{schedule.Subject}</td>
                                                    <td className="p-2 border-b">{schedule.ClassSection}</td>
                                                    <td className="p-2 border-b">{schedule.DaySchedules.map(ds => ds.day).join(', ')}</td>
                                                    <td className="p-2 border-b">{schedule.DaySchedules.map(ds => `${ds.startTime} - ${ds.endTime}`).join(', ')}</td>
                                                    <td className="p-2 border-b">
                                                        <button 
                                                            onClick={handleOpenEditModal}
                                                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={handleOpenDeleteModal}
                                                            className="bg-[#800000] hover:bg-red-600 text-white px-2 py-1 rounded text-sm ml-2"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        

            {/* Modals */}
            {isModalOpen && renderModalContent(false)}
            {isEditModalOpen && renderModalContent(true)}
            {isDeleteModalOpen && renderDeleteModal()}
        </div>
    );
};

export default AttendanceContent;