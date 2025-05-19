"use client";
import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'; // Import useRef for drag and resize functionality
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import DashboardContent from '@/components/DashboardContent';
import FacultyContent from '@/components/FacultyContent';
import AttendanceContent from '@/components/AttendanceContent';
import LeaveContent from '@/components/LeaveContent';
import UsersContent from '@/components/UsersContent';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [activeButton, setActiveButton] = useState('dashboard');
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isAdminInfoVisible, setAdminInfoVisible] = useState(false); // State for Admin Info Modal
  const [isEditProfileVisible, setEditProfileVisible] = useState(false); // State for Edit Profile Modal
  const [phoneNumber, setPhoneNumber] = useState(''); // Editable phone number
  const [address, setAddress] = useState(''); // Editable address
  const [isNotificationsVisible, setNotificationsVisible] = useState(false); // State for Notifications Popup
  const [activeTab, setActiveTab] = useState('all'); // State for active tab in notifications
  const [isChatbotVisible, setChatbotVisible] = useState(false); // State for Chatbot Popup
  const [chatMessages, setChatMessages] = useState<string[]>([]); // State for chatbot messages
  const [chatInput, setChatInput] = useState(''); // State for chatbot input
  const { user, isLoaded, isSignedIn } = useUser(); // Get user data from Clerk
  const { signOut } = useClerk(); // Access Clerk's signOut function
  const router = useRouter();

  const chatbotRef = useRef<HTMLDivElement | null>(null); // Ref for chatbot popup
  const [chatbotPosition, setChatbotPosition] = useState({ x: 0, y: 0 }); // State for chatbot position

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
      setChatMessages([...chatMessages, message]); // Add message to chat
      setChatInput(''); // Clear input
    }
  };

  // Redirect to admin layout if user is an admin
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userRole = user.publicMetadata?.role;

      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'faculty') {
        router.push('/faculty-dashboard');
      }
      // Else: stay on dashboard
    }
  }, [isLoaded, isSignedIn, user, router]);

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

  const handleSave = () => {
    console.log('Saved profile:', { phoneNumber, address });
    setEditProfileVisible(false); // Close the Edit Profile modal after saving
    setAdminInfoVisible(true); // Reopen the Admin Info modal after saving
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
        {/* <script src="https://cdn.tailwindcss.com"></script> */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
      </Head>
      <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
        {/* Sidebar */}
        <div className="bg-[#800000] text-white w-20 p-4 flex flex-col items-center">
            <Image
              src="/sjsfilogo.png"
              alt="Logo"
              width={40}
              height={40}
              className="w-10 h-10 mx-auto mb-6"
            />
          
            <nav className="space-y-6">
              <a
                href="#"
                className={`flex flex-col items-center ${activeButton === 'dashboard' ? 'text-[#ffd700]' : 'text-white'}`}
                title="Dashboard"
                onClick={() => handleButtonClick('dashboard')}
              >
                <i className="fas fa-tachometer-alt text-xl"></i>
                <span className="text-[10px]">Home</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${activeButton === 'faculty' ? 'text-[#ffd700]' : 'text-white'}`}
                title="Faculty"
                onClick={() => handleButtonClick('faculty')}
              >
                <i className="fas fa-user text-xl"></i>
                <span className="text-[10px]">Faculty</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${activeButton === 'attendance' ? 'text-[#ffd700]' : 'text-white'}`}
                title="Attendance"
                onClick={() => handleButtonClick('attendance')}
              >
                <i className="fas fa-calendar-alt text-xl"></i>
                <span className="text-[10px]">Attendance</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${activeButton === 'leave' ? 'text-[#ffd700]' : 'text-white'}`}
                title="Leave"
                onClick={() => handleButtonClick('leave')}
              >
                <i className="fas fa-clipboard text-xl"></i>
                <span className="text-[10px]">Leave</span>
              </a>
              <a
                href="#"
                className={`flex flex-col items-center ${activeButton === 'users' ? 'text-[#ffd700]' : 'text-white'}`}
                title="Users"
                onClick={() => handleButtonClick('users')}
              >
                <i className="fas fa-users text-xl"></i>
                <span className="text-[10px]">Users</span>
              </a>
            </nav>
          {/* </div> */}
          <a
            href="#"
            className={`flex flex-col items-center mt-auto ${activeButton === 'logout' ? 'text-[#ffd700]' : 'text-white'}`}
            title="Log Out"
            onClick={() => setLogoutModalVisible(true)} // Show the logout modal
          >
            <i className="fas fa-sign-out-alt text-xl"></i>
            <span className="text-[10px]">Log Out</span>
          </a>
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-1">
          {/* Header */}
          <div className="bg-white shadow-md p-4 mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-red-700">
              {activeButton === 'dashboard' && 'DASHBOARD'}
              {activeButton === 'faculty' && 'FACULTY'}
              {activeButton === 'attendance' && 'ATTENDANCE'}
              {activeButton === 'leave' && 'LEAVE'}
              {activeButton === 'users' && 'USERS'}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6">
                {/* Icons Section */}
                <div className="flex items-center space-x-4">
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Comments"
                    onClick={() => setChatbotVisible(!isChatbotVisible)} // Toggle Chatbot Popup
                  >
                    <i className="fas fa-comments text-black text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Notifications"
                    onClick={() => setNotificationsVisible(!isNotificationsVisible)} // Toggle Notifications Popup
                  >
                    <i className="fas fa-bell text-black text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Profile"
                    onClick={() => setAdminInfoVisible(true)} // Open Admin Info Modal on profile icon click
                  >
                    <i className="fas fa-user-circle text-black text-lg"></i>
                  </a>
                </div>
                {/* User Information */}
                {isLoaded && isSignedIn && user ? (
                  <div className="flex flex-col text-black">
                    <div className="font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-xs">{user.emailAddresses[0]?.emailAddress}</div>
                  </div>
                ) : (
                  <div>Loading user info...</div>
                )}
              </div>
            </div>
          </div>

          {/* Notifications Popup */}
          {isNotificationsVisible && (
            <div className="absolute top-16 right-4 bg-white shadow-xl rounded-lg w-96 z-50 border border-gray-200">
              <div className="p-4 bg-gray-100 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                
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
                        Jane Smith just sent a request: <strong>“URGENT!! - leave of absence due to family emergency”.</strong>
                      </p>
                      <span className="text-xs text-gray-500">11h ago</span>
                    </li>
                    <li className="p-4 hover:bg-gray-50">
                      <p className="text-sm text-gray-700">
                        Doc Anne just sent a request: <strong>“Request for change in class schedule”.</strong>
                      </p>
                      <span className="text-xs text-gray-500">22h ago</span>
                    </li>
                    <li className="p-4 hover:bg-gray-50">
                      <p className="text-sm text-gray-700">
                        Zayne Ghaz has sent you a request to change their password.
                      </p>
                      <span className="text-xs text-gray-500">1d ago</span>
                    </li>
                    {/* Add more notifications for "All" */}
                  </>
                )}
                {activeTab === 'unread' && (
                  <>
                    <li className="p-4 hover:bg-gray-50">
                      <p className="text-sm text-gray-700">
                        Jane Smith just sent a request: <strong>“URGENT!! - leave of absence due to family emergency”.</strong>
                      </p>
                      <span className="text-xs text-gray-500">11h ago</span>
                    </li>
                    {/* Add more notifications for "Unread" */}
                  </>
                )}
              </ul>
              <div className="p-4 bg-gray-100 text-center">
                <button
                  className="text-red-600 font-semibold hover:underline"
                  onClick={() => setNotificationsVisible(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Chatbot Popup */}
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
                onMouseDown={handleDragStart} // Enable dragging
              >
                <h3 className="text-lg font-semibold">SJSFI Chatbot</h3>
                <button
                  title='Close Chatbot'
                  className="text-white hover:text-gray-300"
                  onClick={() => setChatbotVisible(false)} // Close Chatbot Popup
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
                <div className="p-4 border-t flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Write a question..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none"
                  />
                  <button
                    className="px-4 py-2 bg-[#800000] text-white rounded hover:bg-red-700"
                    onClick={() => handleSendMessage(chatInput)} // Send input message
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

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

      {/* Admin Info Modal */}
      {isAdminInfoVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl text-center font-bold text-red-700 mb-4">Admin Information</h2>
            <p className="text-gray-700 text-center mb-6">
              Name: {user?.firstName} {user?.lastName}
              <br />
              Email: {user?.emailAddresses[0]?.emailAddress}
              <br />
              Phone: {phoneNumber || "Not provided"}
              <br />
              Address: {address || "Not provided"}
            </p>
            <button
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 w-full mt-4"
              onClick={() => setEditProfileVisible(true)}
            >
              Edit Profile
            </button>
            <div className="flex justify-center space-x-10 mt-4">
              <button
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-[#800000]"
                onClick={() => setAdminInfoVisible(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl text-center font-bold text-red-700 mb-4">Edit Profile</h2>
            <p className="text-gray-700 text-center mb-2">
              Name: {user?.firstName} {user?.lastName}
              <br />
              Email: {user?.emailAddresses[0]?.emailAddress}
            </p>
            <div className="flex flex-col space-y-4 mt-4">
              <input
                type="text"
                placeholder="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded"
              />
              <textarea
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex justify-center space-x-10 mt-6">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => setEditProfileVisible(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-[#800000]"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}