import React, { useState } from 'react';
import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaFilter } from 'react-icons/fa';
import { Search, Filter, Trash2 } from 'lucide-react';

type Faculty = {
  id: string;
  name: string;
  position: string;
  department: string;
  status: string;
  image: string;
};

const facultyData: Faculty[] = [
  {
    id: '2025-0001-SJSFI',
    name: 'Maria Reyes',
    position: 'Elementary Math Teacher',
    department: 'Math',
    status: 'Regular',
    image: '/womanavatar.png',
  },
  {
    id: '2025-0002-SJSFI',
    name: 'John Dela Cruz',
    position: 'Secondary English Teacher',
    department: 'English',
    status: 'Regular',
    image: '/manavatar2.png',
  },
  {
    id: '2025-0003-SJSFI',
    name: 'Angela Santos',
    position: 'Secondary Science Teacher',
    department: 'Science',
    status: 'Regular',
    image: '/womanavatar2.png',
  },
];

const FacultyContent: React.FC = () => {
  const [activeView, setActiveView] = useState<'facultyManagement' | 'documentManagement'>(
    'facultyManagement'
  ); // State to toggle between views
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false); // State for Add Faculty modal
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false); // State for Add Document modal

  const handleOpenFacultyModal = () => {
    setIsFacultyModalOpen(true); // Open the Add Faculty modal
  };

  const handleCloseFacultyModal = () => {
    setIsFacultyModalOpen(false); // Close the Add Faculty modal
  };

  const handleOpenDocumentModal = () => {
    setIsDocumentModalOpen(true); // Open the Add Document modal
  };

  const handleCloseDocumentModal = () => {
    setIsDocumentModalOpen(false); // Close the Add Document modal
  };

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold">
        {activeView === 'facultyManagement' ? 'Faculty Management' : 'Document Management'}
      </h2>
      <div className="flex space-x-3">
      {/* Toggle Button */}
      <button
        className={`bg-white border border-[#800000] text-[#800000] px-4 py-2 w-40 rounded hover:bg-[#800000] hover:text-white transition flex items-center justify-center`}
        onClick={() =>
          setActiveView(
            activeView === 'facultyManagement' ? 'documentManagement' : 'facultyManagement'
          )
        }
      >
        {activeView === 'facultyManagement' ? (
          <>
            <FaFile className="w-4 h-4 mr-2" />
            Documents
          </>
        ) : (
          <>
            <FaFile className="w-4 h-4 mr-2" />
            Faculty List
          </>
        )}
      </button>
        {/* Add Faculty or Add Document Button */}
        {activeView === 'facultyManagement' && (
          <button
            className="bg-[#800000] text-white px-4 py-2 rounded w-48"
            onClick={handleOpenFacultyModal} // Open the Add Faculty modal
          >
            <FaPlus className="inline mr-1" /> Add Faculty
          </button>
        )}
        {activeView === 'documentManagement' && (
          <button
            className="bg-[#800000] text-white px-4 py-2 rounded w-48"
            onClick={handleOpenDocumentModal} // Open the Add Document modal
          >
            <FaPlus className="inline mr-1" /> Add Document
          </button>
        )}
      </div>
    </div>

      {/* Faculty Management View */}
      {activeView === 'facultyManagement' && (
        <>
          
         {/* Main box */}
      <div className="bg-white border border-[#800000] rounded-lg p-4 w-full shadow">
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

          <table className="w-full table-auto text-sm border border-gray-200 shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-black font-semibold">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Faculty ID</th>
                <th className="p-3 text-left">Image</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Position</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">
                  <FaFilter className="inline-block" title="Filter options" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {facultyData.map((faculty, index) => (
                <tr
                  key={faculty.id}
                  className="border-b hover:bg-gray-50 transition duration-200"
                >
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{faculty.id}</td>
                  <td className="p-3">
                    <img
                      src={faculty.image}
                      alt="avatar"
                      className="w-10 h-10 rounded-full border"
                    />
                  </td>
                  <td className="p-3">{faculty.name}</td>
                  <td className="p-3">{faculty.position}</td>
                  <td className="p-3">{faculty.department}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        faculty.status === 'Regular'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {faculty.status}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 transition"
                      title="Edit"
                    >
                      <FaPen />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 transition"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>


          {/* Add Faculty Modal */}
          {isFacultyModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96 my-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-[#800000]">ADD FACULTY</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={handleCloseFacultyModal} // Close the modal
                  >
                    ✕
                  </button>
                </div>
                <form>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      First Name <span className="text-[#800000]">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Enter last name"
                    />
                     
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Last Name <span className="text-[#800000]">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Enter last name"
                      />
                  </div>
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Email <span className="text-[#800000]">*</span></label>
                      <input
                        type="email"
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Position</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Enter position"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded"
                        placeholder="Enter department"
                      />
                    </div>
                    <div className="mb-4">
                      {/* <label className="block text-sm font-medium text-gray-700">Employment Status *</label> */}
                      <label htmlFor="employmentStatus" className="block text-sm font-medium text-gray-700">
                        Employment Status <span className="text-[#800000]">*</span>
                      </label>
                      <select id="employmentStatus" className="w-full p-2 border border-gray-300 rounded">
                        <option value="Regular">Regular</option>
                        <option value="Probationary">Probationary</option>
                        <option value="Part-Time">Part-Time</option>
                      </select>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Start Date <span className="text-[#800000]">*</span></label>
                        <input
                          type="date"
                          className="w-full p-2 border border-gray-300 rounded"
                          title="Select start date"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input type="date" className="w-full p-2 border border-gray-300 rounded" title="Select end date" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Upload Picture <span className="text-[#800000]">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".jpg,.png"
                        className="w-full p-2 border border-gray-300 rounded"
                        title="Upload a picture (JPG or PNG)"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked/>
                        Create a User Account
                      </label>
                    </div>
                  <button
                    type="submit"
                    className="w-full bg-[#800000] text-white font-semibold py-2 rounded hover:bg-red-800"
                    onClick={() => handleCloseFacultyModal} // Close the modal
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Document Management View */}
      {activeView === 'documentManagement' && (
        <>
      {/* Main box */}
      <div className="bg-white border border-[#800000] rounded-lg p-4 w-full shadow">
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

        {/* Table */}
        <table className="w-full text-sm text-left border border-gray-300">
          <thead className="bg-gray-100 text-black font-semibold">
            <tr>
              <th className="px-4 py-2 border">#</th>
              <th className="px-4 py-2 border">Faculty ID</th>
              <th className="px-4 py-2 border">Image</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">List of Documents</th>
              <th className="px-4 py-2 border flex justify-between items-center">
                <span>Submission Status</span>
                <Filter size={16} className="ml-2 cursor-pointer" />
              </th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                id: 1,
                facultyId: '2025-0001-SJSFI',
                image: '/womanavatar.png',
                name: 'Maria Reyes',
                documents: '5/5',
                status: 'Complete',
                date: '3/10/25',
                statusColor: 'text-green-600',
              },
              {
                id: 2,
                facultyId: '2025-0002-SJSFI',
                image: '/manavatar2.png',
                name: 'John Dela Cruz',
                documents: '3/5',
                status: 'Incomplete',
                date: '3/10/25',
                statusColor: 'text-gray-700',
              },
              {
                id: 3,
                facultyId: '2025-0003-SJSFI',
                image: '/womanavatar2.png',
                name: 'Angela Santos',
                documents: '0/5',
                status: 'Pending',
                date: '3/10/25',
                statusColor: 'text-red-600',
              },
            ].map((item, index) => (
              <tr key={index} className="text-black text-sm">
                <td className="px-4 py-2 border text-center">{item.id}</td>
                <td className="px-4 py-2 border">{item.facultyId}</td>
                <td className="px-4 py-2 border">
                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-full object-cover mx-auto" />
                </td>
                <td className="px-4 py-2 border">{item.name}</td>
                <td className="px-4 py-2 border">Submitted: {item.documents}</td>
                <td className="px-4 py-2 border">
                  <span className={`${item.statusColor} font-medium`}>{item.status}</span>
                  <div className="text-xs text-gray-500">{item.date}</div>
                </td>
                <td className="px-4 py-2 border flex items-center gap-2 justify-center">
                  <button className="bg-yellow-400 hover:bg-yellow-300 text-black text-xs px-2 py-1 rounded">
                    Remind
                  </button>
                  <Trash2 className="text-gray-600 cursor-pointer" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
          {/* Add Document Modal */}
          {isDocumentModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-[#800000]">ADD DOCUMENT</h2>
                </div>
                <form>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Document Name *</label>
                      <input
                        type="text"
                        placeholder="LastName_New Contract"
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Document Type *</label>
                      <select className="w-full p-2 border border-gray-300 rounded">
                        <option>Contract</option>
                        <option>Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">To be Submitted By *</label>
                      <select className="w-full p-2 border border-gray-300 rounded">
                        <option>All Faculty</option>
                        <option>Specific Faculty</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Add a Due Date</label>
                      <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Accepted File Types *</label>
                      <div className="flex items-center space-x-4">
                        <label>
                          <input type="checkbox" className="mr-2" /> PDF
                        </label>
                        <label>
                          <input type="checkbox" className="mr-2" /> DOC(X)
                        </label>
                        <label>
                          <input type="checkbox" className="mr-2" /> JPEG, PNG
                        </label>
                        <label>
                          <input type="checkbox" className="mr-2" /> CSV, XLS(X)
                        </label>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Add Instruction/Note</label>
                      <textarea
                        placeholder="Type something..."
                        className="w-full p-2 border border-gray-300 rounded"
                      ></textarea>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 space-x-4">
                    <button
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                      onClick={() => handleCloseDocumentModal} // Close the modal
                    >
                      Cancel
                    </button>
                    <button
                      className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-800"
                      onClick={() => handleCloseDocumentModal} // Close the modal

                    >
                      Save
                    </button>
                  </div>
                </form>

                 
              </div>
            </div>
          // </div>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyContent;