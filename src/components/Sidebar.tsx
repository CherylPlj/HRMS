// components/Sidebar.tsx
import { FaChalkboardTeacher, FaCalendarCheck, FaUserPlus, FaSignOutAlt, FaFileAlt } from 'react-icons/fa';

const Sidebar = () => {
  return (
    <div className="w-64 bg-red-900 h-screen text-white flex flex-col">
      <div className="text-center py-4 font-bold text-xl border-b border-white">FACULTY</div>
      <div className="p-4 space-y-4">
        <button className="flex items-center space-x-2 hover:text-yellow-300">
          <FaChalkboardTeacher /><span>Faculty</span>
        </button>
        <button className="flex items-center space-x-2 hover:text-yellow-300">
          <FaCalendarCheck /><span>Attendance</span>
        </button>
        <button className="flex items-center space-x-2 hover:text-yellow-300">
          <FaFileAlt /><span>Leave</span>
        </button>
        <button className="flex items-center space-x-2 hover:text-yellow-300">
          <FaUserPlus /><span>Users</span>
        </button>
        <div className="mt-auto">
          <button className="flex items-center space-x-2 hover:text-yellow-300">
            <FaSignOutAlt /><span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;