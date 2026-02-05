"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react'; // Import useRef for drag and resize functionality
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import Chatbot from '@/components/Chatbot';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserButton } from '@clerk/nextjs';
import { LayoutDashboard } from 'lucide-react';
import RoleSwitcher from '@/components/RoleSwitcher';
import { getSelectedRole, getUserRoles } from '@/lib/userRoles';
import { Toaster } from 'react-hot-toast';

interface Role {
  name: string;
}

interface UserRole {
  role: Role;
}

interface UserRoleData {
  UserRole: UserRole[];
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

export default function AdminDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isAdminInfoVisible, setAdminInfoVisible] = useState(false); // State for Admin Info Modal
  const [isEditProfileVisible, setEditProfileVisible] = useState(false); // State for Edit Profile Modal
  const [isProfileVisible, setProfileVisible] = useState(false); // Add this state
  const [phoneNumber, setPhoneNumber] = useState(''); // Editable phone number
  const [address, setAddress] = useState(''); // Editable address
  const [isNotificationsVisible, setNotificationsVisible] = useState(false); // State for Notifications Popup
  const [activeTab, setActiveTab] = useState('all'); // State for active tab in notifications
  const [isChatbotVisible, setChatbotVisible] = useState(false); // State for Chatbot Popup
  const [userRole, setUserRole] = useState<string>(''); // Store user role to show Super Admin features
  const { user, isLoaded, isSignedIn } = useUser(); // Get user data from Clerk
  const { signOut } = useClerk(); // Access Clerk's signOut function

  const chatButtonRef = useRef<HTMLAnchorElement | null>(null);
  const [chatbotPosition, setChatbotPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

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

  // Check user's role and redirect if not admin
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

        setUserRole(activeRole); // Store the user's active role
        
        // Check if user should be on admin dashboard
        if (activeRole !== 'admin' && !activeRole.includes('admin')) {
          if (activeRole === 'registrar') {
            // Registrars are redirected to external enrollment portal (no HRMS interface)
            window.location.href = 'https://sjsfi-enrollment.vercel.app/registrar/home';
            return;
          } else if (activeRole === 'faculty') {
            router.push('/dashboard/faculty');
          } else if (activeRole === 'cashier') {
            router.push('/dashboard/cashier');
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

  // Prevent back/forward navigation to sign-in or portal when logged in
  // But allow normal navigation between dashboard views
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded || !isSignedIn) return;

    // Function to check and redirect if on portal or sign-in (but not dashboard views)
    const checkAndRedirect = () => {
      const currentPath = window.location.pathname;
      
      // If on portal or sign-in, immediately redirect back to dashboard
      if (currentPath === '/' || currentPath === '/sign-in' || currentPath.startsWith('/sign-in')) {
        const dashboardPath = pathname || '/dashboard/admin';
        
        window.history.replaceState({ url: dashboardPath, preventBack: true }, '', dashboardPath);
        router.replace(dashboardPath);
        // Push again to ensure portal/sign-in is not in history
        window.history.pushState({ url: dashboardPath, preventBack: true }, '', dashboardPath);
      }
      // Note: We don't interfere with dashboard view navigation - router.push handles history
    };

    // Only check on mount - don't interfere with normal navigation
    checkAndRedirect();

    // Intercept back/forward button navigation
    const handlePopState = () => {
      // Use setTimeout to allow normal navigation, then check if we ended up on portal/sign-in
      setTimeout(() => {
        checkAndRedirect();
      }, 0);
    };

    // Check periodically for portal/sign-in access (but don't interfere with dashboard navigation)
    const checkInterval = setInterval(checkAndRedirect, 500);

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

  // Helper function to determine if a route is active
  const isActiveRoute = (route: string) => {
    if (!pathname) return false;
    if (route === 'dashboard') {
      return pathname === '/dashboard/admin' || pathname === '/dashboard/admin/';
    }
    if (route === 'performance') {
      return pathname.startsWith('/dashboard/admin/performance');
    }
    return pathname === `/dashboard/admin/${route}`;
  };

  // Helper function to get page title from pathname
  const getPageTitle = () => {
    if (!pathname) return '';
    if (pathname === '/dashboard/admin' || pathname === '/dashboard/admin/') {
      return 'DASHBOARD';
    }
    const route = pathname.split('/dashboard/admin/')[1];
    const titles: Record<string, string> = {
      'employees': 'EMPLOYEES',
      'documents': 'DOCUMENTS',
      'leave': 'LEAVE',
      'schedules': 'SCHEDULES',
      'schedules-and-loads': 'SCHEDULES & LOADS',
      'section-assignments': 'SECTION ASSIGNMENTS',
      'faculty-subject-loads': 'FACULTY SUBJECT LOADS',
      'performance': 'PERFORMANCE',
      'disciplinary': 'DISCIPLINARY ACTION',
      'disciplinary-history': 'DISCIPLINARY HISTORY',
      'recruitment': 'RECRUITMENT',
      'directory': 'DIRECTORY',
      'reports': 'REPORTS',
      'user-management': 'USER MANAGEMENT',
      'session-management': 'SESSION MANAGEMENT',
    };
    return titles[route] || '';
  };

  return (
    <>
      <Toaster position="top-right" />
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
            href="/dashboard/admin"
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
              { name: 'Employees', icon: 'fa-users', key: 'employees', route: 'employees' },
              { name: 'Documents', icon: 'fa-file-alt', key: 'documents', route: 'documents' },
              { name: 'Leave', icon: 'fa-clipboard', key: 'leave', route: 'leave' },
              { name: 'Schedules & Loads', icon: 'fa-calendar-alt', key: 'schedules-and-loads', route: 'schedules-and-loads' },
              // { name: 'Performance', icon: 'fa-chart-line', key: 'performance', route: 'performance' },
              // { name: 'Disciplinary Action', icon: 'fa-gavel', key: 'disciplinary', route: 'disciplinary' },
              { name: 'Recruitment', icon: 'fa-briefcase', key: 'recruitment', route: 'recruitment' },
              { name: 'Directory', icon: 'fa-address-book', key: 'directory', route: 'directory' },
              // { name: 'Reports', icon: 'fa-print', key: 'reports', route: 'reports' },
              // Super Admin exclusive items
              ...(userRole === 'super admin' ? [
                { name: 'Users', icon: 'fa-user-shield', key: 'user-management', route: 'user-management' },
                // { name: 'Sessions', icon: 'fa-clock', key: 'session-management', route: 'session-management' }
              ] : [])
            ].map((item) => {
              const href = item.route ? `/dashboard/admin/${item.route}` : '/dashboard/admin';
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
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
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
                  {/* Manual / Help - opens role-specific Google Drive folder */}
                  <a
                    href={
                      userRole === 'super admin'
                        ? 'https://drive.google.com/drive/folders/1TmYRi57XWdj8hUEaC8vycNkV-E-8KfPo?usp=sharing'
                        : 'https://drive.google.com/drive/folders/1LhrE1J2xihzN0tkxn820EuNS2TTsqsAJ?usp=sharing'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition"
                    title={userRole === 'super admin' ? 'Super Admin Manual' : 'Admin Manual'}
                  >
                    <i className="fas fa-question-circle text-black text-sm sm:text-base md:text-lg"></i>
                  </a>
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

      {/* Chatbot Popup */}
      <Chatbot
        isVisible={isChatbotVisible}
        onClose={() => setChatbotVisible(false)}
        position={chatbotPosition}
        onPositionChange={setChatbotPosition}
        suggestedPrompts={[
          "How do I add a new employee member?",
          "How do I approve leave requests?",
          "How do I manage employee documents?"
        ]}
        title="SJSFI Admin Assistant"
        userRole="admin"
      />

      {/* Logout Confirmation Modal */}
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

      {/* Admin Info Modal */}
      {isAdminInfoVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    title="submit"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-[1000px] max-h-[90vh] overflow-y-auto">
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