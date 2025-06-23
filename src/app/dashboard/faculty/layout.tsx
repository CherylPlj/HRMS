"use client";
import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import { UserProfile } from '@clerk/nextjs'; // Add this import
import DashboardFaculty from '@/components/DashboardFaculty';
import PersonalData from '@/components/PersonalData';
import DocumentsFaculty from '@/components/DocumentsFaculty';
import AttendanceFaculty from '@/components/AttendanceFaculty';
import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';
import { useRouter } from 'next/navigation'; // <-- Add this
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ChatMessage {
  type: 'user' | 'ai';
  content: string;
}

interface Role {
  name: string;
}

interface UserRole {
  role: Role;
}

interface UserRoleData {
  UserRole: UserRole[];
}

export default function FacultyDashboard() {
  const [activeButton, setActiveButton] = useState('dashboard');
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isProfileVisible, setProfileVisible] = useState(false);

  const chatbotRef = useRef<HTMLDivElement | null>(null);
  const chatButtonRef = useRef<HTMLAnchorElement | null>(null);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 0, y: 0 });

  // Check user's role and redirect if not faculty
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
        
        if (role !== 'faculty') {
          if (role === 'admin') {
            router.push('/dashboard/admin');
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

  // Add this function to handle profile visibility
  const toggleProfile = () => {
    setProfileVisible(!isProfileVisible);
  };

  const renderContent = () => {
    switch (activeButton) {
      case 'dashboard':
        return <DashboardFaculty />;
      case 'personal-data':
        return <PersonalData onBack={() => setActiveButton('dashboard')} />;
      case 'documents':
        return <DocumentsFaculty onBack={() => setActiveButton('dashboard')} />;
      case 'attendance':
        return <AttendanceFaculty onBack={() => setActiveButton('dashboard')} />;
      case 'leave':
        return <LeaveRequestFaculty onBack={() => setActiveButton('dashboard')} />;
      default:
        return <div>Select a menu item to view its content.</div>;
    }
  };

  return (
    <AttendanceProvider>
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
                 router.push('/dashboard/faculty');
               }}>
            <img
              src="/sjsfilogo.png"
              alt="Logo"
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
              { name: 'Personal Data', icon: 'fa-user', key: 'personal-data' },
              { name: 'Documents', icon: 'fa-file-alt', key: 'documents' },
              { name: 'Attendance', icon: 'fa-calendar-check', key: 'attendance' },
              { name: 'Leave Request', icon: 'fa-envelope', key: 'leave' }
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
                <span className={`${isSidebarOpen ? 'text-base' : 'text-[8px] text-center w-full'}`}>
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
              <span className={`${isSidebarOpen ? 'text-base' : 'text-[8px] text-center w-full'}`}>
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
                  {activeButton === 'personal-data' && 'PERSONAL DATA'}
                  {activeButton === 'documents' && 'DOCUMENTS'}
                  {activeButton === 'attendance' && 'ATTENDANCE & SCHEDULE'}
                  {activeButton === 'leave' && 'LEAVE REQUEST'}
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

      {/* Modals and Popups */}
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

      {isNotificationsVisible && (
        <div className="absolute top-16 right-4 bg-white shadow-xl rounded-lg w-96 z-50 border border-gray-200">
          <div className="p-4 bg-gray-100 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
            <button
              title='Close'
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
                    Jane Smith just sent a request: <strong>&quot;URGENT!! - leave of absence due to family emergency&quot;.</strong>
                  </p>
                  <span className="text-xs text-gray-500">11h ago</span>
                </li>
                <li className="p-4 hover:bg-gray-50">
                  <p className="text-sm text-gray-700">
                    Doc Anne just sent a request: <strong>&quot;Request for change in class schedule&quot;.</strong>
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
                    Jane Smith just sent a request: <strong>&quot;URGENT!! - leave of absence due to family emergency&quot;.</strong>
                  </p>
                  <span className="text-xs text-gray-500">11h ago</span>
                </li>
              </>
            )}
          </ul>
        </div>
      )}

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

      {isProfileVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <UserProfile />
          </div>
        </div>
      )}
    </AttendanceProvider>
  );
}
