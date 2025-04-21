import { FaTrash, FaPen, FaDownload, FaPlus, FaFile, FaFilter } from 'react-icons/fa';

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
    image: '/avatar1.png'
  },
  {
    id: '2025-0002-SJSFI',
    name: 'John Dela Cruz',
    position: 'Secondary English Teacher',
    department: 'English',
    status: 'Regular',
    image: '/avatar2.png'
  },
  {
    id: '2025-0003-SJSFI',
    name: 'Angela Santos',
    position: 'Secondary Science Teacher',
    department: 'Science',
    status: 'Regular',
    image: '/avatar3.png'
  }
];

const FacultyTable = () => {
  return (
    <div className="flex-1 p-6 bg-white">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Faculty Management</h2>
        <div className="space-x-2">
          <button className="bg-red-700 text-white px-4 py-2 rounded"><FaFile className="inline mr-1" /> Documents</button>
          <button className="bg-red-700 text-white px-4 py-2 rounded"><FaDownload className="inline mr-1" /> Download</button>
          <button className="bg-red-700 text-white px-4 py-2 rounded"><FaPlus className="inline mr-1" /> Add Faculty</button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search..."
        className="w-full p-2 border border-red-400 rounded mb-4"
      />

      <table className="w-full text-left border border-red-200">
        <thead className="bg-gray-100">
          <tr>
            <th>#</th>
            <th>Faculty ID</th>
            <th>Image</th>
            <th>Name</th>
            <th>Position</th>
            <th>Department</th>
            <th>Employment Status</th>
            <th><FaFilter /></th>
          </tr>
        </thead>
        <tbody>
          {facultyData.map((faculty, index) => (
            <tr key={faculty.id} className="border-b">
              <td>{index + 1}</td>
              <td>{faculty.id}</td>
              <td><img src={faculty.image} className="w-8 h-8 rounded-full" alt="avatar" /></td>
              <td>{faculty.name}</td>
              <td>{faculty.position}</td>
              <td>{faculty.department}</td>
              <td>{faculty.status}</td>
              <td className="space-x-2">
                <button className="text-blue-600" title="Edit"><FaPen /></button>
                <button className="text-red-600" title="Delete"><FaTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FacultyTable;
