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

// Mock employee data for UI demonstration
const mockEmployees = [
  {
    id: 1,
    surname: 'Doe',
    firstName: 'John',
    middleName: 'M',
    nameExtension: '',
    birthDate: '1990-01-15',
    birthPlace: 'Manila',
    sex: 'Male',
    civilStatus: 'Single',
    email: 'john.doe@example.com',
    position: 'Teacher',
    department: 'Education',
    employmentType: 'Regular',
    status: 'Active'
  },
  {
    id: 2,
    surname: 'Smith',
    firstName: 'Jane',
    middleName: 'A',
    nameExtension: '',
    birthDate: '1985-03-20',
    birthPlace: 'Quezon City',
    sex: 'Female',
    civilStatus: 'Married',
    email: 'jane.smith@example.com',
    position: 'HR Manager',
    department: 'Human Resources',
    employmentType: 'Regular',
    status: 'Active'
  },
  {
    id: 3,
    surname: 'Johnson',
    firstName: 'Mike',
    middleName: 'B',
    nameExtension: 'Jr.',
    birthDate: '1988-07-10',
    birthPlace: 'Makati',
    sex: 'Male',
    civilStatus: 'Married',
    email: 'mike.johnson@example.com',
    position: 'Admin',
    department: 'Administration',
    employmentType: 'Regular',
    status: 'Active'
  }
];

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
    department: '',
    employmentType: 'Regular',
  });

  // State for Import Employee modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employees, setEmployees] = useState(mockEmployees);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    `${employee.firstName} ${employee.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement the API call to add employee
    console.log('Adding employee:', newEmployee);
    setIsAddModalOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      // Preview the file content
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',');
          const data = lines.slice(1).map(line => {
            const values = line.split(',');
            const row: any = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || '';
            });
            return row;
          });
          setImportPreview(data.slice(0, 5)); // Show first 5 rows
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
      // TODO: Implement the API call to import employees
      console.log('Importing employees from file:', importFile.name);
      console.log('Preview data:', importPreview);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
              {selectedEmployee.firstName} {selectedEmployee.surname}
            </h1>
          </div>
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
              <FaEye /> View
            </button>
            <button className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors">
              <FaEdit /> Edit
            </button>
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
                    <p className="mt-1 text-sm text-gray-900">GSIS-123456789</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">SSS Number</label>
                    <p className="mt-1 text-sm text-gray-900">SSS-987654321</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">PhilHealth Number</label>
                    <p className="mt-1 text-sm text-gray-900">PH-1234567890</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Pag-IBIG Number</label>
                    <p className="mt-1 text-sm text-gray-900">PAG-123456789</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">TIN</label>
                    <p className="mt-1 text-sm text-gray-900">123-456-789-000</p>
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
                    <p className="mt-1 text-sm text-gray-900">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Mobile Number</label>
                    <p className="mt-1 text-sm text-gray-900">+63 912 345 6789</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600">Residential Address</label>
                    <p className="mt-1 text-sm text-gray-900">123 Main Street, Barangay 1, City, Province 1234</p>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-[#800000] flex items-center justify-center">
                          <span className="text-white font-medium">
                            {employee.firstName.charAt(0)}{employee.surname.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.surname}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.employmentType}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.department}
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
                          // TODO: Implement edit functionality
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
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Add New Employee</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Surname</label>
                    <input
                      type="text"
                      value={newEmployee.surname}
                      onChange={(e) => setNewEmployee({...newEmployee, surname: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">First Name</label>
                    <input
                      type="text"
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Middle Name</label>
                    <input
                      type="text"
                      value={newEmployee.middleName}
                      onChange={(e) => setNewEmployee({...newEmployee, middleName: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Name Extension</label>
                    <input
                      type="text"
                      value={newEmployee.nameExtension}
                      onChange={(e) => setNewEmployee({...newEmployee, nameExtension: e.target.value})}
                      placeholder="e.g., Jr., Sr., III"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                    <input
                      type="date"
                      value={newEmployee.birthDate}
                      onChange={(e) => setNewEmployee({...newEmployee, birthDate: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Place of Birth</label>
                    <input
                      type="text"
                      value={newEmployee.birthPlace}
                      onChange={(e) => setNewEmployee({...newEmployee, birthPlace: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Sex</label>
                    <select
                      value={newEmployee.sex}
                      onChange={(e) => setNewEmployee({...newEmployee, sex: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    >
                      <option value="">Select sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Civil Status</label>
                    <select
                      value={newEmployee.civilStatus}
                      onChange={(e) => setNewEmployee({...newEmployee, civilStatus: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    >
                      <option value="">Select status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Email</label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Position</label>
                    <input
                      type="text"
                      value={newEmployee.position}
                      onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Department</label>
                    <input
                      type="text"
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Employment Type</label>
                    <select
                      value={newEmployee.employmentType}
                      onChange={(e) => setNewEmployee({...newEmployee, employmentType: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#800000] focus:ring focus:ring-[#800000] focus:ring-opacity-50"
                      required
                    >
                      <option value="Regular">Regular</option>
                      <option value="Probationary">Probationary</option>
                      <option value="Contract">Contract</option>
                      <option value="Part-time">Part-time</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-[#800000] rounded-lg hover:bg-red-800 transition-colors"
                >
                  Add Employee
                </button>
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
                  surname,firstName,middleName,nameExtension,birthDate,birthPlace,sex,civilStatus,email,position,department,employmentType
                </div>
                <button
                  onClick={() => {
                    const csvContent = "surname,firstName,middleName,nameExtension,birthDate,birthPlace,sex,civilStatus,email,position,department,employmentType\nDoe,John,M,2024-01-01,Manila,Male,Single,john.doe@example.com,Teacher,Education,Regular";
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