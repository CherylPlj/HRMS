"use client";
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'; // Import useRef for drag and resize functionality
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import DashboardContent from '@/components/DashboardContent';
import FacultyContent from '@/components/FacultyContent';
import AttendanceContent from '@/components/AttendanceContent';
import LeaveContent from '@/components/LeaveContent';
import UsersContent from '@/components/UsersContent';
import EmployeeContentNew from '@/components/EmployeeContentNew';
import RecruitmentContent from '@/components/RecruitmentContent';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '@clerk/nextjs'; // Add this import

interface Role {
  name: string;
}

interface UserRole {
  role: Role;
}

interface UserRoleData {
  UserRole: UserRole[];
}

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

export default function AdminDashboard() {
  const [activeButton, setActiveButton] = useState('dashboard');
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // Check user's role and redirect if not admin
  useEffect(() => {
    const checkUserRole = async () => {
      if (!isLoaded) return;
      
      if (!isSignedIn || !user) {
        router.push('/sign-in');
        return;
      }

      try {
        const { data: userData, error } = await supabase
          .from('User')
          .select(`
            UserRole!inner (
              role:Role (
                name
              )
            )
          `)
          .eq('Email', user.emailAddresses[0].emailAddress.toLowerCase().trim())
          .single() as { data: UserRoleData | null; error: unknown };

        if (error) {
          console.error("Error fetching user role:", error);
          return;
        }

        const role = (userData as UserRoleData)?.UserRole?.[0]?.role?.name?.toLowerCase();
        
        if (role !== 'admin') {
          if (role === 'faculty') {
            router.push('/dashboard/faculty');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
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
    switch (activeButton) {
      case 'dashboard':
        return <DashboardContent />;
      case 'faculty':
        return <FacultyContent />;
      case 'employees':
        return <EmployeeContentNew />;
      case 'recruitment':
        return <RecruitmentContent />;
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
      <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
        {/* Sidebar - collapsible on all screen sizes */}
        <div className={`bg-[#800000] text-white transition-all duration-300
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
          flex-shrink-0 flex flex-col fixed h-full z-30`}>
          
          {/* Toggle Button - Above logo */}
          <div className="flex justify-center py-2">
            <button
              className="text-white p-2 hover:bg-[#660000] rounded transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>

          {/* Logo and Title - Made clickable */}
          <div className={`flex flex-col items-center cursor-pointer
            ${isSidebarOpen ? 'p-4' : 'p-2'}`}
               onClick={() => {
                 handleButtonClick('dashboard');
                 router.push('/dashboard/admin');
               }}>
            <Image
              src="/sjsfilogo.png"
              alt="Logo"
              width={64}
              height={64}
              className={`${isSidebarOpen ? 'w-12 h-12' : 'w-10 h-10'} mb-2 hover:opacity-80 transition-opacity`}
            />
            <span className={`text-white font-bold
              ${isSidebarOpen ? 'text-xl' : 'hidden'} hover:text-[#ffd700] transition-colors`}>
              SJSFI-HRMS
            </span>
          </div>
          
          {/* Navigation Menu */}
          <nav className={`flex-1 flex flex-col overflow-y-auto
            ${isSidebarOpen ? 'space-y-1 px-3' : 'space-y-3 px-2'} py-2`}>
            {[
              { name: 'Dashboard', icon: 'fa-tachometer-alt', key: 'dashboard' },
              { name: 'Employees', icon: 'fa-users', key: 'employees' },
              { name: 'Faculty', icon: 'fa-user', key: 'faculty' },
              { name: 'Attendance', icon: 'fa-calendar-alt', key: 'attendance' },
              { name: 'Leave', icon: 'fa-clipboard', key: 'leave' },
              { name: 'Recruitment', icon: 'fa-briefcase', key: 'recruitment' },
              { name: 'Users', icon: 'fa-users-cog', key: 'users' }
            ].map((item) => (
              <a
                key={item.key}
                href="#"
                className={`flex items-center rounded-md cursor-pointer transition-colors
                  ${isSidebarOpen 
                    ? 'space-x-3 px-3 py-2' 
                    : 'flex-col justify-center py-2 space-y-1'
                  }
                  ${activeButton === item.key ? 'text-[#ffd700] font-semibold bg-[#660000]' : 'text-white hover:bg-[#660000]'}`}
                title={item.name}
                onClick={() => handleButtonClick(item.key)}
              >
                <div className={`flex justify-center ${isSidebarOpen ? 'w-8' : 'w-full'}`}>
                  <i className={`fas ${item.icon} ${isSidebarOpen ? 'text-2xl' : 'text-lg'}`}></i>
                </div>
                <span className={`${isSidebarOpen ? 'text-base' : 'text-[10px] text-center w-full'}`}>
                  {item.name}
                </span>
              </a>
            ))}
          </nav>

          {/* Logout Button */}
          <div className={`${isSidebarOpen ? 'p-3' : 'p-2'}`}>
            <a
              href="#"
              className={`flex items-center rounded-md cursor-pointer transition-colors
                ${isSidebarOpen 
                  ? 'space-x-3 px-3 py-2' 
                  : 'flex-col justify-center py-2 space-y-1'
                }
                ${activeButton === 'logout' ? 'text-[#ffd700] font-semibold bg-[#660000]' : 'text-white hover:bg-[#660000]'}`}
              title="Log Out"
              onClick={() => setLogoutModalVisible(true)}
            >
              <div className={`flex justify-center ${isSidebarOpen ? 'w-8' : 'w-full'}`}>
                <i className={`fas fa-sign-out-alt ${isSidebarOpen ? 'text-2xl' : 'text-lg'}`}></i>
              </div>
              <span className={`${isSidebarOpen ? 'text-base' : 'text-[10px] text-center w-full'}`}>
                Log Out
              </span>
            </a>
          </div>
        </div>

        {/* Main Content Area - Adjusted margin for sidebar */}
        <div className={`flex-1 flex flex-col overflow-hidden
          ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
          {/* Header */}
          <header className="bg-white shadow-md sticky top-0 z-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 space-y-4 sm:space-y-0">
              {/* Title and Breadcrumb */}
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-red-700">
                  {activeButton === 'dashboard' && 'DASHBOARD'}
                  {activeButton === 'faculty' && 'FACULTY'}
                  {activeButton === 'employees' && 'EMPLOYEES'}
                  {activeButton === 'attendance' && 'ATTENDANCE & SCHEDULE'}
                  {activeButton === 'leave' && 'LEAVE'}
                  {activeButton === 'users' && 'USERS'}
                </h1>
              </div>

              {/* Right Side Icons and User Info */}
              <div className="flex items-center justify-between sm:justify-end space-x-4">
                {/* Chat Icon */}
                <a
                  ref={chatButtonRef}
                  href="#"
                  className="p-2 rounded-full hover:bg-gray-200 transition"
                  title="Comments"
                  onClick={() => setChatbotVisible(!isChatbotVisible)}
                >
                  <i className="fas fa-comments text-black text-lg"></i>
                </a>

                {/* Profile Section */}
                <div className="flex items-center space-x-3">
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
                        className="w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-user-circle text-black text-xl sm:text-2xl"></i>
                    )}
                  </a>

                  {/* User Info - Responsive */}
                  {isLoaded && isSignedIn && user && (
                    <a
                      href="#"
                      onClick={toggleProfile}
                      className="flex flex-col text-black hover:text-red-700 transition"
                      title="User Profile"
                    >
                      <div className="font-semibold text-sm sm:text-base">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-gray-600 hidden sm:block">{user.emailAddresses[0]?.emailAddress}</div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
            {renderContent()}
          </main>
        </div>

        {/* Overlay for when sidebar is open */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
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