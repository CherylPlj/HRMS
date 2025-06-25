'use client';

import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaIdCard, FaPhone, FaUsers, FaGraduationCap, FaBriefcase, FaHandsHelping, FaBook, FaInfoCircle, FaPlus, FaUpload, FaEdit, FaEye } from 'react-icons/fa';
import { Search } from 'lucide-react';

// Define interfaces for the PDS sections
interface PersonalInfo {
  surname: string;
  firstName: string;
  middleName: string;
  nameExtension: string;
  birthDate: string;
  birthPlace: string;
  sex: 'Male' | 'Female';
  civilStatus: string;
  height: string;
  weight: string;
  bloodType: string;
  gsis: string;
  pagibig: string;
  philhealth: string;
  sss: string;
  tin: string;
  agencyNumber: string;
  citizenship: string;
  dualCitizenshipType: string;
  country: string;
}

interface ContactInfo {
  residentialAddress: {
    houseNumber: string;
    street: string;
    subdivision: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  };
  permanentAddress: {
    houseNumber: string;
    street: string;
    subdivision: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  };
  telephone: string;
  mobile: string;
  email: string;
}

interface FamilyBackground {
  spouse: {
    surname: string;
    firstName: string;
    middleName: string;
    occupation: string;
    employer: string;
    businessAddress: string;
    telephone: string;
  };
  parents: {
    father: {
      surname: string;
      firstName: string;
      middleName: string;
      nameExtension: string;
    };
    mother: {
      surname: string;
      firstName: string;
      middleName: string;
    };
  };
  children: Array<{
    name: string;
    birthDate: string;
  }>;
}

interface Education {
  elementary: {
    nameOfSchool: string;
    degree: string;
    from: string;
    to: string;
    units: string;
    yearGraduated: string;
    honors: string;
  };
  secondary: {
    nameOfSchool: string;
    degree: string;
    from: string;
    to: string;
    units: string;
    yearGraduated: string;
    honors: string;
  };
  vocational: Array<{
    nameOfSchool: string;
    degree: string;
    from: string;
    to: string;
    units: string;
    yearGraduated: string;
    honors: string;
  }>;
  college: Array<{
    nameOfSchool: string;
    degree: string;
    from: string;
    to: string;
    units: string;
    yearGraduated: string;
    honors: string;
  }>;
  graduate: Array<{
    nameOfSchool: string;
    degree: string;
    from: string;
    to: string;
    units: string;
    yearGraduated: string;
    honors: string;
  }>;
}

interface CivilService {
  eligibilities: Array<{
    title: string;
    rating: string;
    examDate: string;
    examPlace: string;
    licenseNumber: string;
    validity: string;
  }>;
}

interface WorkExperience {
  positions: Array<{
    position: string;
    department: string;
    salary: string;
    payGrade: string;
    appointmentStatus: string;
    workNature: string;
    from: string;
    to: string;
  }>;
}

interface VoluntaryWork {
  organizations: Array<{
    name: string;
    address: string;
    from: string;
    to: string;
    hours: string;
    position: string;
  }>;
}

interface Training {
  programs: Array<{
    title: string;
    from: string;
    to: string;
    hours: string;
    type: string;
    sponsor: string;
  }>;
}

interface OtherInfo {
  skills: string[];
  recognitions: string[];
  organizations: string[];
}

