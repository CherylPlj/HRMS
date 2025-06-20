"use client";
import Head from 'next/head';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'; // Import useRef for drag and resize functionality
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import DashboardContent from '@/components/DashboardContent';
import FacultyContent from '@/components/FacultyContent';
import AttendanceContent from '@/components/AttendanceContent';
import LeaveContent from '@/components/LeaveContent';
import UsersContent from '@/components/UsersContent';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@clerk/nextjs'; // Add this import

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
}

interface FacultyData {
  FacultyID: number;
  Phone: string | null;
  Address: string | null;
  EmergencyContact: string | null;
}

interface UserData {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Photo: string | null;
  Faculty: FacultyData | null;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Lazy load components
const DashboardContentLazy = dynamic(() => import('@/components/DashboardContent'), {
  loading: () => <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
  </div>
});

const FacultyContentLazy = dynamic(() => import('@/components/FacultyContent'), {
  loading: () => <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
  </div>
});

const AttendanceContentLazy = dynamic(() => import('@/components/AttendanceContent'), {
  loading: () => <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
  </div>
});

const LeaveContentLazy = dynamic(() => import('@/components/LeaveContent'), {
  loading: () => <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
  </div>
});

const UsersContentLazy = dynamic(() => import('@/components/UsersContent'), {
  loading: () => <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
  </div>
});

export default function Dashboard() {
  const [activeButton, setActiveButton] = useState(() => {
    // Try to get the saved page from localStorage, default to 'dashboard' if not found
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminActivePage') || 'dashboard';
    }
    return 'dashboard';
  });
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isAdminInfoVisible, setAdminInfoVisible] = useState(false); // State for Admin Info Modal
  const [isEditProfileVisible, setEditProfileVisible] = useState(false); // State for Edit Profile Modal
  const [isProfileVisible, setProfileVisible] = useState(false); // Add this state
  const [phoneNumber, setPhoneNumber] = useState(''); // Editable phone number
  const [address, setAddress] = useState(''); // Editable address
  const [isNotificationsVisible, setNotificationsVisible] = useState(false); // State for Notifications Popup
  const [activeTab, setActiveTab] = useState('all'); // State for active tab in notifications
  const [isChatbotVisible, setChatbotVisible] = useState(false); // State for Chatbot Popup
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const { user, isLoaded, isSignedIn } = useUser(); // Get user data from Clerk
  const { signOut } = useClerk(); // Access Clerk's signOut function
  const router = useRouter();

  const chatbotRef = useRef<HTMLDivElement | null>(null);
  const chatButtonRef = useRef<HTMLAnchorElement | null>(null);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Function to position chatbot below the chat icon
  const positionChatbot = () => {
    if (chatButtonRef.current) {
      const buttonRect = chatButtonRef.current.getBoundingClientRect();
      setChatbotPosition({
        x: buttonRect.left - 150, // Offset to center the chatbot
        y: buttonRect.bottom + 10 // 10px gap below the button
      });
    }
  };

  // Update position when chatbot becomes visible
  useEffect(() => {
    if (isChatbotVisible) {
      positionChatbot();
    }
  }, [isChatbotVisible]);

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

  const handleSendMessage = async (message: string) => {
    if (message.trim()) {
      // Add user message to chat
      setChatMessages(prev => [...prev, { type: 'user', content: message }]);
      setChatInput('');

      try {
        // Send message to API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.details || data.error || `HTTP error! status: ${response.status}`);
        }

        // Add AI response to chat
        setChatMessages(prev => [...prev, { type: 'ai', content: data.response }]);
      } catch (error: unknown) {
        console.error('Error sending message:', error);
        setChatMessages(prev => [...prev, { 
          type: 'ai', 
          content: `Error: ${error instanceof Error ? error.message : 'Failed to get response. Please try again.'}`
        }]);
      }
    }
  };

  // Redirect to admin layout if user is an admin
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userRole = user.publicMetadata?.role;

      if (userRole === 'admin') {
        router.push('/dashboard/admin');
      } else if (userRole === 'faculty') {
        router.push('/dashboard/faculty');
      }
      // Else: stay on dashboard
    }
  }, [isLoaded, isSignedIn, user, router]);

  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName);
    // Save the active page to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminActivePage', buttonName);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adminActivePage');
      }
      await signOut(); // Properly end the session
      console.log('User logged out');
      setActiveButton('dashboard'); // Reset state
      setLogoutModalVisible(false);
      router.push('/'); // Redirect to the landing page
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Fetch user data from Supabase
  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data: userData, error: userError } = await supabase
        .from('User')
        .select(`
          UserID,
          FirstName,
          LastName,
          Email,
          Photo,
          Faculty (
            FacultyID,
            Phone,
            Address,
            EmergencyContact
          )
        `)
        .eq('UserID', user.id)
        .single() as { data: UserData | null; error: unknown };

      if (userError) throw userError;

      if (userData) {
        setPhoneNumber(userData.Faculty?.Phone || '');
        setAddress(userData.Faculty?.Address || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load profile data. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data in Supabase
  const handleSave = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // First, get the faculty record to ensure it exists
      const { data: facultyData, error: facultyError } = await supabase
        .from('Faculty')
        .select('FacultyID')
        .eq('UserID', user.id)
        .single();

      if (facultyError) throw facultyError;

      if (!facultyData) {
        setNotification({
          type: 'error',
          message: 'Faculty record not found. Please contact IT support.'
        });
        return;
      }

      // Update faculty record
      const { error: updateError } = await supabase
        .from('Faculty')
        .update({
          Phone: phoneNumber,
          Address: address,
          DateModified: new Date().toISOString()
        })
        .eq('FacultyID', facultyData.FacultyID);

      if (updateError) throw updateError;

      setNotification({
        type: 'success',
        message: 'Profile updated successfully!'
      });

      // Close edit modal and show info modal
      setEditProfileVisible(false);
      setAdminInfoVisible(true);

      // Refresh the data
      await fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      setNotification({
        type: 'error',
        message: 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user data when profile modal opens
  useEffect(() => {
    if (isAdminInfoVisible) {
      fetchUserData();
    }
  }, [isAdminInfoVisible]);

  // Add this function to handle profile visibility
  const toggleProfile = () => {
    setProfileVisible(!isProfileVisible);
  };

  const renderContent = () => {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
        </div>
      }>
        {(() => {
          switch (activeButton) {
            case 'dashboard':
              return <DashboardContentLazy />;
            case 'faculty':
              return <FacultyContentLazy />;
            case 'attendance':
              return <AttendanceContentLazy />;
            case 'leave':
              return <LeaveContentLazy />;
            case 'users':
              return <UsersContentLazy />;
            default:
              return <div>Select a menu item to view its content.</div>;
          }
        })()}
      </Suspense>
    );
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
                <span className="text-[10px]">Dashboard</span>
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
                {/* <span className="text-[10px]">Attendance</span> */}
                <span className="text-[10px]">Schedule</span>
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
              {/* {activeButton === 'attendance' && 'ATTENDANCE'} */}
              {activeButton === 'attendance' && 'SCHEDULE'}
              {activeButton === 'leave' && 'LEAVE'}
              {activeButton === 'users' && 'USERS'}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6">
                {/* Icons Section */}
                <div className="flex items-center space-x-4">
                  <a
                    href="#"
                    ref={chatButtonRef}
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Comments"
                    onClick={() => setChatbotVisible(!isChatbotVisible)} // Toggle Chatbot Popup
                  >
                    <i className="fas fa-comments text-black text-lg"></i>
                  </a>
                  {/* <a
                    href="#"
                    className="p-2 rounded-full hover:bg-gray-200 transition"
                    title="Notifications"
                    onClick={() => setNotificationsVisible(!isNotificationsVisible)} // Toggle Notifications Popup
                  >
                    <i className="fas fa-bell text-black text-lg"></i>
                  </a> */}
                  <a
                    href="#"
                    className="p-1 rounded-full hover:bg-gray-200 transition"
                    title="Profile"
                    onClick={toggleProfile}
                  >
                    {user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={`${user.firstName}'s profile`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-user-circle text-black text-lg"></i>
                    )}
                  </a>
                </div>
                {/* User Information */}
                {isLoaded && isSignedIn && user ? (
                  <a
                  href="#"
                  onClick={toggleProfile}
                  className="flex flex-col text-black hover:text-red-700 transition"
                  title="User Profile"
                >
                  <div className="flex flex-col text-black">
                    <div className="font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-xs">{user.emailAddresses[0]?.emailAddress}</div>
                  </div></a>
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
                        Jane Smith just sent a request: <strong>&ldquo;URGENT!! - leave of absence due to family emergency&rdquo;.</strong>
                      </p>
                      <span className="text-xs text-gray-500">11h ago</span>
                    </li>
                    <li className="p-4 hover:bg-gray-50">
                      <p className="text-sm text-gray-700">
                        Doc Anne just sent a request: <strong>&ldquo;Request for change in class schedule&rdquo;.</strong>
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
                        Jane Smith just sent a request: <strong>&ldquo;URGENT!! - leave of absence due to family emergency&rdquo;.</strong>
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
                width: 350,
                height: 420,
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
                  title='Close'
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
                      className={`${
                        message.type === 'user' 
                          ? 'bg-[#800000] text-white ml-auto' 
                          : 'bg-gray-100 text-gray-800'
                      } p-2 rounded-lg shadow-md text-sm max-w-[80%] ${
                        message.type === 'user' ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-2">Suggested chat prompts</h4>
                  <ul className="space-y-2">
                    <li
                      className="text-sm text-gray-600 hover:text-red-700 cursor-pointer"
                      onClick={() => handleSendMessage("How do I manage faculty schedules?")}
                    >
                      How do I manage faculty schedules?
                    </li>
                    <li
                      className="text-sm text-gray-600 hover:text-red-700 cursor-pointer"
                      onClick={() => handleSendMessage("How do I add a new faculty member?")}
                    >
                      How do I add a new faculty member?
                    </li>
                    <li
                      className="text-sm text-gray-600 hover:text-red-700 cursor-pointer"
                      onClick={() => handleSendMessage("How do I approve leave requests?")}
                    >
                      How do I approve leave requests?
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-[480px] transform transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="bg-[#800000] text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Profile Information</h2>
                <button
                  onClick={() => setAdminInfoVisible(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                  title="Close modal"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              {notification && (
                <div className={`mb-4 p-3 rounded-lg ${
                  notification.type === 'success' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {notification.message}
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
                </div>
              ) : (
                <>
                  {/* Profile Picture Section */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <i className="fas fa-user text-4xl text-gray-400"></i>
                      </div>
                      <button 
                        className="absolute bottom-0 right-0 bg-[#800000] text-white p-2 rounded-full hover:bg-red-800 transition-colors"
                        title="Change profile picture"
                      >
                        <i className="fas fa-camera"></i>
                      </button>
                    </div>
                  </div>

                  {/* User Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          {user?.firstName}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                          {user?.lastName}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        {user?.emailAddresses[0]?.emailAddress}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        {phoneNumber || "Not provided"}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        {address || "Not provided"}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 flex justify-end space-x-3">
                    <button
                      onClick={() => setAdminInfoVisible(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setAdminInfoVisible(false);
                        setEditProfileVisible(true);
                      }}
                      className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-red-800 transition-colors flex items-center"
                    >
                      <i className="fas fa-edit mr-2"></i>
                      Edit Profile
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-[480px] transform transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="bg-[#800000] text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Edit Profile</h2>
                <button
                  onClick={() => setEditProfileVisible(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                  title="Close modal"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <div className="p-6">
              {notification && (
                <div className={`mb-4 p-3 rounded-lg ${
                  notification.type === 'success' 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {notification.message}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="space-y-4">
                  {/* Read-only fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        {user?.firstName}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
                      <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                        {user?.lastName}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                      {user?.emailAddresses[0]?.emailAddress}
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-600 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-colors"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-600 mb-1">
                      Address
                    </label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-300 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] transition-colors"
                      rows={3}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditProfileVisible(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    title="Cancel editing"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-red-800 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add the UserProfile modal */}
      {isProfileVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[1000px] max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#800000]">Profile Settings</h2>
              <button
                onClick={toggleProfile}
                className="text-gray-500 hover:text-gray-700"
                title="Close profile settings"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4">
              <UserProfile />
            </div>
          </div>
        </div>
      )}
    </>
  );
}