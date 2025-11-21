"use client";
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'; // Import useRef for drag and resize functionality
import { useUser, useClerk } from '@clerk/nextjs'; // Import useClerk for session management
import DashboardContent from '@/components/DashboardContent';
import FacultyContent from '@/components/FacultyContent';
import LeaveContent from '@/components/LeaveContent';
import EmployeeContentNew from '@/components/EmployeeContentNew';
import RecruitmentContent from '@/components/RecruitmentContent';
import UserManagementContent from '@/components/UserManagementContent';
import SessionManagementContent from '@/components/SessionManagementContent';
import Chatbot from '@/components/Chatbot';
import Directory from '@/components/Directory';
import Reports from '@/components/Reports';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserButton } from '@clerk/nextjs';
import { LayoutDashboard } from 'lucide-react';

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

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get('view') || 'dashboard';
  const [activeButton, setActiveButton] = useState(viewParam);
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
        setUserRole(role || ''); // Store the user's role
        
        if (role !== 'admin' && role !== 'super admin') {
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
        const currentView = searchParams?.get('view') || 'dashboard';
        const redirectPath = `${dashboardPath}?view=${currentView}`;
        
        window.history.replaceState({ url: redirectPath, preventBack: true }, '', redirectPath);
        router.replace(redirectPath);
        // Push again to ensure portal/sign-in is not in history
        window.history.pushState({ url: redirectPath, preventBack: true }, '', redirectPath);
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
  }, [isLoaded, isSignedIn, pathname, router, searchParams]);

  // Sync activeButton with URL query parameter
  useEffect(() => {
    const view = searchParams?.get('view') || 'dashboard';
    setActiveButton(view);
  }, [searchParams]);

  const handleButtonClick = (buttonName: string) => {
    setActiveButton(buttonName);
    // Update URL with query parameter without causing a full page reload
    router.push(`${pathname}?view=${buttonName}`, { scroll: false });
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
      case 'document':
        return <FacultyContent />;
      case 'employees':
        return <EmployeeContentNew />;
      case 'recruitment':
        return <RecruitmentContent />;
      case 'leave':
        return <LeaveContent />;
      case 'directory':
        return <Directory />;
      case 'reports':
        return <Reports />;
      case 'user-management':
        return userRole === 'super admin' ? <UserManagementContent /> : <div>Access denied. Super Admin privileges required.</div>;
      case 'session-management':
        return userRole === 'super admin' ? <SessionManagementContent /> : <div>Access denied. Super Admin privileges required.</div>;
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
              title="toggle"
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
              { name: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
              { name: 'Employees', icon: 'fa-users', key: 'employees' },
              { name: 'Documents', icon: 'fa-file-alt', key: 'document' },
              { name: 'Leave', icon: 'fa-clipboard', key: 'leave' },
              { name: 'Recruitment', icon: 'fa-briefcase', key: 'recruitment' },
              { name: 'Directory', icon: 'fa-address-book', key: 'directory' },
              // { name: 'Reports', icon: 'fa-print', key: 'reports' },
              // Super Admin exclusive items
              ...(userRole === 'super admin' ? [
                { name: 'Users', icon: 'fa-user-shield', key: 'user-management' },
                // { name: 'Sessions', icon: 'fa-clock', key: 'session-management' }
              ] : [])
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
                onClick={(e) => {
                  e.preventDefault();
                  handleButtonClick(item.key);
                }}
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
                  {activeButton === 'document' && 'DOCUMENTS'}
                  {activeButton === 'employees' && 'EMPLOYEES'}
                  {activeButton === 'leave' && 'LEAVE'}
                  {activeButton === 'recruitment' && 'RECRUITMENT'}
                  {activeButton === 'directory' && 'DIRECTORY'}
                  {activeButton === 'reports' && 'REPORTS'}
                  {activeButton === 'user-management' && 'USER MANAGEMENT'}
                  {activeButton === 'session-management' && 'SESSION MANAGEMENT'}
                </h1>
              </div>

              {/* Right Side Icons and User Info */}
              <div className="flex items-center justify-between sm:justify-end space-x-4">
                {/* Chat Icon */}
                <a
                  ref={chatButtonRef}
                  href="#"
                  className="p-2 rounded-full hover:bg-gray-200 transition"
                  title="Chatbot"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
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