const EmployeeContentNew = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState('personal');
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // State for Add Employee modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employeeID: '',
    userID: '',
    surname: '',
    firstName: '',
    middleName: '',
    nameExtension: '',
    birthDate: '',
    birthPlace: '',
    sex: '',
    civilStatus: '',
    height: '',
    weight: '',
    bloodType: '',
    gsis: '',
    pagibig: '',
    philhealth: '',
    sss: '',
    tin: '',
    citizenship: 'Filipino',
    email: '',
    position: '',
    designation: '',
    departmentID: 0,
    employmentStatus: 'Regular',
    employeeType: 'Regular',
    phone: '',
    address: '',
    hireDate: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
  });

  // State for Import Employee modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // State for editing mode and edited employee
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<any>(null);

  // Tabs configuration
  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: FaUserCircle },
    { id: 'government', label: 'Government IDs', icon: FaIdCard },
    { id: 'contact', label: 'Contact Information', icon: FaPhone },
    { id: 'family', label: 'Family Background', icon: FaUsers },
    { id: 'education', label: 'Educational Background', icon: FaGraduationCap },
    { id: 'civil', label: 'Civil Service', icon: FaBriefcase },
    { id: 'work', label: 'Work Experience', icon: FaBriefcase },
    { id: 'training', label: 'Training Programs', icon: FaBook },
    { id: 'other', label: 'Other Information', icon: FaInfoCircle },
  ];

  // Handle edit button click
  const handleEditClick = () => {
    setEditedEmployee(selectedEmployee);
    setIsEditing(true);
  };

  // Handle save edited employee
  const handleSaveEdit = async () => {
    try {
      const response = await fetch('/api/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedEmployee),
      });
      if (!response.ok) {
        throw new Error('Failed to update employee');
      }
      const updatedEmployee = await response.json();
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === updatedEmployee.FacultyID ? updatedEmployee : emp))
      );
      setSelectedEmployee(updatedEmployee);
      setIsEditing(false);
      setEditedEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  // Handle input change in edit form
  const handleEditInputChange = (field: string, value: any) => {
    setEditedEmployee((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'paginated' | 'all'>('paginated');

  useEffect(() => {
    fetchEmployees(1);
  }, []);

  // Fetch employees from backend API with pagination
  const fetchEmployees = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/employees?page=${page}&limit=10`);
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        const data = await response.json();
      
        // Map data to match UI expected fields
      const mappedData = data.employees.map((emp: any) => ({
        id: emp.EmployeeID,
        employeeId: emp.EmployeeID,
        firstName: emp.FirstName || '',
        surname: emp.LastName || '',
          middleName: emp.MiddleName || '',
        nameExtension: emp.ExtensionName || '',
        fullName: [emp.FirstName, emp.MiddleName, emp.LastName, emp.ExtensionName].filter(Boolean).join(' '),
          birthDate: emp.DateOfBirth ? new Date(emp.DateOfBirth).toISOString().split('T')[0] : '',
          birthPlace: emp.PlaceOfBirth || '',
                sex: emp.Sex || '',
        civilStatus: emp.CivilStatus || '',
        email: emp.Email || emp.UserID || 'No email', // Use Email field first, then UserID if available
        position: emp.Position || '',
        designation: emp.Designation || '',
        departmentName: emp.DepartmentID ? `Dept ${emp.DepartmentID}` : 'No Department',
        employmentStatus: emp.EmploymentStatus || '',
        employeeType: emp.EmployeeType || '',
        status: 'Active', // Default status
        phone: emp.Phone || '',
        address: emp.Address || '',
        hireDate: emp.HireDate ? new Date(emp.HireDate).toISOString().split('T')[0] : '',
        emergencyContactName: emp.EmergencyContactName || '',
        emergencyContactNumber: emp.EmergencyContactNumber || '',
          // Add other fields as needed
        }));
      
        setEmployees(mappedData);
      setPagination(data.pagination);
      } catch (error) {
        console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch ALL employees without pagination
  const fetchAllEmployees = async () => {
    setIsLoadingAll(true);
    try {
      const response = await fetch(`/api/employees?page=1&limit=1000`);
      if (!response.ok) {
        throw new Error('Failed to fetch all employees');
      }
      const data = await response.json();
      
      // Map data to match UI expected fields
      const mappedData = data.employees.map((emp: any) => ({
        id: emp.EmployeeID,
        employeeId: emp.EmployeeID,
        firstName: emp.FirstName || '',
        surname: emp.LastName || '',
        middleName: emp.MiddleName || '',
        nameExtension: emp.ExtensionName || '',
        fullName: [emp.FirstName, emp.MiddleName, emp.LastName, emp.ExtensionName].filter(Boolean).join(' '),
        birthDate: emp.DateOfBirth ? new Date(emp.DateOfBirth).toISOString().split('T')[0] : '',
        birthPlace: emp.PlaceOfBirth || '',
        sex: emp.Sex || '',
        civilStatus: emp.CivilStatus || '',
        email: emp.Email || emp.UserID || 'No email', // Use Email field first, then UserID if available
        position: emp.Position || '',
        designation: emp.Designation || '',
        departmentName: emp.DepartmentID ? `Dept ${emp.DepartmentID}` : 'No Department',
        employmentStatus: emp.EmploymentStatus || '',
        employeeType: emp.EmployeeType || '',
        status: 'Active', // Default status
        phone: emp.Phone || '',
        address: emp.Address || '',
        hireDate: emp.HireDate ? new Date(emp.HireDate).toISOString().split('T')[0] : '',
        emergencyContactName: emp.EmergencyContactName || '',
        emergencyContactNumber: emp.EmergencyContactNumber || '',
        // Add other fields as needed
      }));
      
      setAllEmployees(mappedData);
      return mappedData;
    } catch (error) {
      console.error('Error fetching all employees:', error);
      return [];
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchEmployees(newPage);
    }
  };

  // Toggle between paginated and all employees view
  const handleToggleView = async () => {
    if (viewMode === 'paginated') {
      // Switch to show all employees
      if (allEmployees.length === 0) {
        await fetchAllEmployees();
      }
      setViewMode('all');
    } else {
      // Switch back to paginated view
      setViewMode('paginated');
    }
  };

  // Filter employees based on search term and filters
  const currentEmployees = viewMode === 'all' ? allEmployees : employees;
  const filteredEmployees = currentEmployees.filter(employee => {
    const fullName = (employee.fullName || '').toLowerCase();
    const email = employee.email?.toLowerCase() || '';
    const position = employee.position?.toLowerCase() || '';
    const departmentName = employee.departmentName?.toLowerCase() || '';
    const status = employee.status?.toLowerCase() || '';

    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase()) || position.includes(searchTerm.toLowerCase()) || departmentName.includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || departmentName === departmentFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
  };

  // Implement handleAddEmployee and handleImportEmployees with API calls

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          EmployeeID: newEmployee.employeeID,
          UserID: newEmployee.userID || null,
          DateOfBirth: newEmployee.birthDate,
          Phone: newEmployee.phone,
          Address: newEmployee.address,
          EmploymentStatus: newEmployee.employmentStatus,
          HireDate: newEmployee.hireDate,
          Position: newEmployee.position,
          DepartmentID: newEmployee.departmentID || null,
          EmergencyContactName: newEmployee.emergencyContactName,
          EmergencyContactNumber: newEmployee.emergencyContactNumber,
          EmployeeType: newEmployee.employeeType,
          Designation: newEmployee.designation,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to add employee');
      }
      const addedEmployee = await response.json();
      // Refresh the employee list
      fetchEmployees(pagination.currentPage);
      setIsAddModalOpen(false);
      setNewEmployee({
        employeeID: '',
        userID: '',
        surname: '',
        firstName: '',
        middleName: '',
        nameExtension: '',
        birthDate: '',
        birthPlace: '',
        sex: '',
        civilStatus: '',
        height: '',
        weight: '',
        bloodType: '',
        gsis: '',
        pagibig: '',
        philhealth: '',
        sss: '',
        tin: '',
        citizenship: 'Filipino',
        email: '',
        position: '',
        designation: '',
        departmentID: 0,
        employmentStatus: 'Regular',
        employeeType: 'Regular',
        phone: '',
        address: '',
        hireDate: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
      });
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim() !== '');
          const headers = lines[0].split(',');
          const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const row: any = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || '';
            });
            return row;
          });
          setImportPreview(data.slice(0, 5));
        } catch (error) {
          console.error('Error parsing CSV:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportEmployees = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      for (const row of importPreview) {
        await fetch('/api/employees/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (error) {
      console.error('Error importing employees:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // If an employee is selected, show the personal data tabs
  if (selectedEmployee) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToList}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Employees
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedEmployee.fullName || `${selectedEmployee.firstName} ${selectedEmployee.surname}`.trim()}
            </h1>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
              >
                <FaEdit /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Employee Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Position</label>
              <p className="text-lg font-semibold text-gray-800">{selectedEmployee.position}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Department</label>
              <p className="text-lg font-semibold text-gray-800">{selectedEmployee.department}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg font-semibold text-gray-800">{selectedEmployee.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {selectedEmployee.status}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-[#800000] text-[#800000]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Surname</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.surname}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">First Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Middle Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.middleName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Name Extension</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.nameExtension || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.birthDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Place of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.birthPlace}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Sex</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.sex}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Civil Status</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.civilStatus}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'government' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Government IDs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">GSIS Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.gsis || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">SSS Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.sss || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">PhilHealth Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.philhealth || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Pag-IBIG Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.pagibig || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">TIN</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.tin || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Email Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Mobile Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.mobile || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600">Residential Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.residentialAddress || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'family' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Family Background</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Spouse Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Name</label>
                        <p className="mt-1 text-sm text-gray-900">Maria Santos</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Occupation</label>
                        <p className="mt-1 text-sm text-gray-900">Nurse</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'education' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Educational Background</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Elementary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">School</label>
                        <p className="mt-1 text-sm text-gray-900">Elementary School</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Year Graduated</label>
                        <p className="mt-1 text-sm text-gray-900">2002</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Honors</label>
                        <p className="mt-1 text-sm text-gray-900">Valedictorian</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'civil' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Civil Service Eligibility</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Eligibility</label>
                      <p className="mt-1 text-sm text-gray-900">Professional</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Rating</label>
                      <p className="mt-1 text-sm text-gray-900">85.50</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Date of Examination</label>
                      <p className="mt-1 text-sm text-gray-900">2015-10-18</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'work' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Work Experience</h3>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Position</label>
                        <p className="mt-1 text-sm text-gray-900">Teacher</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Department</label>
                        <p className="mt-1 text-sm text-gray-900">Education</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">From</label>
                        <p className="mt-1 text-sm text-gray-900">2020-06-01</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">To</label>
                        <p className="mt-1 text-sm text-gray-900">Present</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Training Programs</h3>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Training Title</label>
                        <p className="mt-1 text-sm text-gray-900">Advanced Teaching Methods</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Duration</label>
                        <p className="mt-1 text-sm text-gray-900">40 hours</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">From</label>
                        <p className="mt-1 text-sm text-gray-900">2023-01-15</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">To</label>
                        <p className="mt-1 text-sm text-gray-900">2023-01-20</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'other' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Special Skills</label>
                    <p className="mt-1 text-sm text-gray-900">Public Speaking, Leadership</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Hobbies</label>
                    <p className="mt-1 text-sm text-gray-900">Reading, Traveling</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main employee list view
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Add Employee Button */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#800000] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <FaPlus /> Add Employee
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
          >
            <FaUpload /> Import Employees
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleView}
            disabled={isLoadingAll}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingAll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </>
            ) : viewMode === 'paginated' ? (
              <>
                <FaEye /> Show All ({pagination.totalCount})
              </>
            ) : (
              <>
                <FaEye /> Show Paginated
              </>
            )}
          </button>
          {viewMode === 'all' && (
            <span className="text-sm text-gray-600">
              Showing all {allEmployees.length} employees
            </span>
          )}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
        >
          <option value="all">All Departments</option>
          <option value="education">Education</option>
          <option value="hr">Human Resources</option>
          <option value="admin">Administration</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
            <span className="ml-2 text-gray-600">Loading employees...</span>
          </div>
        ) : (
          <>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr 
                  key={employee.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEmployeeSelect(employee)}
                >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.employeeId}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-[#800000] flex items-center justify-center">
                          <span className="text-white font-medium">
                            {(employee.firstName || '').charAt(0)}{(employee.surname || '').charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.fullName || `${employee.firstName} ${employee.surname}`.trim()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.employeeType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.position}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.designation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.departmentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeSelect(employee);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
  // Implement edit functionality
                        }}
                        className="text-[#800000] hover:text-red-800"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

            {/* Pagination Controls - Only show in paginated mode */}
            {viewMode === 'paginated' && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
      </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {((pagination.currentPage - 1) * pagination.limit) + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === pagination.currentPage
                              ? 'z-10 bg-[#800000] border-[#800000] text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {/* Add Employee Modal - Modern & User-Friendly */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#800000] to-red-700 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">Add New Employee</h2>
                  <p className="text-red-100 mt-1">Fill in the employee information below</p>
                </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                  className="text-white hover:text-red-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              </div>
            </div>

            {/* Modal Body - Scrollable with Form */}
            <form onSubmit={handleAddEmployee} className="flex flex-col h-full">
              <div className="overflow-y-auto max-h-[calc(95vh-200px)] flex-1">
                <div className="p-8">
                  <div className="space-y-8">
                    {/* Step 1: Basic Information */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">1</div>
                        <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                  </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Employee ID
                          </label>
                    <input
                      type="text"
                            value={newEmployee.employeeID}
                            onChange={(e) => setNewEmployee({...newEmployee, employeeID: e.target.value})}
                            placeholder="e.g., 2024-0001"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                      required
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            User ID (Optional)
                          </label>
                    <input
                      type="text"
                            value={newEmployee.userID}
                            onChange={(e) => setNewEmployee({...newEmployee, userID: e.target.value})}
                            placeholder="Link to existing user"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Date of Birth
                          </label>
                    <input
                      type="date"
                      value={newEmployee.birthDate}
                      onChange={(e) => setNewEmployee({...newEmployee, birthDate: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                      required
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Hire Date
                          </label>
                    <input
                            type="date"
                            value={newEmployee.hireDate}
                            onChange={(e) => setNewEmployee({...newEmployee, hireDate: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                      required
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={newEmployee.phone}
                            onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                            placeholder="09123456789"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                  </div>
                        <div className="space-y-2 lg:col-span-3">
                          <label className="block text-sm font-semibold text-gray-700">
                            Complete Address
                          </label>
                          <input
                            type="text"
                            value={newEmployee.address}
                            onChange={(e) => setNewEmployee({...newEmployee, address: e.target.value})}
                            placeholder="House No., Street, Barangay, City, Province"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                  </div>
                </div>
              </div>

                    {/* Step 2: Employment Details */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">2</div>
                        <h3 className="text-xl font-bold text-gray-800">Employment Details</h3>
                  </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Position/Job Title
                          </label>
                    <input
                      type="text"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                            placeholder="e.g., Teacher, Principal, Administrator"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Designation
                          </label>
                          <select
                            value={newEmployee.designation}
                            onChange={(e) => setNewEmployee({...newEmployee, designation: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                          >
                            <option value="">Choose designation...</option>
                            <option value="President">President</option>
                            <option value="Admin_Officer">Admin Officer</option>
                            <option value="Vice_President">Vice President</option>
                            <option value="Registrar">Registrar</option>
                            <option value="Faculty">Faculty</option>
                            <option value="Principal">Principal</option>
                            <option value="Cashier">Cashier</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Department ID
                          </label>
                    <input
                            type="number"
                            value={newEmployee.departmentID || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, departmentID: Number(e.target.value) || 0})}
                            placeholder="Enter department ID (optional)"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Employment Status
                          </label>
                    <select
                            value={newEmployee.employmentStatus}
                            onChange={(e) => setNewEmployee({...newEmployee, employmentStatus: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                      required
                    >
                      <option value="Regular">Regular</option>
                      <option value="Probationary">Probationary</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Employee Type
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['Regular', 'Probationary', 'Contract', 'Part-time'].map((type) => (
                              <label key={type} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="employeeType"
                                  value={type}
                                  checked={newEmployee.employeeType === type}
                                  onChange={(e) => setNewEmployee({...newEmployee, employeeType: e.target.value})}
                                  className="text-green-600 focus:ring-green-500"
                                />
                                <span className="text-sm font-medium text-gray-700">{type}</span>
                              </label>
                            ))}
                          </div>
                  </div>
                </div>
              </div>

                    {/* Step 3: Emergency Contact */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
                        <h3 className="text-xl font-bold text-gray-800">Emergency Contact</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Contact Person Name
                          </label>
                          <input
                            type="text"
                            value={newEmployee.emergencyContactName}
                            onChange={(e) => setNewEmployee({...newEmployee, emergencyContactName: e.target.value})}
                            placeholder="Full name of emergency contact"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Contact Number
                          </label>
                          <input
                            type="tel"
                            value={newEmployee.emergencyContactNumber}
                            onChange={(e) => setNewEmployee({...newEmployee, emergencyContactNumber: e.target.value})}
                            placeholder="09123456789"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Now inside form */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    <span className="text-red-500">*</span> Required fields
                  </p>
                  <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                      className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                      className="px-8 py-3 text-white bg-gradient-to-r from-[#800000] to-red-700 rounded-lg hover:from-red-800 hover:to-red-900 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Add Employee
                </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Employee Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Import Employees</h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Upload CSV File</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Select CSV File
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#800000] file:text-white hover:file:bg-red-800"
                    />
                  </div>
                  
                  {importFile && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-600">
                        <strong>Selected file:</strong> {importFile.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Size:</strong> {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CSV Template Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">CSV Template</h3>
                <p className="text-sm text-blue-600 mb-3">
                  Your CSV file should include the following columns:
                </p>
                <div className="bg-white p-3 rounded border text-sm font-mono">
                  EmployeeID,firstName,lastName,email,dateOfBirth,hireDate,position,designation,address,phone,employmentStatus,employeeType,emergencyContactName,emergencyContactNumber,passwordHash
                </div>
                <button
                  onClick={() => {
                    const csvContent =
                      "EmployeeID,firstName,lastName,email,dateOfBirth,hireDate,position,designation,address,phone,employmentStatus,employeeType,emergencyContactName,emergencyContactNumber,passwordHash\n" +
                      "2018-0017,Ronel,Reyes,ronel.reyes@example.com,1990-01-01,2018-01-01,Faculty,Faculty,6965 Sto. Niño St. Maligaya Brgy. 177 Caloocan City,0935-8141526,Regular,Regular,Consuelo Reyes,0935-8141526,dummyhash";
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'employee_template.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Download CSV Template
                </button>
              </div>

              {/* Preview Section */}
              {importPreview.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Data Preview (First 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100">
                          {Object.keys(importPreview[0] || {}).map((header) => (
                            <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-sm text-gray-900 border-b">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Options */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-700 mb-4">Import Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                      defaultChecked
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Skip duplicate employees (based on email)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                      defaultChecked
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Validate data before import
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Send welcome email to new employees
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportEmployees}
                  disabled={!importFile || isImporting}
                  className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <FaUpload /> Import Employees
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeContentNew; 