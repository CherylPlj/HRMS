"use client";
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import DashboardFaculty from '@/components/DashboardFaculty';
import PersonalData from '@/components/PersonalData';
import DocumentsFaculty from '@/components/DocumentsFaculty';
import AttendanceFaculty from '@/components/AttendanceFaculty';
import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';
import { useRouter } from 'next/navigation'; // <-- Add this


export default function Dashboard() {
  const [activeButton, setActiveButton] = useState('dashboard');
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const { user, isLoaded, isSignedIn } = useUser(); // Get user data from Clerk
  const { signOut } = useClerk(); // Access Clerk's signOut function
  const router = useRouter();


  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName);
  };

  const handleLogout = async () => {
    try {
      await signOut(); // Properly end the session
      console.log('User logged out');
      setActiveButton('dashboard'); // Reset state
      setLogoutModalVisible(false);
      router.push('/'); // Redirect to the landing page
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const renderContent = () => {
    switch (activeButton) {
      case 'dashboard':
        return <DashboardFaculty />;
      case 'personal-data':
        return <PersonalData />;
      case 'documents':
        return <DocumentsFaculty />;
      case 'attendance':
        return <AttendanceFaculty />;
      case 'leave':
        return <LeaveRequestFaculty />;
      default:
        return <div>Select a menu item to view its content.</div>;
    }
  };

  return (
    <>
      <Head>
        <title>Faculty Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
        {/* Sidebar */}
        <div className="bg-white w-20 p-4 flex flex-col justify-between border-r border-gray-200">
          <div>
            <img src="/sjsfilogo.png" alt="Logo" className="w-10 h-10 mx-auto mb-6" />
            <nav className="space-y-6">
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'dashboard' ? 'text-[#800000]' : 'text-black'
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
                  activeButton === 'personal-data' ? 'text-[#800000]' : 'text-black'
                }`}
                title="Personal Data"
                onClick={() => handleButtonClick('personal-data')}
              >
                <i className="fas fa-user text-xl"></i>
                <span className="text-[10px] whitespace-nowrap">Personal Data</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'documents' ? 'text-[#800000]' : 'text-black'
                }`}
                title="Documents"
                onClick={() => handleButtonClick('documents')}
              >
                <i className="fas fa-file-alt text-xl"></i>
                <span className="text-[10px]">Documents</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'attendance' ? 'text-[#800000]' : 'text-black'
                }`}
                title="Attendance"
                onClick={() => handleButtonClick('attendance')}
              >
                <i className="fas fa-calendar-check text-xl"></i>
                <span className="text-[10px]">Attendance</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${
                  activeButton === 'leave' ? 'text-[#800000]' : 'text-black'
                }`}
                title="Leave Request"
                onClick={() => handleButtonClick('leave')}
              >
                <i className="fas fa-envelope text-xl"></i>
                <span className="text-[10px] whitespace-nowrap">Leave Request</span>
              </a>
            </nav>
          </div>
          <a
            href="#"
            className={`flex flex-col items-center ${
              activeButton === 'logout' ? 'text-[#800000]' : 'text-black'
            }`}
            title="Log Out"
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
            <h1 className="text-xl font-bold text-[#800000]">DASHBOARD</h1> */}
            <div className="bg-white shadow-md p-4 mb-6 flex items-center justify-between">
              <h1 className="text-xl font-bold text-[#800000]">
                {activeButton === 'dashboard' && 'DASHBOARD'}
                {activeButton === 'personal-data' && 'PERSONAL DATA'}
                {activeButton === 'documents' && 'DOCUMENTS'}
                {activeButton === 'attendance' && 'ATTENDANCE'}
                {activeButton === 'leave' && 'LEAVE REQUEST'}
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
                {isLoaded && isSignedIn && user ? (
                  <a
                    href="#"
                    className="flex flex-col text-black hover:text-red-700 transition"
                    title="User Profile"
                  >
                    <div className="font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-xs">{user.emailAddresses[0]?.emailAddress}</div>
                  </a>
                ) : (
                  <div>Loading user info...</div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderContent()}
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
                onClick={() => setLogoutModalVisible(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-[#800000]"
                onClick={handleLogout}
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

// "use client";

// import Head from 'next/head';
// import { useRouter } from 'next/navigation';
// import { useState } from 'react';
// import DashboardFaculty from '@/components/DashboardFaculty';
// import PersonalData from '@/components/PersonalData';
// import DocumentsFaculty from '@/components/DocumentsFaculty';
// import AttendanceFaculty from '@/components/AttendanceFaculty';
// import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';

// export default function FacultyDashboard() {
//   const [activeButton, setActiveButton] = useState('dashboard'); // Default active button
//   const [isLogoutModalVisible, setLogoutModalVisible] = useState(false); // State for logout modal
//   const router = useRouter();

//   const handleButtonClick = (buttonName: string) => {
//     setActiveButton(buttonName); // Set the clicked button as active
//   };

//   const handleLogout = () => {
//     console.log('User logged out'); // Perform logout logic here
//     setLogoutModalVisible(false); // Close the modal
//     router.push('/'); // Redirect to the login page
//   };

//   const renderContent = () => {
//     switch (activeButton) {
//       case 'dashboard':
//         return <DashboardFaculty />;
//       case 'personal-data':
//         return <PersonalData />;
//       case 'documents':
//         return <DocumentsFaculty />;
//       case 'attendance':
//         return <AttendanceFaculty />;
//       case 'leave':
//         return <LeaveRequestFaculty />;
//       default:
//         return <div>Select a menu item to view its content.</div>;
//     }
//   };

//   return (
//     <>
//       <Head>
//         <title>Faculty Dashboard</title>
//         <script src="https://cdn.tailwindcss.com"></script>
//         <link
//           rel="stylesheet"
//           href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
//         />
//       </Head>
//       <div className="flex h-screen bg-gray-100 font-sans">
//         {/* Sidebar */}
//         <div className="bg-white w-20 p-4 flex flex-col justify-between border-r border-gray-200">
//           <div>
//             <img src="/sjsfilogo.png" alt="Logo" className="w-10 h-10 mx-auto mb-6" />
//             <nav className="space-y-6">
//               <a
//                 href="#"
//                 className={`flex flex-col items-center ${
//                   activeButton === 'dashboard' ? 'text-[#800000]' : 'text-black'
//                 }`}
//                 title="Dashboard"
//                 onClick={() => handleButtonClick('dashboard')}
//               >
//                 <i className="fas fa-tachometer-alt text-xl"></i>
//                 <span className="text-[10px]">Dashboard</span>
//               </a>
//               <a
//                 href="#"
//                 className={`flex flex-col items-center ${
//                   activeButton === 'personal-data' ? 'text-[#800000]' : 'text-black'
//                 }`}
//                 title="Personal Data"
//                 onClick={() => handleButtonClick('personal-data')}
//               >
//                 <i className="fas fa-user text-xl"></i>
//                 <span className="text-[10px] whitespace-nowrap">Personal Data</span>
//               </a>
//               <a
//                 href="#"
//                 className={`flex flex-col items-center ${
//                   activeButton === 'documents' ? 'text-[#800000]' : 'text-black'
//                 }`}
//                 title="Documents"
//                 onClick={() => handleButtonClick('documents')}
//               >
//                 <i className="fas fa-file-alt text-xl"></i>
//                 <span className="text-[10px]">Documents</span>
//               </a>
//               <a
//                 href="#"
//                 className={`flex flex-col items-center ${
//                   activeButton === 'attendance' ? 'text-[#800000]' : 'text-black'
//                 }`}
//                 title="Attendance"
//                 onClick={() => handleButtonClick('attendance')}
//               >
//                 <i className="fas fa-calendar-check text-xl"></i>
//                 <span className="text-[10px]">Attendance</span>
//               </a>
//               <a
//                 href="#"
//                 className={`flex flex-col items-center ${
//                   activeButton === 'leave' ? 'text-[#800000]' : 'text-black'
//                 }`}
//                 title="Leave Request"
//                 onClick={() => handleButtonClick('leave')}
//               >
//                 <i className="fas fa-envelope text-xl"></i>
//                 <span className="text-[10px] whitespace-nowrap">Leave Request</span>
//               </a>
//             </nav>
//           </div>
//           <a
//             href="#"
//             className={`flex flex-col items-center ${
//               activeButton === 'logout' ? 'text-[#800000]' : 'text-black'
//             }`}
//             title="Log Out"
//             onClick={() => setLogoutModalVisible(true)} // Show the logout modal
//           >
//             <i className="fas fa-sign-out-alt text-xl"></i>
//             <span className="text-[10px]">Log Out</span>
//           </a>
//         </div>
//  {/* Header and Main Content */}
//  <div className="flex flex-col flex-1">
//           {/* Header Container */}
//           {/* <div className="bg-white shadow-md p-4 mb-6 flex items-center justify-between">
//             <h1 className="text-xl font-bold text-red-700">DASHBOARD</h1> */}
//             <div className="bg-white shadow-md p-4 mb-6 flex items-center justify-between">
//               <h1 className="text-xl font-bold text-red-700">
//                 {activeButton === 'dashboard' && 'DASHBOARD'}
//                 {activeButton === 'personal-data' && 'PERSONAL DATA'}
//                 {activeButton === 'documents' && 'DOCUMENTS'}
//                 {activeButton === 'attendance' && 'ATTENDANCE'}
//                 {activeButton === 'leave' && 'LEAVE REQUEST'}
//               </h1>
//             {/* </div> */}
//             <div className="flex items-center space-x-4">
//               <div className="flex items-center space-x-6">
//                 {/* Icons Section */}
//                 <div className="flex items-center space-x-4">
//                   <a
//                     href="#"
//                     className="p-2 rounded-full hover:bg-gray-200 transition"
//                     title="Comments"
//                   >
//                     <i className="fas fa-comments text-black text-lg"></i>
//                   </a>
//                   <a
//                     href="#"
//                     className="p-2 rounded-full hover:bg-gray-200 transition"
//                     title="Notifications"
//                   >
//                     <i className="fas fa-bell text-black text-lg"></i>
//                   </a>
//                   <a
//                     href="#"
//                     className="p-2 rounded-full hover:bg-gray-200 transition"
//                     title="Profile"
//                   >
//                     <i className="fas fa-user-circle text-black text-lg"></i>
//                   </a>
//                 </div>
//                 {/* User Information Section */}
//                 <a
//                   href="#"
//                   className="flex flex-col text-black hover:text-red-700 transition"
//                   title="User Profile"
//                 >
//                   <div className="font-semibold">Jane Smith</div>
//                   <div className="text-xs">2025-0001-SJSFI</div>
//                 </a>
//               </div>
//             </div>
//           </div>
//           {/* Main Content */}
//           <div className="flex-1 p-6">
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {renderContent()} {/* Render the content dynamically based on activeButton */}

//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Logout Confirmation Modal */}
//       {isLogoutModalVisible && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-6 rounded-lg shadow-lg w-96">
//             <h2 className="text-xl text-center font-bold text-red-700 mb-4">LOGOUT</h2>
//             <p className="text-gray-700 text-center mb-6">Are you sure you want to logout?</p>
//             <div className="flex justify-center space-x-10">
//               <button
//                 className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
//                 onClick={() => setLogoutModalVisible(false)} // Close the modal
//               >
//                 Cancel
//               </button>
//               <button
//                 className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
//                 onClick={handleLogout} // Perform logout
//               >
//                 Logout
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }