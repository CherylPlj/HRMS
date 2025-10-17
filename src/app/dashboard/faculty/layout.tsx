"use client";
import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import { LayoutDashboard } from 'lucide-react';
import { UserProfile, UserButton } from '@clerk/nextjs'; // Add this import
import DashboardFaculty from '@/components/DashboardFaculty';
import PersonalData from '@/components/PersonalData';
import DocumentsFaculty from '@/components/DocumentsFaculty';
import AttendanceFaculty from '@/components/AttendanceFaculty';
import LeaveRequestFaculty from '@/components/LeaveRequestFaculty';
import PerformanceFaculty from '@/components/PerformanceFaculty';
import ClaimsFaculty from '@/components/ClaimsFaculty';
import Directory from '@/components/Directory';
import Buzz from '@/components/Buzz';
import Chatbot from '@/components/Chatbot';
import { useRouter } from 'next/navigation'; // <-- Add this
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isProfileVisible, setProfileVisible] = useState(false);

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

  // Function to position chatbot on the right side of the chat icon
  const positionChatbot = () => {
    if (chatButtonRef.current) {
      const buttonRect = chatButtonRef.current.getBoundingClientRect();
      const chatbotWidth = 380;
      const chatbotHeight = 600;
      const margin = 10;
      
      // Calculate position to the right of the button
      let x = buttonRect.right + margin;
      let y = buttonRect.bottom + margin;
      
      // Check viewport boundaries and adjust if necessary
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // If chatbot would go off the right edge, position it to the left of the button
      if (x + chatbotWidth > viewportWidth) {
        x = buttonRect.left - chatbotWidth - margin;
      }
      
      // If chatbot would go off the bottom edge, position it above the button
      if (y + chatbotHeight > viewportHeight) {
        y = buttonRect.top - chatbotHeight - margin;
      }
      
      // Ensure chatbot doesn't go off the left edge
      if (x < margin) {
        x = margin;
      }
      
      // Ensure chatbot doesn't go off the top edge
      if (y < margin) {
        y = margin;
      }
      
      setChatbotPosition({ x, y });
    }
  };

  // Update position when chatbot becomes visible
  useEffect(() => {
    if (isChatbotVisible) {
      positionChatbot();
    }
  }, [isChatbotVisible]);

  // Reposition chatbot on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isChatbotVisible) {
        positionChatbot();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isChatbotVisible]);

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
      case 'performance':
        return <PerformanceFaculty />;
      case 'claims':
        return <ClaimsFaculty />;
      case 'directory':
        return <Directory />;
      case 'buzz':
        return <Buzz />;
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
              { name: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
              { name: 'Personal Data', icon: 'fa-user', key: 'personal-data' },
              { name: 'Documents', icon: 'fa-file-alt', key: 'documents' },
              // { name: 'Attendance', icon: 'fa-calendar-check', key: 'attendance' },
              { name: 'Leave Request', icon: 'fa-envelope', key: 'leave' },
              // { name: 'Performance', icon: 'fa-chart-line', key: 'performance' },
              // { name: 'Claims', icon: 'fa-receipt', key: 'claims' },
              { name: 'Directory', icon: 'fa-address-book', key: 'directory' },
              // { name: 'Sphere', icon: 'fa-bullhorn', key: 'buzz' }
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
                  {typeof item.icon === 'string' ? (
                    <i className={`fas ${item.icon} ${isSidebarOpen ? 'text-2xl' : 'text-lg'}`}></i>
                  ) : (
                    (() => {
                      const Icon = item.icon as React.ComponentType<{ className?: string }>;
                      return <Icon className={isSidebarOpen ? 'w-6 h-6' : 'w-5 h-5'} />;
                    })()
                  )}
                </div>
                <span className={`${isSidebarOpen ? 'text-base' : 'text-[10px] text-center w-full'}`}>
                  {item.name}
                </span>
              </a>
            ))}
          </nav>

          {/* Logout Button removed; handled via user menu in header */}
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
                  {activeButton === 'attendance' && 'ATTENDANCE'}
                  {activeButton === 'leave' && 'LEAVE REQUEST'}
                  {activeButton === 'performance' && 'PERFORMANCE'}
                  {activeButton === 'claims' && 'CLAIMS'}
                  {activeButton === 'directory' && 'DIRECTORY'}
                  {activeButton === 'buzz' && 'SPHERE'}
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

                {/* Profile Section using Clerk's UserButton */}
                <div className="flex items-center">
                  <UserButton
                    afterSignOutUrl="/"
                    userProfileMode="modal"
                    appearance={{
                      elements: {
                        userButtonPopoverCard: 'rounded-lg shadow-xl border border-gray-200',
                        userButtonPopoverActionButton: 'hover:bg-gray-100',
                        userButtonAvatarBox: 'w-8 h-8 sm:w-10 sm:h-10'
                      }
                    }}
                  />
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

      {/* Chatbot Popup */}
      <Chatbot
        isVisible={isChatbotVisible}
        onClose={() => setChatbotVisible(false)}
        position={chatbotPosition}
        onPositionChange={setChatbotPosition}
        suggestedPrompts={[
          "How do I request a change in my teaching schedule?",
          "How do I submit a leave request?",
          "How do I view my attendance records?",
          "How do I upload documents?",
          "Where is the campus located?"
        ]}
        title="SJSFI Faculty Assistant"
        userRole="faculty"
      />

      {isProfileVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">User Profile</h2>
              <button
                onClick={() => setProfileVisible(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <UserProfile routing="hash" />
          </div>
        </div>
      )}
    </AttendanceProvider>
  );
}
