"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import { LayoutDashboard } from 'lucide-react';
import { UserProfile, UserButton } from '@clerk/nextjs'; 
import { useRouter, usePathname } from 'next/navigation'; 
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

export default function EmployeeDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
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

  // Function to position chatbot on the right side of the chat icon
  const positionChatbot = () => {
    if (chatButtonRef.current) {
      const buttonRect = chatButtonRef.current.getBoundingClientRect();
      const chatbotWidth = 350;
      const chatbotHeight = 420;
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

  // Prevent back/forward navigation to sign-in or portal when logged in
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded || !isSignedIn) return;

    const dashboardPath = pathname || '/dashboard/employee';
    
    // Immediately replace current history entry to remove any sign-in/portal page
    window.history.replaceState({ url: dashboardPath, preventBack: true }, '', dashboardPath);
    
    // Push a new history state to ensure sign-in/portal page is not accessible via back button
    window.history.pushState({ url: dashboardPath, preventBack: true }, '', dashboardPath);

    // Function to check and redirect if on portal or sign-in
    const checkAndRedirect = () => {
      const currentPath = window.location.pathname;
      
      // If on portal or sign-in, immediately redirect back to dashboard
      if (currentPath === '/' || currentPath === '/sign-in' || currentPath.startsWith('/sign-in')) {
        window.history.replaceState({ url: dashboardPath, preventBack: true }, '', dashboardPath);
        router.replace(dashboardPath);
        // Push again to ensure portal/sign-in is not in history
        window.history.pushState({ url: dashboardPath, preventBack: true }, '', dashboardPath);
      }
    };

    // Intercept back/forward button navigation
    const handlePopState = () => {
      checkAndRedirect();
    };

    // Also check periodically in case navigation happens outside popstate
    const checkInterval = setInterval(checkAndRedirect, 100);

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(checkInterval);
    };
  }, [isLoaded, isSignedIn, pathname, router]);


  const handleLogout = async () => {
    try {
      await signOut(); // Properly end the session
      console.log('User logged out');
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

  // Helper function to determine if a route is active
  const isActiveRoute = (route: string) => {
    if (!pathname) {
      return false;
    }
    if (route === 'dashboard') {
      return pathname === '/dashboard/employee' || pathname === '/dashboard/employee/';
    }
    if (route === 'performance') {
      return pathname.startsWith('/dashboard/employee/performance');
    }
    return pathname === `/dashboard/employee/${route}`;
  };

  // Helper function to get page title from pathname
  const getPageTitle = () => {
    if (!pathname) {
      return 'DASHBOARD';
    }
    if (pathname === '/dashboard/employee' || pathname === '/dashboard/employee/') {
      return 'DASHBOARD';
    }
    const route = pathname.split('/dashboard/employee/')[1];
    const titles: Record<string, string> = {
      'personal-data': 'PERSONAL DATA',
      'documents': 'DOCUMENTS',
      'leave': 'LEAVE REQUEST',
      'performance': 'PERFORMANCE',
      'disciplinary-records': 'DISCIPLINARY RECORDS',
      'directory': 'DIRECTORY',
      'reports': 'REPORTS',
    };
    return titles[route] || '';
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
              title="toggle-button"
              className="text-white p-2 hover:bg-[#660000] rounded transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>

          {/* Logo and Title - Made clickable */}
          <Link 
            href="/dashboard/employee"
            className={`flex flex-col items-center cursor-pointer
              ${isSidebarOpen ? 'p-4' : 'p-2'}`}
          >
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
          </Link>
          
          {/* Navigation Menu */}
          <nav className={`flex-1 flex flex-col overflow-y-auto
            ${isSidebarOpen ? 'space-y-1 px-3' : 'space-y-3 px-2'} py-2`}>
            {[
              { name: 'Dashboard', icon: LayoutDashboard, key: 'dashboard', route: '' },
              { name: 'Personal Data', icon: 'fa-user', key: 'personal-data', route: 'personal-data' },
              { name: 'Documents', icon: 'fa-file-alt', key: 'documents', route: 'documents' },
              { name: 'Leave Request', icon: 'fa-envelope', key: 'leave', route: 'leave' },
              { name: 'Performance', icon: 'fa-chart-line', key: 'performance', route: 'performance' },
              { name: 'Disciplinary Records', icon: 'fa-gavel', key: 'disciplinary-records', route: 'disciplinary-records' },
              { name: 'Directory', icon: 'fa-address-book', key: 'directory', route: 'directory' },
              // { name: 'Reports', icon: 'fa-print', key: 'reports', route: 'reports' },
            ].map((item) => {
              const href = item.route ? `/dashboard/employee/${item.route}` : '/dashboard/employee';
              const isActive = isActiveRoute(item.key);
              
              return (
                <Link
                  key={item.key}
                  href={href}
                  className={`flex items-center rounded-md cursor-pointer transition-colors
                    ${isSidebarOpen 
                      ? 'space-x-3 px-3 py-2' 
                      : 'flex-col justify-center py-2 space-y-1'
                    }
                    ${isActive ? 'text-[#ffd700] font-semibold bg-[#660000]' : 'text-white hover:bg-[#660000]'}`}
                  title={item.name}
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
                </Link>
              );
            })}
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
                  {getPageTitle()}
                </h1>
              </div>

              {/* Right Side Icons and User Info */}
              <div className="flex items-center justify-between sm:justify-end space-x-4">
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
            {children}
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
                title="logout-modal"
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                onClick={() => setLogoutModalVisible(false)}
              >
                Cancel
              </button>
              <button
                title="handle-logout"
                className="px-4 py-2 bg-red-700 text-white rounded hover:bg-[#800000]"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
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
                  onClick={() => handleSendMessage("How do I add a new employee profile?")}
                >
                  How do I add a new employee profile?
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
                  title="send-message"
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
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">User Profile</h2>
              <button
                title="profile-button"
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
      </>
  );
}
