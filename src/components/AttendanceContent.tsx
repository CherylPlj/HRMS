import React, { useState } from 'react';
import { Search } from 'lucide-react';
// import { FaCalendarAlt } from 'react-icons/fa';
// import Head from 'next/head';
// import { BsFillPersonPlusFill } from 'react-icons/bs';
// import { MdDownload } from 'react-icons/md';    
// import { AiOutlineEdit } from 'react-icons/ai';
// import { BiTrash } from 'react-icons/bi';
// import { BsFillPersonFill } from 'react-icons/bs';
// import { BsFillPersonCheckFill } from 'react-icons/bs';




const AttendanceContent: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'attendance' | 'schedule'>('attendance'); // Switch state

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
            <div className="bg-white rounded-lg shadow-lg w-1/2 p-6 relative">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[#800000]">{isEdit ? 'Edit Schedule' : 'Add Schedule'}</h2>
                    <button 
                        onClick={isEdit ? handleCloseEditModal : handleCloseModal}
                        className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                    >
                        &times;
                    </button>
                </div>

                {/* Modal Body */}
                <div className="space-y-6">
                    <div className="flex space-x-4">
                        <div className="flex-1 pb-6">
                            <label htmlFor='Name' className="block mb-1 font-semibold">Name</label>
                            <select id="Name" className="w-full border border-gray-300 rounded p-2">
                                <option value="">Select Name</option>
                                <option value="John Doe">John Doe</option>
                                <option value="Jane Smith">Jane Smith</option>
                            </select>
                        </div>
                        <div className="flex-1 pb-6">
                            <label htmlFor='Class' className="block mb-1 font-semibold">Class and Section</label>
                            <select id="Class" className="w-full border border-gray-300 rounded p-2">
                                <option value="">Select Class & Section</option>
                                <option value="Grade 9 - A">Grade 9 - A</option>
                                <option value="Grade 10 - B">Grade 10 - B</option>
                            </select>
                        </div>
                        <div className="flex-1 pb-6">
                            <label htmlFor="Subject" className="block mb-1 font-semibold">Subject</label>
                            <select id="Subject" className="w-full border border-gray-300 rounded p-2">
                                <option value="">Select Subject</option>
                                <option value="Mathematics">Mathematics</option>
                                <option value="Science">Science</option>
                            </select>
                        </div>
                    </div>

                    <label className="block mb-1 font-semibold">Day and Time</label>
                    {/* Days and Time Pickers */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {['Monday', 'Tuesday', 'Wednesday'].map((day) => (
                                <div key={day} className="flex items-center space-x-2">
                                    <input type="checkbox" id={day + (isEdit ? 'edit' : '')} className="h-4 w-4" />
                                    <label htmlFor={day + (isEdit ? 'edit' : '')} className="w-24">{day}</label>
                                    <input id={day + (isEdit ? 'edit' : '')} type="time" className="border border-gray-300 rounded p-1 w-32" />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-4">
                            {['Thursday', 'Friday', 'Saturday'].map((day) => (
                                <div key={day} className="flex items-center space-x-2">
                                    <input type="checkbox" id={day + (isEdit ? 'edit' : '')} className="h-4 w-4" />
                                    <label htmlFor={day + (isEdit ? 'edit' : '')} className="w-24">{day}</label>
                                    <input id={day + (isEdit ? 'edit' : '')} type="time" className="border border-gray-300 rounded p-1 w-32" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-8">
                    <button
                        onClick={isEdit ? handleCloseEditModal : handleCloseModal}
                        className="bg-[#800000] hover:bg-red-800 text-white px-6 py-2 rounded"
                    >
                        {isEdit ? 'Update' : 'Save'}
                    </button>
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
                    {/* Add Schedule Button */}
                    {/* <div className="flex justify-end mb-4">
                        <button 
                            onClick={handleOpenModal}
                            className="bg-[#800000] hover:bg-red-800 text-white px-4 py-2 rounded flex items-center"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Add Schedule
                        </button>
                    </div> */}


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
                                        <th className="p-2 border-b">Time</th>
                                        <th className="p-2 border-b">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-gray-50">
                                        <td className="p-2 border-b">
                                            <img src="/manprofileavatar.png" alt="Profile" className="w-10 h-10 rounded-full" />
                                        </td>
                                        <td className="p-2 border-b">John Doe</td>
                                        <td className="p-2 border-b">Mathematics</td>
                                        <td className="p-2 border-b">Grade 9 - A</td>
                                        <td className="p-2 border-b">Monday</td>
                                        <td className="p-2 border-b">10:00 AM</td>
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