"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import { LayoutDashboard } from 'lucide-react';
import { UserProfile, UserButton } from '@clerk/nextjs';
import Chatbot from '@/components/Chatbot';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import RoleSwitcher from '@/components/RoleSwitcher';
import { getSelectedRole, getUserRoles } from '@/lib/userRoles';

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

export default function FacultyDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isProfileVisible, setProfileVisible] = useState(false);

  const chatButtonRef = useRef<HTMLAnchorElement | null>(null);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 0, y: 0 });

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
      // On mobile, close sidebar by default
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check user's role and redirect if not faculty
  useEffect(() => {
    const checkUserRole = async () => {
      if (!isLoaded) return;
      
      if (!isSignedIn || !user) {
        router.push('/sign-in');
        return;
      }

      try {
        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (!userEmail) return;

        // First check if there's a selected role in sessionStorage
        const selectedRole = getSelectedRole();
        let activeRole = selectedRole;

        // If no selected role, get all roles and use the first one
        if (!activeRole) {
          const userRoles = await getUserRoles(undefined, userEmail);
          if (userRoles.length > 0) {
            activeRole = userRoles[0];
          }
        } else {
          // Verify the selected role is still valid
          const userRoles = await getUserRoles(undefined, userEmail);
          if (!userRoles.includes(activeRole)) {
            // Selected role is invalid, use first role
            activeRole = userRoles.length > 0 ? userRoles[0] : null;
          }
        }

        if (!activeRole) {
          console.error("No roles found for user");
          return;
        }
        
        // Check if user should be on faculty dashboard
        if (activeRole !== 'faculty') {
          if (activeRole === 'admin' || activeRole.includes('admin')) {
            router.push('/dashboard/admin');
          } else if (activeRole === 'cashier') {
            router.push('/dashboard/cashier');
          } else if (activeRole === 'registrar') {
            router.push('/dashboard/registrar');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, [isLoaded, isSignedIn, user, router, pathname]);

  // Function to position chatbot on the right side of the chat icon
  const positionChatbot = () => {
    // On mobile, center the chatbot or position it full-screen
    if (isMobile) {
      setChatbotPosition({ x: 0, y: 0 });
      return;
    }

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

  // Update position when chatbot becomes visible or mobile state changes
  useEffect(() => {
    if (isChatbotVisible) {
      positionChatbot();
    }
  }, [isChatbotVisible, isMobile]);

  // Reposition chatbot on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isChatbotVisible) {
        positionChatbot();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isChatbotVisible, isMobile]);

  // Prevent back/forward navigation to sign-in or portal when logged in
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded || !isSignedIn) return;

    const dashboardPath = pathname || '/dashboard/faculty';
    
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
    if (!pathname) return false;
    if (route === 'dashboard') {
      return pathname === '/dashboard/faculty' || pathname === '/dashboard/faculty/';
    }
    // if (route === 'performance') {
    //   return pathname.startsWith('/dashboard/faculty/performance');
    // }
    return pathname === `/dashboard/faculty/${route}`;
  };

  // Helper function to get page title from pathname
  const getPageTitle = () => {
    if (!pathname) return '';
    if (pathname === '/dashboard/faculty' || pathname === '/dashboard/faculty/') {
      return 'DASHBOARD';
    }
    const route = pathname.split('/dashboard/faculty/')[1];
    const titles: Record<string, string> = {
      'personal-data': 'PERSONAL DATA',
      'documents': 'DOCUMENTS',
      'leave': 'LEAVE REQUEST',
      'my-schedule': 'MY SCHEDULE',
      'performance': 'PERFORMANCE',
      'disciplinary-records': 'DISCIPLINARY RECORDS',
      'directory': 'DIRECTORY',
      'reports': 'REPORTS',
    };
    // Handle nested routes like performance/reviews/[id]
    // if (route?.startsWith('performance')) {
    //   if (route === 'performance') {
    //     return 'PERFORMANCE';
    //   }
    //   // For nested routes like performance/reviews/[id], return PERFORMANCE
    //   return 'PERFORMANCE';
    // }
    return titles[route] || '';
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
        {/* Sidebar - responsive for mobile */}
        <div className={`bg-[#800000] text-white transition-all duration-300
          ${isSidebarOpen 
            ? (isMobile ? 'w-64 translate-x-0' : 'w-64') 
            : (isMobile ? '-translate-x-full w-64' : 'w-20')
          } 
          flex-shrink-0 flex flex-col fixed h-full z-30 md:relative md:translate-x-0`}>
          
          {/* Toggle Button - Above logo */}
          <div className="flex justify-center py-2">
            <button
              title="toggle"
              className="text-white p-2 hover:bg-[#660000] rounded transition-colors"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>

          {/* Logo and Title - Made clickable */}
          <Link 
            href="/dashboard/faculty"
            onClick={() => {
              // Close sidebar on mobile when logo is clicked
              if (isMobile) {
                setIsSidebarOpen(false);
              }
            }}
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
              { name: 'My Schedule', icon: 'fa-calendar-alt', key: 'my-schedule', route: 'my-schedule' },
              // { name: 'Performance', icon: 'fa-chart-line', key: 'performance', route: 'performance' },
              // { name: 'Disciplinary Records', icon: 'fa-gavel', key: 'disciplinary-records', route: 'disciplinary-records' },
              { name: 'Directory', icon: 'fa-address-book', key: 'directory', route: 'directory' },
              // { name: 'Reports', icon: 'fa-print', key: 'reports', route: 'reports' },
            ].map((item) => {
              const href = item.route ? `/dashboard/faculty/${item.route}` : '/dashboard/faculty';
              const isActive = isActiveRoute(item.key);
              
              return (
                <Link
                  key={item.key}
                  href={href}
                  onClick={() => {
                    // Close sidebar on mobile when navigation link is clicked
                    if (isMobile) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center rounded-md cursor-pointer transition-colors
                    ${isSidebarOpen 
                      ? 'space-x-3 px-3 py-2 justify-start' 
                      : 'flex-col justify-center items-center py-2 space-y-1'
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
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 min-w-0">
          {/* Header */}
          <header className="bg-white shadow-md sticky top-0 z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 space-y-3 md:space-y-0">
              {/* Title and Mobile Menu Button */}
              <div className="flex items-center justify-between md:justify-start">
                {/* Mobile Menu Button - Only visible on mobile */}
                {isMobile && (
                  <button
                    title="toggle menu"
                    className="text-gray-700 p-2 mr-2 hover:bg-gray-100 rounded transition-colors md:hidden"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  >
                    <i className="fas fa-bars text-xl"></i>
                  </button>
                )}
                <h1 className="text-xl md:text-2xl font-bold text-red-700 truncate">
                  {getPageTitle()}
                </h1>
              </div>

              {/* Right Side Icons and User Info */}
              <div className="flex items-center justify-end space-x-2 md:space-x-4">
                {/* Role Switcher - Hidden on very small screens, visible from sm up */}
                <div className="hidden sm:block">
                  <RoleSwitcher />
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
                  {/* Chat Icon */}
                  <a
                    ref={chatButtonRef}
                    href="#"
                    className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition"
                    title="Chatbot"
                    onClick={(e) => {
                      e.preventDefault();
                      setChatbotVisible(!isChatbotVisible);
                    }}
                  >
                    <i className="fas fa-comments text-black text-sm sm:text-base md:text-lg"></i>
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
                          userButtonAvatarBox: 'w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10'
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-4">
            {children}
          </main>
        </div>

        {/* Overlay for when sidebar is open on mobile */}
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
      </div>

      {/* Modals and Popups */}
      {isLogoutModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-96">
            <h2 className="text-xl text-center font-bold text-red-700 mb-4">LOGOUT</h2>
            <p className="text-gray-700 text-center mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-center space-x-10">
              <button
                title="logout"
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

      {/* Chatbot Popup */}
      <Chatbot
        isVisible={isChatbotVisible}
        onClose={() => setChatbotVisible(false)}
        position={chatbotPosition}
        onPositionChange={setChatbotPosition}
        suggestedPrompts={[
          "How do I submit a leave request?",
          "How do I upload documents?",
          "Where is the campus located?"
        ]}
        title="SJSFI Employee Assistant"
        userRole="faculty"
      />

      {isProfileVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">User Profile</h2>
              <button
                title="profile"
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
