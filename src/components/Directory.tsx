import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabaseClient';
import { ChevronDown } from 'lucide-react';

interface Employee {
  EmployeeID: string;
  FirstName?: string;
  LastName?: string;
  MiddleName?: string;
  Photo?: string;
  Position?: string;
  Email?: string;
  Department?: {
    DepartmentName: string;
  };
  EmploymentDetail?: Array<{
    EmploymentStatus: string;
    HireDate: string;
    ResignationDate?: string;
    RetirementDate?: string;
  }>;
  ContactInfo?: {
    Phone?: string;
    Email?: string;
    MessengerName?: string;
    FBLink?: string;
  } | Array<{
    Phone?: string;
    Email?: string;
    MessengerName?: string;
    FBLink?: string;
  }>;
  User?: {
    Status: string;
    UserID?: string;
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Photo?: string;
  };
}

interface Faculty {
  FacultyID: number;
  FirstName: string;
  LastName: string;
  Position: string;
  Phone?: string;
  Address?: string;
  EmploymentStatus: string;
  HireDate: string;
  Department: {
    DepartmentName: string;
  };
  User: {
    UserID: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Status: string;
    Photo?: string;
  };
}

interface DirectoryFilters {
  name: string;
  department: string;
  position: string;
  yearsOfService: string;
}

