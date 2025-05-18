"use client";
import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import DashboardFaculty from '@/components/DashboardFaculty';
import PersonalData from '@/components/PersonalData';
import DocumentsFaculty from '@/components/DocumentsFaculty';
import AttendanceFaculty from '@/components/AttendanceFaculty';
import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';
import { useRouter } from 'next/navigation'; // <-- Add this
import { AttendanceProvider } from '@/contexts/AttendanceContext';


export default function Dashboard() {
  const [activeButton, setActiveButton] = useState('dashboard');
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const { user, isLoaded, isSignedIn } = useUser(); // Get user data from Clerk
  const { signOut } = useClerk(); // Access Clerk's signOut function
  const router = useRouter();

  const chatbotRef = useRef<HTMLDivElement | null>(null);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 0, y: 0 });

  const handleDragStart = (e: React.MouseEvent) => {
    const chatbot = chatbotRef.current;
    if (!chatbot) return;

    const offsetX = e.clientX - chatbot.getBoundingClientRect().left;
    const offsetY = e.clientY - chatbot.getBoundingClientRect().top;

    const handleDrag = (moveEvent: MouseEvent) => {
      setChatbotPosition({
        x: moveEvent.clientX - offsetX,
        y: moveEvent.clientY - offsetY,
      });
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleSendMessage = (message: string) => {
    if (message.trim()) {
      setChatMessages([...chatMessages, message]);
      setChatInput('');
    }
  };

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
    <AttendanceProvider>
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
                    onClick={() => setChatbotVisible(!isChatbotVisible)}
                  >
                    <i className="fas fa-comments text-black text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Notifications"
                    onClick={() => setNotificationsVisible(!isNotificationsVisible)}
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

      {/* Notifications Popup */}
      {isNotificationsVisible && (
        <div className="absolute top-16 right-4 bg-white shadow-xl rounded-lg w-96 z-50 border border-gray-200">
          <div className="p-4 bg-gray-100 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setNotificationsVisible(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="flex border-b">
            <button
              className={`flex-1 p-2 text-center ${activeTab === 'all' ? 'text-red-700 font-bold border-b-2 border-red-700' : 'text-gray-500'}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`flex-1 p-2 text-center ${activeTab === 'unread' ? 'text-red-700 font-bold border-b-2 border-red-700' : 'text-gray-500'}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-200">
            {activeTab === 'all' && (
              <>
                <li className="p-4 hover:bg-gray-50">
                  <p className="text-sm text-gray-700">
                    Jane Smith just sent a request: <strong>"URGENT!! - leave of absence due to family emergency".</strong>
                  </p>
                  <span className="text-xs text-gray-500">11h ago</span>
                </li>
                <li className="p-4 hover:bg-gray-50">
                  <p className="text-sm text-gray-700">
                    Doc Anne just sent a request: <strong>"Request for change in class schedule".</strong>
                  </p>
                  <span className="text-xs text-gray-500">22h ago</span>
                </li>
                <li className="p-4 hover:bg-gray-50">
                  <p className="text-sm text-gray-700">
                    Zayne Ghaz has sent you a request to change their password.
                  </p>
                  <span className="text-xs text-gray-500">1d ago</span>
                </li>
              </>
            )}
            {activeTab === 'unread' && (
              <>
                <li className="p-4 hover:bg-gray-50">
                  <p className="text-sm text-gray-700">
                    Jane Smith just sent a request: <strong>"URGENT!! - leave of absence due to family emergency".</strong>
                  </p>
                  <span className="text-xs text-gray-500">11h ago</span>
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Add Chatbot Popup */}
      {isChatbotVisible && (
        <div
          ref={chatbotRef}
          className="fixed bg-white shadow-lg rounded-lg z-50 border border-gray-200"
          style={{
            width: 320,
            height: 400,
            top: chatbotPosition.y,
            left: chatbotPosition.x,
          }}
        >
          <div
            className="p-4 bg-[#800000] text-white flex items-center justify-between rounded-t-lg cursor-move"
            onMouseDown={handleDragStart}
          >
            <h3 className="text-lg font-semibold">SJSFI Chatbot</h3>
            <button
              className="text-white hover:text-gray-300"
              onClick={() => setChatbotVisible(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="flex flex-col h-[calc(100%-48px)]">
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className="bg-gray-100 text-gray-800 p-2 rounded-lg shadow-md text-sm"
                >
                  {message}
                </div>
              ))}
            </div>
            <div className="p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Suggested chat prompts</h4>
              <ul className="space-y-2">
                <li
                  className="text-sm text-gray-600 hover:text-red-700 cursor-pointer"
                  onClick={() => handleSendMessage("How do I request a change in my teaching schedule?")}
                >
                  How do I request a change in my teaching schedule?
                </li>
                <li
                  className="text-sm text-gray-600 hover:text-red-700 cursor-pointer"
                  onClick={() => handleSendMessage("How do I add a new faculty profile?")}
                >
                  How do I add a new faculty profile?
                </li>
                <li
                  className="text-sm text-gray-600 hover:text-red-700 cursor-pointer"
                  onClick={() => handleSendMessage("Where is the campus located?")}
                >
                  Where is the campus located?
                </li>
              </ul>
            </div>
            <div className="p-3 border-t">
              <div className="flex items-center space-x-2 px-1">
                <input
                  type="text"
                  placeholder="Write a question..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none text-sm"
                />
                <button
                  className="px-3 py-2 bg-[#800000] text-white rounded hover:bg-red-700 text-sm whitespace-nowrap"
                  onClick={() => handleSendMessage(chatInput)}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AttendanceProvider>
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