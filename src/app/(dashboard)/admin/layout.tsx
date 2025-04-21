"use client";
import Head from 'next/head';
import { useState } from 'react';
import DashboardContent from '@/components/DashboardContent';
import FacultyContent from '@/components/FacultyContent';
import AttendanceContent from '@/components/AttendanceContent';
import LeaveContent from '@/components/LeaveContent';
import UsersContent from '@/components/UsersContent';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [activeButton, setActiveButton] = useState('dashboard'); // Default to 'dashboard'
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false); // State for logout modal

  const router = useRouter();

  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName); // Set the clicked button as active
  };
  const handleLogout = () => {
    console.log('User logged out'); // Perform logout logic here
    setLogoutModalVisible(false); // Close the modal
    router.push('/'); // Redirect to the login page

  };

  const renderContent = () => {
    switch (activeButton) {
      case 'dashboard':
        return <DashboardContent />;
      case 'faculty':
        return <FacultyContent />;
      case 'attendance':
        return <AttendanceContent />;
      case 'leave':
        return <LeaveContent />;
      case 'users':
        return <UsersContent />;
      default:
        return <div>Select a menu item to view its content.</div>;
    }
  };

  return (
    <>
      <Head>
        <title>Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
        {/* Sidebar */}
        <div className="bg-red-800 text-white w-20 p-4 flex flex-col items-center">
          <div className="mb-4">
            <img
              src="/sjsfilogo.png"
              alt="Logo"
              className="w-10 h-10 mx-auto mb-6"
            />
            <nav className="space-y-6">
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'dashboard' ? 'text-yellow-500' : 'text-white'
                }`}
                title="Dashboard"
                onClick={() => handleButtonClick('dashboard')}
              >
                <i className="fas fa-tachometer-alt text-xl"></i>
                <span className="text-[10px]">Dashboard</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'faculty' ? 'text-yellow-500' : 'text-white'
                }`}
                title="Faculty"
                onClick={() => handleButtonClick('faculty')}
              >
                <i className="fas fa-user text-xl"></i>
                <span className="text-[10px]">Faculty</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'attendance' ? 'text-yellow-500' : 'text-white'
                }`}
                title="Attendance"
                onClick={() => handleButtonClick('attendance')}
              >
                <i className="fas fa-calendar-alt text-xl"></i>
                <span className="text-[10px]">Attendance</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'leave' ? 'text-yellow-500' : 'text-white'
                }`}
                title="Leave"
                onClick={() => handleButtonClick('leave')}
              >
                <i className="fas fa-clipboard"></i>
                <span className="text-[10px]">Leave</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'users' ? 'text-yellow-500' : 'text-white'
                }`}
                title="Users"
                onClick={() => handleButtonClick('users')}
              >
                <i className="fas fa-users text-xl"></i>
                <span className="text-[10px]">Users</span>
              </a>
            </nav>
          </div>
          <a
            href="#"
            className={`flex flex-col items-center mt-auto ${
              activeButton === 'logout' ? 'text-yellow-500' : 'text-white'
            }`}
            title="Log Out"
            // onClick={() => handleButtonClick('logout')}
            onClick={() => setLogoutModalVisible(true)} // Show the logout modal
          >
            <i className="fas fa-sign-out-alt text-xl"></i>
            <span className="text-[10px]">Log Out</span>
          </a>
        </div>
        
      {/* Header and Main Content */}
        <div className="flex flex-col flex-1">
          {/* Header Container */}
          {/* <div className="bg-white shadow-md p-4 mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-red-700">DASHBOARD</h1> */}
            <div className="bg-white shadow-md p-4 mb-6 flex items-center justify-between">
              <h1 className="text-xl font-bold text-red-700">
                {activeButton === 'dashboard' && 'DASHBOARD'}
                {activeButton === 'faculty' && 'FACULTY'}
                {activeButton === 'attendance' && 'ATTENDANCE'}
                {activeButton === 'leave' && 'LEAVE'}
                {activeButton === 'users' && 'USERS'}
              </h1>
            {/* </div> */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6">
                {/* Icons Section */}
                <div className="flex items-center space-x-4">
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Comments"
                  >
                    <i className="fas fa-comments text-black text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Notifications"
                  >
                    <i className="fas fa-bell text-black text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Profile"
                  >
                    <i className="fas fa-user-circle text-black text-lg"></i>
                  </a>
                </div>
                {/* User Information Section */}
                <a
                  href="#"
                  className="flex flex-col text-black hover:text-red-700 transition"
                  title="User Profile"
                >
                  <div className="font-semibold">Jane Smith</div>
                  <div className="text-xs">Admin1-SJSFI</div>
                </a>
              </div>
            </div>
          </div>
          {/* Main Content */}
          <div className="flex-1 p-6">
            
            {renderContent()} {/* Render the content dynamically based on activeButton */}
  
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl text-center font-bold text-red-700 mb-4">LOGOUT</h2>
            <p className="text-gray-700 text-center mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-center space-x-10">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => setLogoutModalVisible(false)} // Close the modal
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
                onClick={handleLogout} // Perform logout
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
  