const Directory = () => {
  const { user } = useUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [filters, setFilters] = useState<DirectoryFilters>({
    name: '',
    department: '',
    position: '',
    yearsOfService: ''
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminActions, setShowAdminActions] = useState(false);

  // Fetch all directory data
  useEffect(() => {
    fetchDirectoryData();
    fetchFilterOptions();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return;

    try {
      const { data: userData } = await supabase
        .from('User')
        .select('UserID, Role')
        .eq('Email', user.emailAddresses[0].emailAddress)
        .single();

      if (userData) {
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from('UserRole')
          .select('role:Role(name)')
          .eq('userId', userData.UserID);

        const hasAdminRole = roleData?.some((role: any) => role.role.name === 'Admin');
        setIsAdmin(hasAdminRole || false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchDirectoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.name) params.append('name', filters.name);
      if (filters.department) params.append('department', filters.department);
      if (filters.position) params.append('position', filters.position);
      params.append('page', '1');
      params.append('limit', '1000'); // Get all records for now

      const response = await fetch(`/api/directory?${params.toString()}&t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch directory data');
      }

      const data = await response.json();
      
      // All records are now employees since we removed faculty from the API
      const employeesData = data.records as Employee[];
      
      setEmployees(employeesData);
      setFaculty([]); // No faculty data anymore
    } catch (error) {
      console.error('Error fetching directory data:', error);
      setError('Failed to load directory data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Add cache-busting parameter
      const response = await fetch(`/api/directory?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Filter options received:', data.filterOptions);
        setDepartments(data.filterOptions.departments);
        setPositions(data.filterOptions.positions);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof DirectoryFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      department: '',
      position: '',
      yearsOfService: ''
    });
  };

  const getEmploymentDetail = (record: Employee): { EmploymentStatus: string; HireDate: string; ResignationDate?: string; RetirementDate?: string; } | null => {
    return record.EmploymentDetail?.[0] || null;
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.FirstName || ''} ${emp.LastName || ''}`.toLowerCase();
    const matchesName = !filters.name || fullName.includes(filters.name.toLowerCase());
    const matchesDept = !filters.department || emp.Department?.DepartmentName === filters.department;
    const matchesPosition = !filters.position || emp.Position === filters.position;
    
    // Filter by years of service
    let matchesYearsOfService = true;
    if (filters.yearsOfService) {
      const empDetail = getEmploymentDetail(emp);
      const hireDate = empDetail?.HireDate;
      if (hireDate) {
        try {
          const hire = new Date(hireDate);
          const now = new Date();
          const years = now.getFullYear() - hire.getFullYear();
          const months = now.getMonth() - hire.getMonth();
          const totalYears = months < 0 ? years - 1 : years;
          
          switch (filters.yearsOfService) {
            case '0-5':
              matchesYearsOfService = totalYears >= 0 && totalYears < 5;
              break;
            case '5-10':
              matchesYearsOfService = totalYears >= 5 && totalYears < 10;
              break;
            case '10-15':
              matchesYearsOfService = totalYears >= 10 && totalYears < 15;
              break;
            case '15-20':
              matchesYearsOfService = totalYears >= 15 && totalYears < 20;
              break;
            case '20+':
              matchesYearsOfService = totalYears >= 20;
              break;
            default:
              matchesYearsOfService = true;
          }
        } catch {
          matchesYearsOfService = false;
        }
      } else {
        matchesYearsOfService = false;
      }
    }

    return matchesName && matchesDept && matchesPosition && matchesYearsOfService;
  });

  const allFilteredRecords = filteredEmployees;
  const totalRecords = allFilteredRecords.length;

  const handleEmployeeClick = (record: Employee) => {
    setSelectedEmployee(record);
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedEmployee(null);
  };

  const getEmployeePhoto = (record: Employee) => {
    if ('User' in record && record.User && 'Photo' in record.User && record.User.Photo) {
      return record.User.Photo;
    }
    if ('Photo' in record && record.Photo) {
      return record.Photo;
    }
    return null;
  };

  const getEmployeeName = (record: Employee) => {
    if ('User' in record && record.User && 'FirstName' in record.User && 'LastName' in record.User) {
      return `${record.User.FirstName} ${record.User.LastName}`;
    }
    return `${record.FirstName || ''} ${record.LastName || ''}`.trim();
  };

  const getEmployeePosition = (record: Employee) => {
    return record.Position || ' ';
  };

  const getEmployeeDepartment = (record: Employee) => {
    if ('Department' in record && record.Department) {
      return record.Department.DepartmentName;
    }
    return ' ';
  };

  const calculateYearsOfService = (hireDate: string | undefined): string => {
    if (!hireDate) return ' ';
    try {
      const hire = new Date(hireDate);
      const now = new Date();
      
      // Calculate total months difference
      const yearsDiff = now.getFullYear() - hire.getFullYear();
      const monthsDiff = now.getMonth() - hire.getMonth();
      const daysDiff = now.getDate() - hire.getDate();
      
      // Calculate total months
      let totalMonths = yearsDiff * 12 + monthsDiff;
      
      // Adjust if the day hasn't been reached yet this month
      if (daysDiff < 0) {
        totalMonths--;
      }
      
      if (totalMonths < 0) return ' ';
      
      // If less than 1 month, return "less than a month"
      if (totalMonths === 0) {
        return 'less than a month';
      }
      
      // If less than 12 months, return months
      if (totalMonths < 12) {
        return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
      }
      
      // Otherwise, calculate years and remaining months
      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;
      
      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      }
      
      return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    } catch {
      return ' ';
    }
  };

  const handleAdminAction = async (action: string, employeeId: string, newStatus?: string) => {
    try {
      const response = await fetch('/api/directory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          action,
          newStatus
        }),
      });

      if (response.ok) {
        // Refresh data after successful update
        await fetchDirectoryData();
        setShowAdminActions(false);
        alert('Employee updated successfully');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee');
    }
  };

  const handleContactAction = (action: string, record: Employee) => {
    // Get email from User, Employee, or ContactInfo (in that order)
    let email: string | null = null;
    if (record.User?.Email) {
      email = record.User.Email;
    } else if (record.Email) {
      email = record.Email;
      } else if (record.ContactInfo) {
        if (Array.isArray(record.ContactInfo)) {
          email = record.ContactInfo[0]?.Email || null;
        } else {
          email = (record.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).Email || null;
        }
      }
    
    // Handle ContactInfo as either array or object
    let phone: string | null = null;
    if (record.ContactInfo) {
      if (Array.isArray(record.ContactInfo)) {
        phone = record.ContactInfo[0]?.Phone || null;
      } else {
        phone = (record.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).Phone || null;
      }
    }

    switch (action) {
      case 'email':
        if (email) {
          window.open(`mailto:${email}`, '_blank');
        } else {
          // alert('Email not available');
          setShowEmailPopup(true);
        }
        break;
      case 'call':
        if (phone) {
          window.open(`tel:${phone}`, '_blank');
        } else {
          alert('Phone number not available');
        }
        break;
      case 'message':
        // This could integrate with your messaging system
        alert('Messaging feature coming soon');
        break;
    }
  };

  const handleDownload = () => {
    // Prepare CSV data
    const headers = ['First Name', 'Last Name', 'Middle Name', 'Position', 'Department', 'Email', 'Phone', 'Messenger Name', 'FB Link', 'Employment Status', 'Hire Date', 'Resignation Date'];
    const csvRows = [headers.join(',')];

    allFilteredRecords.forEach(record => {
      const employmentDetail = getEmploymentDetail(record);
      // Get email from User, Employee, or ContactInfo (in that order)
      let email = '';
      if (record.User?.Email) {
        email = record.User.Email;
      } else if (record.Email) {
        email = record.Email;
      } else if (record.ContactInfo) {
        if (Array.isArray(record.ContactInfo)) {
          email = record.ContactInfo[0]?.Email || '';
        } else {
          email = (record.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).Email || '';
        }
      }
      
      // Get phone, messenger name, and FB link from ContactInfo
      let phone = '';
      let messengerName = '';
      let fbLink = '';
      if (record.ContactInfo) {
        if (Array.isArray(record.ContactInfo)) {
          phone = record.ContactInfo[0]?.Phone || '';
          messengerName = record.ContactInfo[0]?.MessengerName || '';
          fbLink = record.ContactInfo[0]?.FBLink || '';
        } else {
          const contactInfo = record.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string };
          phone = contactInfo.Phone || '';
          messengerName = contactInfo.MessengerName || '';
          fbLink = contactInfo.FBLink || '';
        }
      }
      
      const row = [
        record.FirstName || record.User?.FirstName || '',
        record.LastName || record.User?.LastName || '',
        record.MiddleName || '',
        record.Position || '',
        record.Department?.DepartmentName || '',
        email,
        phone,
        messengerName,
        fbLink,
        employmentDetail?.EmploymentStatus || '',
        employmentDetail?.HireDate ? new Date(employmentDetail.HireDate).toLocaleDateString() : '',
        employmentDetail?.ResignationDate ? new Date(employmentDetail.ResignationDate).toLocaleDateString() : ''
      ];
      // Escape commas and quotes in CSV
      csvRows.push(row.map(field => {
        const stringField = String(field || '');
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      }).join(','));
    });

    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading directory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Directory</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDirectoryData}
            className="px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          {/*<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            <i className="fas fa-address-book mr-2 sm:mr-3 text-[#800000]"></i>
            Employee Directory
          </h1> */}
          <p className="text-sm sm:text-base text-gray-600">Search and view employee information</p>
        </div>

        {/* Search and Filter Panel */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              <i className="fas fa-search mr-2 text-[#800000]"></i>
              <span className="hidden xs:inline">Directory </span>Search
            </h2>
            <button
              onClick={() => {
                const panel = document.getElementById('search-panel');
                if (panel) {
                  panel.classList.toggle('hidden');
                }
              }}
              className="text-gray-400 hover:text-gray-600 p-2 -mr-2 touch-manipulation"
            >
              <i className="fas fa-chevron-up"></i>
            </button>
          </div>

          <div id="search-panel" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Employee Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Employee Name
                </label>
                <input
                  type="text"
                  placeholder="Type for hints..."
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Job Title
                </label>
                <div className="relative">
                  <select
                    value={filters.position}
                    onChange={(e) => handleFilterChange('position', e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">-- Select --</option>
                    {positions.map(position => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Location/Department */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">-- Select --</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Years of Service */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Years of Service
                </label>
                <div className="relative">
                  <select
                    value={filters.yearsOfService}
                    onChange={(e) => handleFilterChange('yearsOfService', e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">-- Select --</option>
                    <option value="0-5">0-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10-15">10-15 years</option>
                    <option value="15-20">15-20 years</option>
                    <option value="20+">20+ years</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end">
              <button
                onClick={resetFilters}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 active:bg-green-100 transition-colors text-sm sm:text-base touch-manipulation"
              >
                <i className="fas fa-undo mr-2"></i>
                Reset Filters
              </button>
              {/* <button
                onClick={fetchDirectoryData}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <i className="fas fa-search mr-2"></i>
                Search
              </button> */}
            </div>
          </div>
        </div>

        {/* Records Found and Download */}
        <div className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-gray-600">
            <i className="fas fa-users mr-2"></i>
            <span className="font-medium">({totalRecords})</span> Records Found
          </p>
          <button
            onClick={handleDownload}
            disabled={totalRecords === 0}
            className="px-4 py-2.5 sm:py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] active:bg-[#500000] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base touch-manipulation whitespace-nowrap"
          >
            <i className="fas fa-download mr-2"></i>
            Download CSV
          </button>
        </div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5 md:gap-6">
          {allFilteredRecords.map((record, index) => (
            <div
              key={`${record.EmployeeID}-${index}`}
              onClick={() => handleEmployeeClick(record)}
              className="bg-white rounded-xl p-4 sm:p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-lg active:shadow-sm transition-all cursor-pointer group touch-manipulation"
            >
              <div className="text-center">
                {/* Employee Photo */}
                <div className="mb-3 sm:mb-4">
                  {getEmployeePhoto(record) ? (
                    <img
                      src={getEmployeePhoto(record)!}
                      alt={getEmployeeName(record)}
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full mx-auto object-cover border-3 sm:border-4 border-gray-100 group-hover:border-[#800000] transition-colors"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full mx-auto bg-gray-200 flex items-center justify-center border-3 sm:border-4 border-gray-100 group-hover:border-[#800000] transition-colors">
                      <i className="fas fa-user text-xl sm:text-2xl md:text-3xl text-gray-400"></i>
                    </div>
                  )}
                </div>

                {/* Employee Name */}
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-[#800000] mb-1 sm:mb-2 group-hover:text-[#600000] transition-colors line-clamp-2 leading-tight">
                  {getEmployeeName(record)}
                </h3>

                {/* Position */}
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate" title={getEmployeePosition(record)}>
                  <i className="fas fa-briefcase mr-1"></i>
                  {getEmployeePosition(record)}
                </p>

                {/* Department */}
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate" title={getEmployeeDepartment(record)}>
                  <i className="fas fa-building mr-1"></i>
                  {getEmployeeDepartment(record)}
                </p>

                {/* Years of Service */}
                <p className="text-xs sm:text-sm text-gray-600 truncate" title={calculateYearsOfService(getEmploymentDetail(record)?.HireDate)}>
                  <i className="fas fa-calendar-alt mr-1"></i>
                  {calculateYearsOfService(getEmploymentDetail(record)?.HireDate)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {totalRecords === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-gray-400 text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">
              <i className="fas fa-search"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No employees found</h3>
            <p className="text-sm sm:text-base text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  <i className="fas fa-user-circle mr-2 text-[#800000]"></i>
                  <span className="hidden xs:inline">Employee </span>Profile
                </h2>
                <button
                  onClick={closeProfileModal}
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl p-2 -mr-2 touch-manipulation"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Profile Content */}
              <div className="space-y-4 sm:space-y-6">
                {/* Basic Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-6">
                  {getEmployeePhoto(selectedEmployee) ? (
                    <img
                      src={getEmployeePhoto(selectedEmployee)!}
                      alt={getEmployeeName(selectedEmployee)}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-100 flex-shrink-0">
                      <i className="fas fa-user text-2xl sm:text-3xl text-gray-400"></i>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#800000] break-words">
                      {getEmployeeName(selectedEmployee)}
                    </h3>
                    <p className="text-base sm:text-lg text-gray-600 break-words">
                      {getEmployeePosition(selectedEmployee)}
                    </p>
                    <p className="text-sm sm:text-base text-gray-500 break-words">
                      {getEmployeeDepartment(selectedEmployee)}
                    </p>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">     
                    <i className="fas fa-address-card mr-2 text-[#800000]"></i> 
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">       
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Email</p>
                      <p className="text-sm sm:text-base font-medium break-all">
                        {(() => {
                          // Check User email first, then Employee email, then ContactInfo email
                          if (selectedEmployee.User?.Email) {
                            return selectedEmployee.User.Email;
                          }
                          if (selectedEmployee.Email) {
                            return selectedEmployee.Email;
                          }
                          // Handle ContactInfo as either array or object
                          if (selectedEmployee.ContactInfo) {
                            if (Array.isArray(selectedEmployee.ContactInfo)) {
                              return selectedEmployee.ContactInfo[0]?.Email || ' ';
                            }
                            return (selectedEmployee.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).Email || ' ';
                          }
                          return ' ';
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Phone</p>
                      <p className="text-sm sm:text-base font-medium">
                        {(() => {
                          // Handle ContactInfo as either array or object
                          if (!selectedEmployee.ContactInfo) {
                            return ' ';
                          }
                          if (Array.isArray(selectedEmployee.ContactInfo)) {
                            return selectedEmployee.ContactInfo[0]?.Phone || ' ';
                          }
                          return (selectedEmployee.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).Phone || ' ';
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Messenger Name</p>
                      <p className="text-sm sm:text-base font-medium break-words">
                        {(() => {
                          // Handle ContactInfo as either array or object
                          if (!selectedEmployee.ContactInfo) {
                            return ' ';
                          }
                          if (Array.isArray(selectedEmployee.ContactInfo)) {
                            return selectedEmployee.ContactInfo[0]?.MessengerName || ' ';
                          }
                          return (selectedEmployee.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).MessengerName || ' ';
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">FB Link</p>
                      <p className="text-sm sm:text-base font-medium break-all">
                        {(() => {
                          // Handle ContactInfo as either array or object
                          if (!selectedEmployee.ContactInfo) {
                            return ' ';
                          }
                          let fbLink: string | undefined;
                          if (Array.isArray(selectedEmployee.ContactInfo)) {
                            fbLink = selectedEmployee.ContactInfo[0]?.FBLink;
                          } else {
                            fbLink = (selectedEmployee.ContactInfo as { Phone?: string; Email?: string; MessengerName?: string; FBLink?: string }).FBLink;
                          }
                          if (fbLink) {
                            return (
                              <a 
                                href={fbLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {fbLink}
                              </a>
                            );
                          }
                          return ' ';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3"> 
                    <i className="fas fa-briefcase mr-2 text-[#800000]"></i>    
                    Employment Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">       
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Hire Date</p>        
                      <p className="text-sm sm:text-base font-medium">
                        {(() => {
                          const empDetail = getEmploymentDetail(selectedEmployee);
                          return empDetail?.HireDate ? new Date(empDetail.HireDate).toLocaleDateString() : ' ';
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">End Date / Retirement Date</p>
                      <p className="text-sm sm:text-base font-medium">
                        {(() => {
                          const empDetail = getEmploymentDetail(selectedEmployee);
                          return empDetail?.RetirementDate ? new Date(empDetail.RetirementDate).toLocaleDateString() :
                            empDetail?.ResignationDate ? new Date(empDetail.ResignationDate).toLocaleDateString() : ' ';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button 
                      onClick={() => handleContactAction('email', selectedEmployee)}
                      className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base touch-manipulation"
                    >
                      <i className="fas fa-envelope mr-2"></i>
                      Send Email
                    </button>
                    {/* <button 
                      onClick={() => handleContactAction('call', selectedEmployee)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <i className="fas fa-phone mr-2"></i>
                      Call
                    </button> */}
                    {/* <button 
                      onClick={() => handleContactAction('message', selectedEmployee)}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <i className="fas fa-comment mr-2"></i>
                      Message
                    </button> */}
                  </div>

                  {/* Popup for email not available */}
                  {showEmailPopup && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-4 sm:p-6 text-center">
                        <div className="text-[#800000] text-3xl sm:text-4xl mb-2 sm:mb-3">
                          <i className="fas fa-exclamation-circle"></i>
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                          Email Not Available
                        </h3>
                        {/* <p className="text-gray-600 mb-4">
                          This employee doesn't have an email address.
                        </p> */}
                        <button
                          onClick={() => setShowEmailPopup(false)}
                          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] active:bg-[#500000] transition-colors touch-manipulation"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}


                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="border-t pt-3 sm:pt-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                          <i className="fas fa-cog mr-2 text-[#800000]"></i>
                          Admin Actions
                        </h4>
                        <button
                          onClick={() => setShowAdminActions(!showAdminActions)}
                          className="text-xs sm:text-sm text-[#800000] hover:text-[#600000] p-2 -mr-2 touch-manipulation"
                        >
                          {showAdminActions ? 'Hide' : 'Show'} Actions
                        </button>
                      </div>

                      {showAdminActions && (
                        <div className="space-y-2 sm:space-y-3">
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <button
                              onClick={() => handleAdminAction('update_status', selectedEmployee.EmployeeID, 'Regular')}
                              className="px-2 sm:px-3 py-2.5 sm:py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:bg-green-300 transition-colors text-xs sm:text-sm touch-manipulation"
                            >
                              <i className="fas fa-check mr-1"></i>
                              <span className="hidden xs:inline">Set </span>Regular
                            </button>
                            <button
                              onClick={() => handleAdminAction('update_status', selectedEmployee.EmployeeID, 'Probationary')}
                              className="px-2 sm:px-3 py-2.5 sm:py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 active:bg-yellow-300 transition-colors text-xs sm:text-sm touch-manipulation"
                            >
                              <i className="fas fa-clock mr-1"></i>
                              <span className="hidden xs:inline">Set </span>Probationary
                            </button>
                            <button
                              onClick={() => {
                                const userId = selectedEmployee.User?.UserID || '';
                                if (userId) handleAdminAction('deactivate', userId);
                              }}
                              className="px-2 sm:px-3 py-2.5 sm:py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:bg-red-300 transition-colors text-xs sm:text-sm touch-manipulation"
                            >
                              <i className="fas fa-ban mr-1"></i>
                              Deactivate
                            </button>
                            <button
                              onClick={() => {
                                const userId = selectedEmployee.User?.UserID || '';
                                if (userId) handleAdminAction('activate', userId);
                              }}
                              className="px-2 sm:px-3 py-2.5 sm:py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 active:bg-blue-300 transition-colors text-xs sm:text-sm touch-manipulation"
                            >
                              <i className="fas fa-check-circle mr-1"></i>
                              Activate
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
    );
};

export default Directory;