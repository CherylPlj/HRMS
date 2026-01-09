'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { RefreshCw, Download, FileSpreadsheet, FileText, Plus, Upload, Pen, Eye, AlertCircle, ChevronDown } from 'lucide-react';
import { EmployeeList, EmployeeDetail, EmployeeDashboard, PhotoModal, SuccessModal, ErrorModal } from './employee';
import { Employee, EmployeeFormState, Department, Pagination as PaginationType } from './employee/types';
import { allExportColumns, excludedColumns, exportColumnSections } from './employee/constants';
import { calculateYearsOfService, formatDesignation } from './employee/utils';

// Import types from employee module
import { Education, EmploymentHistory, MedicalInfo } from './employee/types';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}



const EmployeeContentNew = () => {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Get initial view from URL query parameter, default to 'dashboard'
  const urlView = searchParams.get('view');
  const validViews = ['dashboard', 'list'];
  const initialView = urlView && validViews.includes(urlView) 
    ? urlView as 'dashboard' | 'list' 
    : 'dashboard';
  
  // State for active view (dashboard or list)
  const [activeView, setActiveView] = useState<'dashboard' | 'list'>(initialView);
  
  // Set initial URL if no view parameter exists
  useEffect(() => {
    const currentView = searchParams.get('view');
    if (!currentView) {
      router.replace(`/dashboard/admin/employees?view=dashboard`, { scroll: false });
    }
  }, [router, searchParams]);
  
  // Sync activeView with URL parameter changes (e.g., back button)
  useEffect(() => {
    const currentView = searchParams.get('view');
    if (currentView && validViews.includes(currentView)) {
      setActiveView(currentView as 'dashboard' | 'list');
    } else if (!currentView) {
      setActiveView('dashboard');
    }
  }, [searchParams]);
  
  // Handler to change view and update URL
  const handleViewChange = (viewId: 'dashboard' | 'list') => {
    setActiveView(viewId);
    router.push(`/dashboard/admin/employees?view=${viewId}`, { scroll: false });
  };
  
  // State for employee category (active or inactive)
  const [employeeCategory, setEmployeeCategory] = useState<'active' | 'inactive'>('active');
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('personal');
  
  // State for search and filters
  const [nameOrder, setNameOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportOrderBy, setExportOrderBy] = useState<'LastName' | 'FirstName' | 'EmployeeID'>('LastName');
  const [exportOrderDir, setExportOrderDir] = useState<'asc' | 'desc'>('asc');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [hireDateFrom, setHireDateFrom] = useState('');
  const [hireDateTo, setHireDateTo] = useState('');
  // State for Add Employee modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState<EmployeeFormState>({
    EmployeeID: '',
    UserID: '',
    LastName: '',
    FirstName: '',
    MiddleName: '',
    ExtensionName: '',
    Sex: '',
    Photo: '',
    DateOfBirth: '',
    PlaceOfBirth: '',
    CivilStatus: '',
    Nationality: '',
    Religion: '',
    Email: '',
    Phone: '',
    Address: '',
    PresentAddress: '',
    PermanentAddress: '',
    
    // Government IDs
    SSSNumber: '',
    TINNumber: '',
    PhilHealthNumber: '',
    PagIbigNumber: '',
    GSISNumber: '',
    PRCLicenseNumber: '',
    PRCValidity: '',

    EmploymentStatus: 'Regular',
    HireDate: '',
    ResignationDate: null,
    Designation: null,
    Position: '',
    DepartmentID: null,
    ContractID: null,
    EmergencyContactName: '',
    EmergencyContactNumber: '',
    EmployeeType: 'Regular',
    SalaryGrade: '',
    SalaryAmount: null,

    Education: [],
    EmploymentHistory: [],
    MedicalInfo: {},

    createdAt: null,
    updatedAt: null
  });

  // State for Import Employee modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // State for Export Employee modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    department: 'all',
    designation: 'all',
    status: 'all',
    search: ''
  });
  // Exclude EmployeeID, UserID, createdAt, updatedAt from default selection
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>(
    allExportColumns.filter(col => !excludedColumns.includes(col.key)).map(col => col.key)
  );
  const [pdfPaperSize, setPdfPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [religionConsent, setReligionConsent] = useState(false);
  const [editReligionConsent, setEditReligionConsent] = useState(false);
  const [messengerConsent, setMessengerConsent] = useState(false);
  const [fbLinkConsent, setFbLinkConsent] = useState(false);

  // State for editing mode and edited employee
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<any>(null);
  
  // State for Edit Employee modal - TEMPORARILY DISABLED FOR TESTING
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editEmployee, setEditEmployee] = useState<EmployeeFormState>({
    EmployeeID: '',
    UserID: '',
    LastName: '',
    FirstName: '',
    MiddleName: '',
    ExtensionName: '',
    Sex: '',
    Photo: '',
    DateOfBirth: '',
    PlaceOfBirth: '',
    CivilStatus: '',
    Nationality: '',
    Religion: '',
    Email: '',
    Phone: '',
    Address: '',
    PresentAddress: '',
    PermanentAddress: '',
    
    // Government IDs
    SSSNumber: '',
    TINNumber: '',
    PhilHealthNumber: '',
    PagIbigNumber: '',
    GSISNumber: '',
    PRCLicenseNumber: '',
    PRCValidity: '',

    EmploymentStatus: 'Regular',
    HireDate: '',
    ResignationDate: null,
    Designation: null,
    Position: '',
    DepartmentID: null,
    ContractID: null,
    EmergencyContactName: '',
    EmergencyContactNumber: '',
        EmployeeType: 'Regular',
        SalaryGrade: '',
        SalaryAmount: null,

        Education: [],
        EmploymentHistory: [],
        MedicalInfo: {},

        createdAt: null,
        updatedAt: null
      });

  // Add new state for photo modal
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; alt: string } | null>(null);

  // Add state for success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add state for "Same as Present Address" checkbox
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false);
  const [editSameAsPresentAddress, setEditSameAsPresentAddress] = useState(false);


  // Handle edit button click
  const handleEditClick = () => {
    setEditedEmployee(selectedEmployee);
    setIsEditing(true);
  };

  // Handle save edited employee
  const handleSaveEdit = async () => {
    try {
      if (!editedEmployee?.EmployeeID) {
        throw new Error('Employee ID is missing');
      }

      const updatedEmployee = {
        ...editedEmployee,
        // Convert empty strings to null for optional fields
        MiddleName: editedEmployee.MiddleName || null,
        ExtensionName: editedEmployee.ExtensionName || null,
        PlaceOfBirth: editedEmployee.PlaceOfBirth || null,
        CivilStatus: editedEmployee.CivilStatus || null,
        Nationality: editedEmployee.Nationality || null,
        Religion: editedEmployee.Religion || null,
        Email: editedEmployee.Email || null,
        Phone: editedEmployee.Phone || null,
        Address: editedEmployee.Address || null,
        PresentAddress: editedEmployee.PresentAddress || null,
        PermanentAddress: editedEmployee.PermanentAddress || null,
        
        // Government IDs
        SSSNumber: editedEmployee.SSSNumber || null,
        TINNumber: editedEmployee.TINNumber || null,
        PhilHealthNumber: editedEmployee.PhilHealthNumber || null,
        PagIbigNumber: editedEmployee.PagIbigNumber || null,
        GSISNumber: editedEmployee.GSISNumber || null,
        PRCLicenseNumber: editedEmployee.PRCLicenseNumber || null,
        PRCValidity: editedEmployee.PRCValidity || null,

        // Employment Info
        EmploymentStatus: editedEmployee.EmploymentStatus || 'Regular',
        HireDate: editedEmployee.HireDate,
        ResignationDate: editedEmployee.ResignationDate || null,
        Designation: editedEmployee.Designation || null,
        Position: editedEmployee.Position || null,
        DepartmentID: editedEmployee.DepartmentID || null,
        ContractID: editedEmployee.ContractID || null,
        EmergencyContactName: editedEmployee.EmergencyContactName || null,
        EmergencyContactNumber: editedEmployee.EmergencyContactNumber || null,
        EmployeeType: editedEmployee.EmployeeType || 'Regular',
        SalaryGrade: editedEmployee.SalaryGrade || null,
        Photo: editedEmployee.Photo || null
      };

      console.log('Updating employee:', editedEmployee.EmployeeID, updatedEmployee);

      const response = await fetch(`/api/employees/${editedEmployee.EmployeeID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEmployee),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update employee');
      }

      const result = await response.json();
      
      // Update the employees list with the updated employee
      setEmployees(employees.map(emp => 
        emp.employeeId === editedEmployee.EmployeeID ? { ...emp, ...result } : emp
      ));
      
      // Update the selected employee if it's currently selected
      if (selectedEmployee?.employeeId === editedEmployee.EmployeeID) {
        setSelectedEmployee({ ...selectedEmployee, ...result });
      }

      setIsEditing(false);
      alert('Employee updated successfully');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to update employee');
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
  // Separate pagination for active and inactive categories
  const [activeCategoryPage, setActiveCategoryPage] = useState(1);
  const [inactiveCategoryPage, setInactiveCategoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'paginated' | 'all'>('paginated');
  const [showDetail, setShowDetail] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState(0);

  // Add state for departments - will be fetched from API
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      const data = await response.json();
      
      if (response.ok) {
        const departmentOptions = data.map((dept: any) => ({
          id: dept.DepartmentID,
          name: dept.DepartmentName
        }));
        setDepartments(departmentOptions);
        console.log('Fetched departments:', departmentOptions);
      } else {
        console.error('Failed to fetch departments:', data.error);
        // Fallback to default departments if API fails
        setDepartments([
          { id: 1, name: 'Pre-School' },
          { id: 2, name: 'Primary' },
          { id: 3, name: 'Intermediate' },
          { id: 4, name: 'JHS' },
          { id: 5, name: 'Admin' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to default departments
      setDepartments([
        { id: 1, name: 'Pre-School' },
        { id: 2, name: 'Primary' },
        { id: 3, name: 'Intermediate' },
        { id: 4, name: 'JHS' },
        { id: 5, name: 'Admin' }
      ]);
    }
  };

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (user?.publicMetadata?.role) {
        const role = user.publicMetadata.role.toString().toLowerCase();
        setIsAdmin(role.includes('admin') || role.includes('super admin') || role.includes('superadmin'));
      } else if (user?.emailAddresses?.[0]?.emailAddress) {
        // Fallback: check via API
        try {
          const response = await fetch('/api/verifyUserRole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.emailAddresses[0].emailAddress }),
          });
          if (response.ok) {
            const userData = await response.json();
            const userRoles = userData.Role || [];
            const hasAdminRole = userRoles.some((role: string) => 
              role.toLowerCase().includes('admin') || 
              role.toLowerCase().includes('super admin') ||
              role.toLowerCase().includes('superadmin')
            );
            setIsAdmin(hasAdminRole);
          }
        } catch (error) {
          console.error('Error checking admin role:', error);
        }
      }
    };
    checkAdminRole();
  }, [user]);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees(1);
    fetchAllEmployees(); // Fetch all employees for dashboard statistics
  }, []);

  // Fetch employees from backend API with pagination
  const fetchEmployees = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/employees?page=${page}&limit=10`);
      const data = await response.json();

        if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch employees');
        }
      
      const mappedData = data.employees.map((emp: any) => {
        const employmentDetail = emp.EmploymentDetail?.[0] || {};
        const contactInfo = emp.ContactInfo?.[0] || {};
        const governmentID = emp.GovernmentID?.[0] || {};
        const department = emp.Department || {};  // Fixed: Department is an object, not an array
        const family = emp.Family || [];
        const skills = emp.skills || [];
        const trainings = emp.trainings || [];
        const medicalInfo = emp.MedicalInfo?.[0] || {};
        
        // Debug logging for first employee (paginated)
        if (emp.EmployeeID === '2025-0001') {
          console.log('DEBUG paginated - Raw employee data:', emp);
          console.log('DEBUG paginated - Department object:', emp.Department);
          console.log('DEBUG paginated - Extracted department:', department);
          console.log('DEBUG paginated - Department name:', department.DepartmentName);
          console.log('DEBUG paginated - GovernmentID raw:', emp.GovernmentID);
          console.log('DEBUG paginated - GovernmentID extracted:', governmentID);
          console.log('DEBUG paginated - ContactInfo raw:', emp.ContactInfo);
          console.log('DEBUG paginated - ContactInfo extracted:', contactInfo);
          console.log('DEBUG paginated - Family raw:', emp.Family);
          console.log('DEBUG paginated - Skills raw:', emp.skills);
          console.log('DEBUG paginated - MedicalInfo raw:', emp.MedicalInfo);
        }
        
        return {
          employeeId: emp.EmployeeID,
          id: emp.EmployeeID,
          firstName: emp.FirstName || '',
          surname: emp.LastName || '',
          middleName: emp.MiddleName || '',
          nameExtension: emp.ExtensionName || '',
          fullName: [emp.FirstName, emp.MiddleName, emp.LastName, emp.ExtensionName].filter(Boolean).join(' '),
          birthDate: emp.DateOfBirth ? new Date(emp.DateOfBirth).toISOString().split('T')[0] : '',
          birthPlace: emp.PlaceOfBirth || '',
          sex: emp.Sex || '',
          civilStatus: emp.CivilStatus || '',
          email: contactInfo.Email || emp.UserID || '',
          position: employmentDetail.Position || '',
          designation: employmentDetail.Designation || '',
          departmentId: emp.DepartmentID,
          departmentName: department.DepartmentName || '',
          photo: emp.Photo || '',
          status: employmentDetail.EmploymentStatus || 'Active',
          employeeType: emp.EmployeeType || 'Regular',
          phone: contactInfo.Phone || '',
          hireDate: employmentDetail.HireDate || '',
          salaryGrade: employmentDetail.SalaryGrade || '',
          // Add all other fields from the API response
          ...emp,
          EmploymentDetail: employmentDetail,
          ContactInfo: contactInfo,
          GovernmentID: governmentID,
          Department: department,
          Family: family,
          Skills: skills,
          trainings: trainings,
          MedicalInfo: medicalInfo
        };
      });
      
        setEmployees(mappedData);
      setPagination({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalCount: data.pagination.totalCount,
        limit: data.pagination.limit,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage
      });
      setTotalEmployees(data.pagination.totalCount);
      setIsLoading(false);
      } catch (error) {
        console.error('Error fetching employees:', error);
      setIsLoading(false);
    }
  };

  // Fetch ALL employees without pagination
  const fetchAllEmployees = async () => {
    try {
      setIsLoadingAll(true);
      const response = await fetch('/api/employees?all=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch all employees');
      }
      
      const mappedData = data.employees.map((emp: any) => {
        const employmentDetail = emp.EmploymentDetail?.[0] || {};
        const contactInfo = emp.ContactInfo?.[0] || {};
        const governmentID = emp.GovernmentID?.[0] || {};
        const department = emp.Department || {};  // Fixed: Department is an object, not an array
        const family = emp.Family || [];
        const skills = emp.skills || [];
        const trainings = emp.trainings || [];
        const medicalInfo = emp.MedicalInfo?.[0] || {};
        
        return {
          employeeId: emp.EmployeeID,
          id: emp.EmployeeID,
          firstName: emp.FirstName || '',
          surname: emp.LastName || '',
          middleName: emp.MiddleName || '',
          nameExtension: emp.ExtensionName || '',
          fullName: [emp.FirstName, emp.MiddleName, emp.LastName, emp.ExtensionName].filter(Boolean).join(' '),
          birthDate: emp.DateOfBirth ? new Date(emp.DateOfBirth).toISOString().split('T')[0] : '',
          birthPlace: emp.PlaceOfBirth || '',
          sex: emp.Sex || '',
          civilStatus: emp.CivilStatus || '',
          email: contactInfo.Email || emp.UserID || '',
          position: employmentDetail.Position || '',
          designation: employmentDetail.Designation || '',
          departmentId: emp.DepartmentID,
          departmentName: department.DepartmentName || '',
          photo: emp.Photo || '',
          status: employmentDetail.EmploymentStatus || 'Active',
          employeeType: emp.EmployeeType || 'Regular',
          phone: contactInfo.Phone || '',
          hireDate: employmentDetail.HireDate || '',
          salaryGrade: employmentDetail.SalaryGrade || '',
          // Add all other fields from the API response
          ...emp,
          EmploymentDetail: employmentDetail,
          ContactInfo: contactInfo,
          GovernmentID: governmentID,
          Department: department,
          Family: family,
          Skills: skills,
          trainings: trainings,
          MedicalInfo: medicalInfo
        };
      });
      
      setAllEmployees(mappedData);
      setIsLoadingAll(false);
    } catch (error) {
      console.error('Error fetching all employees:', error);
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


  const handleEmployeeSelect = (employee: any) => {
    console.log('Selected employee:', employee);
    console.log('GovernmentID data:', employee.GovernmentID);
    console.log('ContactInfo data:', employee.ContactInfo);
    console.log('Family data:', employee.Family);
    console.log('Skills data:', employee.Skills);
    console.log('MedicalInfo data:', employee.MedicalInfo);
    setSelectedEmployee(employee);
    setEditedEmployee({
      ...employee,
      EmployeeID: employee.employeeId, // Ensure we're using the correct ID field
    });
    setShowDetail(true);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
  };

  // Implement handleAddEmployee and handleImportEmployees with API calls

  const handleAddEmployee = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      setIsAddingEmployee(true);
      
      // Validate required fields (EmployeeID is auto-generated, so removed from validation)
      const requiredFields = [
        { field: 'FirstName', label: 'First Name' },
        { field: 'LastName', label: 'Last Name' },
        { field: 'DateOfBirth', label: 'Date of Birth' },
        { field: 'Email', label: 'Email' },
        { field: 'Phone', label: 'Phone Number' },
        { field: 'HireDate', label: 'Hire Date' },
        { field: 'Sex', label: 'Sex' }
      ];
      
      const missingFields = requiredFields.filter(({ field }) => !newEmployee[field as keyof EmployeeFormState]);
      
      if (missingFields.length > 0) {
        alert(`Please fill in the following required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      // Validate birth date (1955-2007)
      const birthDate = new Date(newEmployee.DateOfBirth);
      const minBirthDate = new Date('1955-01-01');
      const maxBirthDate = new Date('2007-12-31');
      
      if (birthDate < minBirthDate || birthDate > maxBirthDate) {
        alert('Birth date must be between 1955 and 2007');
        return;
      }

      // Validate hire date (not future, not earlier than 1996)
      const hireDate = new Date(newEmployee.HireDate);
      const today = new Date();
      const minHireDate = new Date('1996-01-01');
      
      if (hireDate > today) {
        alert('Hire date cannot be in the future');
        return;
      }
      
      if (hireDate < minHireDate) {
        alert('Hire date cannot be earlier than 1996');
        return;
      }

      // Validate that hire date is not before birth date
      if (hireDate < birthDate) {
        alert('Hire date cannot be before birth date');
        return;
      }
      
      const employeeData = {
        ...newEmployee,
        // EmployeeID will be auto-generated by the backend
        EmployeeID: undefined,
        // Convert empty strings to null for optional fields
        UserID: null,
        MiddleName: newEmployee.MiddleName || null,
        ExtensionName: newEmployee.ExtensionName || null,
        Email: newEmployee.Email || null,
        Phone: newEmployee.Phone || null,
        Photo: newEmployee.Photo || null,

        // Convert date strings to ISO format
        DateOfBirth: new Date(newEmployee.DateOfBirth).toISOString(),
        HireDate: new Date(newEmployee.HireDate).toISOString(),
        ResignationDate: newEmployee.ResignationDate ? new Date(newEmployee.ResignationDate).toISOString() : null,

        // Convert string IDs to numbers or null
        DepartmentID: newEmployee.DepartmentID || null,
        ContractID: newEmployee.ContractID || null,

        // Remove fields that are not in the form anymore
        PlaceOfBirth: null,
        CivilStatus: null,
        Nationality: null,
        Religion: null,
        Address: null,
        PresentAddress: null,
        PermanentAddress: null,
        SSSNumber: null,
        TINNumber: null,
        PhilHealthNumber: null,
        PagIbigNumber: null,
        GSISNumber: null,
        PRCLicenseNumber: null,
        PRCValidity: null,
        EmergencyContactName: null,
        EmergencyContactNumber: null,

        // Remove createdAt and updatedAt as they are handled by the database
        createdAt: undefined,
        updatedAt: undefined
      };


      
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add employee: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      // Reset form and close modal
      setNewEmployee({
        EmployeeID: '',
        UserID: '',
        LastName: '',
        FirstName: '',
        MiddleName: '',
        ExtensionName: '',
        Sex: '',
        Photo: '',
        DateOfBirth: '',
        PlaceOfBirth: '',
        CivilStatus: '',
        Nationality: '',
        Religion: '',
        Email: '',
        Phone: '',
        Address: '',
        PresentAddress: '',
        PermanentAddress: '',
        SSSNumber: '',
        TINNumber: '',
        PhilHealthNumber: '',
        PagIbigNumber: '',
        GSISNumber: '',
        PRCLicenseNumber: '',
        PRCValidity: '',
        EmploymentStatus: 'Regular',
        HireDate: '',
        ResignationDate: null,
        Designation: null,
        Position: '',
        DepartmentID: null,
        ContractID: null,
        EmergencyContactName: '',
        EmergencyContactNumber: '',
        EmployeeType: 'Regular',
        SalaryGrade: '',
        SalaryAmount: null,
        Education: [],
        EmploymentHistory: [],
        MedicalInfo: {},
        createdAt: null,
        updatedAt: null
      });
      setIsAddModalOpen(false);
      
      // Show success modal with Faculty ID if applicable
      let successMsg = `Successfully added employee ${result.FirstName} ${result.LastName}`;
      if (result.EmployeeID) {
        successMsg += ` (Employee ID: ${result.EmployeeID})`;
      }
      if (newEmployee.Designation === 'Faculty' && result.FacultyID) {
        successMsg += `. Faculty record created with Faculty ID: ${result.FacultyID}`;
      }
      setSuccessMessage(successMsg);
      setShowSuccessModal(true);
      
      // Refresh employee list
      await fetchEmployees();
      
    } catch (error) {
      console.error('Error in handleAddEmployee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add employee. Please try again.';
      alert(errorMessage);
    } finally {
      setIsAddingEmployee(false);
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

  const [errorMessage, setErrorMessage] = useState('');

  const handleImportEmployees = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setErrorMessage('');
    try {
      for (const row of importPreview) {
        const response = await fetch('/api/employees/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import employee');
        }
      }
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setSuccessMessage('Employees imported successfully!');
      setShowSuccessModal(true);
      await fetchEmployees();
    } catch (error) {
      console.error('Error importing employees:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import employees.');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle export employees
  const handleExportEmployees = async () => {
    setIsExporting(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({
        format: exportFormat,
        department: exportFilters.department,
        designation: exportFilters.designation,
        status: exportFilters.status,
        search: exportFilters.search,
        columns: selectedExportColumns.join(','),
        orderBy: exportOrderBy,
        orderDir: exportOrderDir,
      });
      if (exportFormat === 'pdf') {
        params.append('paperSize', pdfPaperSize);
        params.append('orientation', pdfOrientation);
      }
      if (hireDateFrom) {
        params.append('hireDateFrom', hireDateFrom);
      }
      if (hireDateTo) {
        params.append('hireDateTo', hireDateTo);
      }
      const response = await fetch(`/api/employees/export?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to export employees';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `employees_export_${new Date().toISOString().split('T')[0]}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExportModalOpen(false);
      setSuccessMessage(`Successfully exported ${exportFormat.toUpperCase()} file`);
      setShowSuccessModal(true);
      await fetchEmployees();
    } catch (error) {
      console.error('Error exporting employees:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export employees.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle quick export with current filters
  const handleQuickExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      // Build query parameters using current filters
      const params = new URLSearchParams({
        format: format,
        department: departmentFilter,
        designation: designationFilter,
        status: statusFilter,
        search: searchTerm
      });

      const response = await fetch(`/api/employees/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export employees');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `employees_export_${new Date().toISOString().split('T')[0]}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success message
      setSuccessMessage(`Successfully exported ${format.toUpperCase()} file with current filters`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error exporting employees:', error);
      alert('Failed to export employees. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Add handler for photo click
  const handlePhotoClick = (e: React.MouseEvent, photoUrl: string, alt: string) => {
    e.stopPropagation();
    if (!photoUrl) return;
    setSelectedPhoto({ url: photoUrl, alt });
    setIsPhotoModalOpen(true);
  };

  // Add modal close handler
  const handleClosePhotoModal = () => {
    setIsPhotoModalOpen(false);
    setSelectedPhoto(null);
  };

  // State for generate user ID loading
  const [isGeneratingUserId, setIsGeneratingUserId] = useState(false);
  
  // State for generate employee ID loading
  const [isGeneratingEmployeeId, setIsGeneratingEmployeeId] = useState(false);

  // State for form submission loading
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);

  // Handle generate user ID - automatically prevents duplicates by finding next available number
  const handleGenerateUserId = async () => {
    setIsGeneratingUserId(true);
    try {
      // Call the API endpoint to generate user ID on the server
      const response = await fetch('/api/generate-user-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hireDate: newEmployee.HireDate || new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate user ID');
      }

      const { userId } = await response.json();
      setNewEmployee({...newEmployee, UserID: userId});
    } catch (error) {
      console.error('Error generating user ID:', error);
      alert('Failed to generate user ID. Please try again.');
    } finally {
      setIsGeneratingUserId(false);
    }
  };

  // Handle generate employee ID - automatically prevents duplicates by finding next available number
  const handleGenerateEmployeeId = async () => {
    setIsGeneratingEmployeeId(true);
    try {
      // Call the API endpoint to generate employee ID on the server
      const response = await fetch('/api/generate-employee-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate employee ID');
      }

      const { employeeId } = await response.json();
      setNewEmployee({...newEmployee, EmployeeID: employeeId});
    } catch (error) {
      console.error('Error generating employee ID:', error);
      alert('Failed to generate employee ID. Please try again.');
    } finally {
      setIsGeneratingEmployeeId(false);
    }
  };

  // Reset form to initial state
  const resetEmployeeForm = () => {
    setNewEmployee({
      EmployeeID: '',
      UserID: '',
      LastName: '',
      FirstName: '',
      MiddleName: '',
      ExtensionName: '',
      Sex: '',
      Photo: '',
      DateOfBirth: '',
      PlaceOfBirth: '',
      CivilStatus: '',
      Nationality: '',
      Religion: '',
      Email: '',
      Phone: '',
      Address: '',
      PresentAddress: '',
      PermanentAddress: '',
      
      // Government IDs
      SSSNumber: '',
      TINNumber: '',
      PhilHealthNumber: '',
      PagIbigNumber: '',
      GSISNumber: '',
      PRCLicenseNumber: '',
      PRCValidity: '',

      EmploymentStatus: 'Regular',
      HireDate: '',
      ResignationDate: null,
      Designation: null,
      Position: '',
      DepartmentID: null,
      ContractID: null,
      EmergencyContactName: '',
      EmergencyContactNumber: '',
      EmployeeType: 'Regular',
      SalaryGrade: '',
      SalaryAmount: null,

      Education: [],
      EmploymentHistory: [],
      MedicalInfo: {},

      createdAt: null,
      updatedAt: null
    });
    // Reset checkbox states
    setSameAsPresentAddress(false);
  };

  // Handle closing the add employee modal
  const handleCloseAddModal = () => {
    resetEmployeeForm();
    setIsAddModalOpen(false);
  };

  // Handle opening edit modal
  const handleEditEmployee = (employee: any) => {
    console.log('Opening edit modal for employee:', employee);
    console.log('Available fields:', Object.keys(employee));
    
    // Populate the edit form with employee data
    setEditEmployee({
      EmployeeID: employee.employeeId || '',
      UserID: employee.UserID || '',
      LastName: employee.surname || '',
      FirstName: employee.firstName || '',
      MiddleName: employee.middleName || '',
      ExtensionName: employee.nameExtension || '',
      Sex: employee.sex || '',
      Photo: employee.photo || '',
      DateOfBirth: employee.DateOfBirth ? new Date(employee.DateOfBirth).toISOString().split('T')[0] : (employee.birthDate || ''),
      PlaceOfBirth: employee.PlaceOfBirth || '',
      CivilStatus: employee.CivilStatus || '',
      Nationality: employee.Nationality || '',
      Religion: employee.Religion || '',
      Email: employee.ContactInfo?.Email || employee.email || '',
      Phone: employee.ContactInfo?.Phone || employee.phone || '',
      Address: employee.Address || '',
      PresentAddress: employee.ContactInfo?.PresentAddress || employee.PresentAddress || '',
      PermanentAddress: employee.ContactInfo?.PermanentAddress || employee.PermanentAddress || '',
      
      // Government IDs
      SSSNumber: employee.GovernmentID?.SSSNumber || '',
      TINNumber: employee.GovernmentID?.TINNumber || '',
      PhilHealthNumber: employee.GovernmentID?.PhilHealthNumber || '',
      PagIbigNumber: employee.GovernmentID?.PagIbigNumber || '',
      GSISNumber: employee.GovernmentID?.GSISNumber || '',
      PRCLicenseNumber: employee.GovernmentID?.PRCLicenseNumber || '',
      PRCValidity: employee.GovernmentID?.PRCValidity || '',

      EmploymentStatus: employee.EmploymentDetail?.EmploymentStatus || employee.status || 'Regular',
      HireDate: employee.EmploymentDetail?.HireDate ? new Date(employee.EmploymentDetail.HireDate).toISOString().split('T')[0] : (employee.hireDate || ''),
      ResignationDate: employee.EmploymentDetail?.ResignationDate || employee.resignationDate || null,
      Designation: employee.EmploymentDetail?.Designation || employee.designation || null,
      Position: employee.EmploymentDetail?.Position || employee.position || '',
      DepartmentID: employee.DepartmentID || null,
      ContractID: employee.ContractID || null,
      EmergencyContactName: employee.ContactInfo?.EmergencyContactName || employee.EmergencyContactName || '',
      EmergencyContactNumber: employee.ContactInfo?.EmergencyContactNumber || employee.EmergencyContactNumber || '',
      EmployeeType: employee.EmployeeType || 'Regular',
      SalaryGrade: employee.EmploymentDetail?.SalaryGrade || employee.SalaryGrade || '',
      SalaryAmount: employee.EmploymentDetail?.SalaryAmount || employee.SalaryAmount || null,

      Education: employee.Education || [],
      EmploymentHistory: employee.EmploymentHistory || [],
      MedicalInfo: employee.MedicalInfo || {},

      createdAt: employee.createdAt || null,
      updatedAt: employee.updatedAt || null
    });
    // Initialize checkbox state based on whether addresses are the same
    const presentAddress = employee.ContactInfo?.PresentAddress || employee.PresentAddress || '';
    const permanentAddress = employee.ContactInfo?.PermanentAddress || employee.PermanentAddress || '';
    setEditSameAsPresentAddress(presentAddress === permanentAddress && presentAddress !== '');
    setIsEditModalOpen(true);
  };

  // Handle updating employee
  const handleUpdateEmployee = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      setIsUpdatingEmployee(true);
      
      // Validate birth date (1955-2007)
      if (editEmployee.DateOfBirth) {
        const birthDate = new Date(editEmployee.DateOfBirth);
        const minBirthDate = new Date('1955-01-01');
        const maxBirthDate = new Date('2007-12-31');
        
        if (birthDate < minBirthDate || birthDate > maxBirthDate) {
          alert('Birth date must be between 1955 and 2007');
          return;
        }
      }

      // Validate hire date (not future, not earlier than 1996)
      if (editEmployee.HireDate) {
        const hireDate = new Date(editEmployee.HireDate);
        const today = new Date();
        const minHireDate = new Date('1996-01-01');
        
        if (hireDate > today) {
          alert('Hire date cannot be in the future');
          return;
        }
        
        if (hireDate < minHireDate) {
          alert('Hire date cannot be earlier than 1996');
          return;
        }

        // Validate that hire date is not before birth date
        if (editEmployee.DateOfBirth) {
          const birthDate = new Date(editEmployee.DateOfBirth);
          if (hireDate < birthDate) {
            alert('Hire date cannot be before birth date');
            return;
          }
        }
      }
      
      const employeeData = {
        ...editEmployee,
        // Convert empty strings to null for optional fields
        MiddleName: editEmployee.MiddleName || null,
        ExtensionName: editEmployee.ExtensionName || null,
        PlaceOfBirth: editEmployee.PlaceOfBirth || null,
        CivilStatus: editEmployee.CivilStatus || null,
        Nationality: editEmployee.Nationality || null,
        Religion: editEmployee.Religion || null,
        PresentAddress: editEmployee.PresentAddress || null,
        PermanentAddress: editEmployee.PermanentAddress || null,
        
        // Government IDs
        SSSNumber: editEmployee.SSSNumber || null,
        TINNumber: editEmployee.TINNumber || null,
        PhilHealthNumber: editEmployee.PhilHealthNumber || null,
        PagIbigNumber: editEmployee.PagIbigNumber || null,
        GSISNumber: editEmployee.GSISNumber || null,
        PRCLicenseNumber: editEmployee.PRCLicenseNumber || null,
        PRCValidity: editEmployee.PRCValidity || null,

        // Employment Info
        ResignationDate: editEmployee.ResignationDate || null,
        // Automatically set status to "Resigned" if resignation date is provided
        EmploymentStatus: editEmployee.ResignationDate ? 'Resigned' : editEmployee.EmploymentStatus,
        Designation: editEmployee.Designation || null,
        ContractID: editEmployee.ContractID || null,
        EmergencyContactName: editEmployee.EmergencyContactName || null,
        EmergencyContactNumber: editEmployee.EmergencyContactNumber || null,
        SalaryGrade: editEmployee.SalaryGrade || null,
        SalaryAmount: editEmployee.SalaryAmount || null,
        Photo: editEmployee.Photo || null
      };

      const response = await fetch(`/api/employees/${editEmployee.EmployeeID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      const result = await response.json();

      // Close modal and show success
      setIsEditModalOpen(false);
      setSuccessMessage(`Successfully updated employee ${result.FirstName} ${result.LastName}`);
      setShowSuccessModal(true);
      
      // Refresh employee list based on current view mode
      if (viewMode === 'all') {
        await fetchAllEmployees();
      } else {
        await fetchEmployees(pagination.currentPage);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(error instanceof Error ? error.message : 'Failed to update employee. Please try again.');
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  // Handle closing the edit employee modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditSameAsPresentAddress(false);
  };


  // If an employee is selected, show the personal data tabs
  if (selectedEmployee) {
    return (
      <>
        <EmployeeDetail
          employee={selectedEmployee}
          departments={departments}
          onBack={handleBackToList}
          onPhotoClick={handlePhotoClick}
        />

        <PhotoModal
          isOpen={isPhotoModalOpen}
          photo={selectedPhoto}
          onClose={handleClosePhotoModal}
        />
        <SuccessModal
          isOpen={showSuccessModal}
          message={successMessage}
          onClose={() => setShowSuccessModal(false)}
        />
        <ErrorModal
          isOpen={!!errorMessage}
          message={errorMessage}
          onClose={() => setErrorMessage('')}
        />
      </>
    );
  }

  // Main employee view with dashboard/list toggle
  return (
    <>
      {/* View Toggle Buttons */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => handleViewChange('dashboard')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'dashboard'
                ? 'bg-[#800000] text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleViewChange('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeView === 'list'
                ? 'bg-[#800000] text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Employee List
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="p-6">
          <EmployeeDashboard 
            employees={allEmployees.length > 0 ? allEmployees : employees}
            departments={departments}
          />
        </div>
      )}

      {/* List View */}
      {activeView === 'list' && (() => {
        // Filter employees by category
        const isActiveEmployee = (e: any) => e.status !== 'Resigned' && e.status !== 'Retired' && e.status !== 'resigned' && e.status !== 'retired';
        const isInactiveEmployee = (e: any) => e.status === 'Resigned' || e.status === 'Retired' || e.status === 'resigned' || e.status === 'retired';
        
        // Get all employees for the current category
        const categoryAllEmployees = employeeCategory === 'active' 
          ? allEmployees.filter(isActiveEmployee)
          : allEmployees.filter(isInactiveEmployee);
        
        // Calculate category-specific pagination
        const currentCategoryPage = employeeCategory === 'active' ? activeCategoryPage : inactiveCategoryPage;
        const categoryTotalCount = categoryAllEmployees.length;
        const categoryTotalPages = Math.max(1, Math.ceil(categoryTotalCount / ITEMS_PER_PAGE));
        
        // Ensure current page is within bounds
        const validCurrentPage = Math.min(currentCategoryPage, categoryTotalPages);
        
        // Paginate the category employees for display
        const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedCategoryEmployees = categoryAllEmployees.slice(startIndex, endIndex);
        
        // Create category-specific pagination object
        const categoryPagination = {
          currentPage: validCurrentPage,
          totalPages: categoryTotalPages,
          totalCount: categoryTotalCount,
          limit: ITEMS_PER_PAGE,
          hasNextPage: validCurrentPage < categoryTotalPages,
          hasPrevPage: validCurrentPage > 1
        };
        
        // Handle page change for the current category
        const handleCategoryPageChange = (newPage: number) => {
          if (newPage >= 1 && newPage <= categoryTotalPages) {
            if (employeeCategory === 'active') {
              setActiveCategoryPage(newPage);
            } else {
              setInactiveCategoryPage(newPage);
            }
          }
        };

        // Client-side export for current category - exports what's visible on screen
        // Only includes columns visible in the table: Employee Name, Position, Designation, Department, Email
        const handleCategoryQuickExport = async (format: 'csv' | 'pdf') => {
          setIsExporting(true);
          try {
            // Use the filtered employees from the current category (respects search/filters too)
            const employeesToExport = viewMode === 'all' ? categoryAllEmployees : paginatedCategoryEmployees;
            
            if (employeesToExport.length === 0) {
              alert('No employees to export');
              setIsExporting(false);
              return;
            }

            // Helper function to format employee name
            const formatEmployeeName = (emp: any) => {
              const parts = [
                emp.firstName || emp.FirstName || '',
                emp.middleName || emp.MiddleName || '',
                emp.surname || emp.LastName || '',
                emp.nameExtension || emp.ExtensionName || ''
              ].filter(Boolean);
              return parts.join(' ');
            };

            // Helper function to format designation (replace underscores with spaces)
            const formatDesignation = (designation: string) => {
              return (designation || '').replace(/_/g, ' ');
            };

            if (format === 'csv') {
              // Generate CSV client-side - only table columns
              const headers = ['Employee Name', 'Position', 'Designation', 'Department', 'Email'];
              
              const csvRows = [headers.join(',')];
              
              employeesToExport.forEach((emp: any) => {
                const row = [
                  formatEmployeeName(emp),
                  emp.position || emp.EmploymentDetail?.Position || '',
                  formatDesignation(emp.designation || emp.EmploymentDetail?.Designation || ''),
                  emp.departmentName || emp.Department?.DepartmentName || '',
                  emp.email || emp.ContactInfo?.Email || ''
                ].map(field => {
                  // Escape commas and quotes in CSV
                  const str = String(field || '');
                  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                });
                csvRows.push(row.join(','));
              });
              
              const csvContent = csvRows.join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const categoryName = employeeCategory === 'active' ? 'active' : 'retired_resigned';
              a.download = `employees_${categoryName}_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              setSuccessMessage(`Successfully exported ${employeesToExport.length} ${employeeCategory} employees to CSV`);
              setShowSuccessModal(true);
            } else {
              // For PDF, generate client-side with only table columns
              const categoryName = employeeCategory === 'active' ? 'active' : 'retired_resigned';
              const reportTitle = employeeCategory === 'active' ? 'Active Employees Report' : 'Retired/Resigned Employees Report';
              
              // Build table rows
              const tableRows = employeesToExport.map((emp: any) => `
                <tr>
                  <td>${formatEmployeeName(emp)}</td>
                  <td>${emp.position || emp.EmploymentDetail?.Position || ''}</td>
                  <td>${formatDesignation(emp.designation || emp.EmploymentDetail?.Designation || '')}</td>
                  <td>${emp.departmentName || emp.Department?.DepartmentName || ''}</td>
                  <td>${emp.email || emp.ContactInfo?.Email || ''}</td>
                </tr>
              `).join('');
              
              const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>${reportTitle}</title>
                  <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; font-size: 12px; }
                    th { background-color: #800000; color: white; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    tr:hover { background-color: #f5f5f5; }
                    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #800000; }
                    .header h1 { color: #800000; margin: 0 0 10px 0; font-size: 24px; }
                    .header p { color: #666; margin: 5px 0; font-size: 12px; }
                    @media print {
                      body { padding: 0; }
                      table { page-break-inside: auto; }
                      tr { page-break-inside: avoid; }
                    }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1>${reportTitle}</h1>
                    <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                    <p>Total Employees: ${employeesToExport.length}</p>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Position</th>
                        <th>Designation</th>
                        <th>Department</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tableRows}
                    </tbody>
                  </table>
                </body>
                </html>
              `;
              
              // Open print dialog for PDF
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                // Give time for content to render, then trigger print
                setTimeout(() => {
                  printWindow.print();
                }, 250);
              }
              
              setSuccessMessage(`PDF ready for ${employeesToExport.length} ${employeeCategory} employees`);
              setShowSuccessModal(true);
            }
          } catch (error) {
            console.error('Error exporting employees:', error);
            alert('Failed to export employees. Please try again.');
          } finally {
            setIsExporting(false);
          }
        };

        return (
          <>
            {/* Employee Category Tabs (Active/Inactive) */}
            <div className="mb-6 flex space-x-4 border-b border-gray-200">
              <button
                onClick={() => {
                  setEmployeeCategory('active');
                  setViewMode('paginated'); // Reset to paginated view when switching categories
                }}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  employeeCategory === 'active'
                    ? 'border-[#800000] text-[#800000]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Active Employees ({allEmployees.filter(isActiveEmployee).length})
              </button>
              <button
                onClick={() => {
                  setEmployeeCategory('inactive');
                  setViewMode('paginated'); // Reset to paginated view when switching categories
                }}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  employeeCategory === 'inactive'
                    ? 'border-[#800000] text-[#800000]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Retired/Resigned Employees ({allEmployees.filter(isInactiveEmployee).length})
              </button>
              {employeeCategory === 'inactive' && (
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span>Data retention: 3 years per Data Privacy Act (Philippines) & DOLE requirements</span>
                </div>
              )}
            </div>

            <EmployeeList
              employees={paginatedCategoryEmployees}
              allEmployees={categoryAllEmployees}
              departments={departments}
              pagination={categoryPagination}
              viewMode={viewMode}
              isLoading={isLoading || isLoadingAll}
              isLoadingAll={isLoadingAll}
              isExporting={isExporting}
              searchTerm={searchTerm}
              departmentFilter={departmentFilter}
              designationFilter={designationFilter}
              statusFilter={employeeCategory === 'active' ? statusFilter : (statusFilter === 'all' ? 'all' : statusFilter)}
              nameOrder={nameOrder}
              onSearchChange={setSearchTerm}
              onDepartmentFilterChange={setDepartmentFilter}
              onDesignationFilterChange={setDesignationFilter}
              onStatusFilterChange={setStatusFilter}
              onNameOrderChange={setNameOrder}
              onEmployeeSelect={handleEmployeeSelect}
              onEmployeeEdit={handleEditEmployee}
              onPhotoClick={handlePhotoClick}
              onPageChange={handleCategoryPageChange}
              onToggleView={handleToggleView}
              onAddEmployee={() => setIsAddModalOpen(true)}
              onImportEmployees={() => setIsImportModalOpen(true)}
              onExportEmployees={() => setIsExportModalOpen(true)}
              onQuickExport={handleCategoryQuickExport}
              showDataRetention={employeeCategory === 'inactive'}
            />
          </>
        );
      })()}

      {/* Add Employee Modal - Modern & User-Friendly */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden" style={{ backgroundColor: 'white' }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#800000] to-red-700 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">Add New Employee</h2>
                  <p className="text-red-100 mt-1">Fill in the employee information below</p>
                </div>
              <button
                onClick={handleCloseAddModal}
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            First Name
                          </label>
                    <input
                            type="text"
                            value={newEmployee.FirstName}
                            onChange={(e) => setNewEmployee({...newEmployee, FirstName: e.target.value})}
                            placeholder="First Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                      required
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={newEmployee.LastName}
                            onChange={(e) => setNewEmployee({...newEmployee, LastName: e.target.value})}
                            placeholder="Last Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={newEmployee.MiddleName}
                            onChange={(e) => setNewEmployee({...newEmployee, MiddleName: e.target.value})}
                            placeholder="Middle Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Extension Name
                          </label>
                          <input
                            type="text"
                            value={newEmployee.ExtensionName}
                            onChange={(e) => setNewEmployee({...newEmployee, ExtensionName: e.target.value})}
                            placeholder="Jr., Sr., III, etc."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Sex
                          </label>
                          <div className="relative">
                            <select
                              value={newEmployee.Sex}
                              onChange={(e) => setNewEmployee({...newEmployee, Sex: e.target.value})}
                              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white appearance-none cursor-pointer"
                              required
                            >
                              <option value="">Select sex...</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Intersex">Intersex</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Photo
                          </label>
                          <div className="flex flex-col items-start space-y-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Create a FileReader to read the image
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    // Create an image element to check dimensions
                                    const img = new Image();
                                    img.onload = () => {
                                      // Check if image is roughly 2x2 (allow some flexibility)
                                      const aspectRatio = img.width / img.height;
                                      if (aspectRatio < 0.9 || aspectRatio > 1.1) {
                                        alert('Please upload a square (2x2) image');
                                        return;
                                      }
                                      // Set the image data URL
                                      setNewEmployee({...newEmployee, Photo: event.target?.result as string});
                                    };
                                    img.src = event.target?.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                            />
                            {newEmployee.Photo && (
                              <div className="relative w-[200px] h-[200px] border-2 border-gray-200 rounded-lg overflow-hidden">
                                <img
                                  src={newEmployee.Photo}
                                  alt="Employee photo preview"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNewEmployee({...newEmployee, Photo: ''})}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            <p className="text-sm text-gray-500">
                              Upload a square (2x2) photo. Supported formats: JPG, PNG
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Date of Birth
                          </label>
                    <input
                            type="date"
                            value={newEmployee.DateOfBirth}
                            onChange={(e) => setNewEmployee({...newEmployee, DateOfBirth: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

                    {/* Step 2: Contact Information */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">2</div>
                        <h3 className="text-xl font-bold text-gray-800">Contact Information</h3>
                  </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Email
                          </label>
                    <input
                            type="email"
                            value={newEmployee.Email}
                            onChange={(e) => setNewEmployee({...newEmployee, Email: e.target.value})}
                            placeholder="email@example.com"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                            required
                    />
                  </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={newEmployee.Phone}
                            onChange={(e) => setNewEmployee({...newEmployee, Phone: e.target.value})}
                            placeholder="09123456789"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Employment Details */}
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
                        <h3 className="text-xl font-bold text-gray-800">Employment Details</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newEmployee.Designation === 'Faculty' && (
                          <div className="space-y-2 md:col-span-3">
                            <label className="flex text-sm font-semibold text-gray-700 items-center">
                              <span className="text-purple-600 mr-1">✓</span>
                              Faculty ID
                            </label>
                            <div className="w-full px-4 py-3 border-2 border-purple-200 rounded-lg bg-purple-50">
                              <p className="text-sm text-purple-700 font-medium">
                                ✓ Will be auto-generated when employee is successfully created
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Employment Status
                          </label>
                          <div className="relative">
                            <select
                              value={newEmployee.EmploymentStatus}
                              onChange={(e) => setNewEmployee({...newEmployee, EmploymentStatus: e.target.value})}
                              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white appearance-none cursor-pointer"
                              required
                            >
                              <option value="Regular">Regular</option>
                              <option value="Probationary">Probationary</option>
                              <option value="Hired">Hired</option>
                              <option value="Resigned">Resigned</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                  </div>

                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Hire Date
                          </label>
                                <input
                            type="date"
                            value={newEmployee.HireDate}
                            onChange={(e) => setNewEmployee({...newEmployee, HireDate: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Resignation Date
                              </label>
                          <input
                            type="date"
                            value={newEmployee.ResignationDate || ''}
                            onChange={(e) => setNewEmployee({...newEmployee, ResignationDate: e.target.value || null})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                          />
                          </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Position <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newEmployee.Position}
                            onChange={(e) => setNewEmployee({...newEmployee, Position: e.target.value})}
                            placeholder="Job Position"
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                          />
                  </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Designation <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={newEmployee.Designation || ''}
                              onChange={(e) => setNewEmployee({...newEmployee, Designation: e.target.value || null})}
                              required
                              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white appearance-none cursor-pointer"
                            >
                              <option value="">Select designation...</option>
                              <option value="President">President</option>
                              <option value="Admin_Officer">Admin Officer</option>
                              <option value="Vice_President">Vice President</option>
                              <option value="Registrar">Registrar</option>
                              <option value="Faculty">Faculty</option>
                              <option value="Principal">Principal</option>
                              <option value="Cashier">Cashier</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Department
                          </label>
                          <div className="relative">
                            <select
                              value={newEmployee.DepartmentID || ''}
                              onChange={(e) => setNewEmployee({...newEmployee, DepartmentID: parseInt(e.target.value) || null})}
                              className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white appearance-none cursor-pointer"
                            >
                              <option value="">Select department...</option>
                              {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                  {dept.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Salary Grade
                          </label>
                          <input
                            type="text"
                            value={newEmployee.SalaryGrade}
                            onChange={(e) => setNewEmployee({...newEmployee, SalaryGrade: e.target.value})}
                            placeholder="Salary Grade"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Salary Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newEmployee.SalaryAmount || ''}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              if (value === '') {
                                setNewEmployee({...newEmployee, SalaryAmount: null});
                              } else {
                                const parsed = parseFloat(value);
                                setNewEmployee({...newEmployee, SalaryAmount: isNaN(parsed) ? null : parsed});
                              }
                            }}
                            placeholder="Enter salary amount"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
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
                  onClick={handleCloseAddModal}
                      className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingEmployee}
                  className="px-8 py-3 text-white bg-gradient-to-r from-[#800000] to-red-700 rounded-lg hover:from-red-800 hover:to-red-900 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isAddingEmployee ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding Employee...
                    </>
                  ) : (
                    'Add Employee'
                  )}
                </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal - Modern & User-Friendly */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden" style={{ backgroundColor: 'white' }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">Edit Employee</h2>
                  <p className="text-blue-100 mt-1">Update employee information below</p>
                </div>
                <button
                  onClick={handleCloseEditModal}
                  className="text-white hover:text-blue-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable with Form */}
            <form onSubmit={handleUpdateEmployee} className="flex flex-col h-full">
              <div className="overflow-y-auto max-h-[calc(95vh-200px)] flex-1">
                <div className="p-8">
                  <div className="space-y-8">
                    {/* For admins, only show Employment Details */}
                    {isAdmin ? (
                      <>
                        {/* Step 4: Employment Details - Only section for admins */}
                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
                          <div className="flex items-center mb-6">
                            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">1</div>
                            <h3 className="text-xl font-bold text-gray-800">Employment Details</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="flex text-sm font-semibold text-gray-700 items-center">
                                <span className="text-red-500 mr-1">*</span>
                                Employment Status
                              </label>
                              <select
                                value={editEmployee.EmploymentStatus}
                                onChange={(e) => setEditEmployee({...editEmployee, EmploymentStatus: e.target.value})}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              >
                                <option value="">Select status...</option>
                                <option value="Regular">Regular</option>
                                <option value="Probationary">Probationary</option>
                                <option value="Hired">Hired</option>
                                <option value="Resigned">Resigned</option>
                                <option value="Retired">Retired</option>
                              </select>
                              {editEmployee.ResignationDate && editEmployee.EmploymentStatus !== 'Resigned' && (
                                <p className="text-sm text-yellow-600 mt-1">
                                  ⚠️ Status will be automatically set to "Resigned" when saved
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="flex text-sm font-semibold text-gray-700 items-center">
                                <span className="text-red-500 mr-1">*</span>
                                Hire Date
                              </label>
                              <input
                                type="date"
                                value={editEmployee.HireDate}
                                onChange={(e) => setEditEmployee({...editEmployee, HireDate: e.target.value})}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Resignation Date
                              </label>
                              <input
                                type="date"
                                value={editEmployee.ResignationDate || ''}
                                onChange={(e) => {
                                  const resignationDate = e.target.value || null;
                                  // Automatically set status to "Resigned" when resignation date is added
                                  const updatedEmployee = {
                                    ...editEmployee,
                                    ResignationDate: resignationDate,
                                    EmploymentStatus: resignationDate ? 'Resigned' : editEmployee.EmploymentStatus
                                  };
                                  setEditEmployee(updatedEmployee);
                                }}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              />
                              {editEmployee.ResignationDate && (
                                <p className="text-sm text-blue-600 mt-1">
                                  ✓ Status will be automatically set to "Resigned"
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Position <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={editEmployee.Position}
                                onChange={(e) => setEditEmployee({...editEmployee, Position: e.target.value})}
                                placeholder="Position"
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Designation <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={editEmployee.Designation || ''}
                                onChange={(e) => setEditEmployee({...editEmployee, Designation: e.target.value})}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              >
                                <option value="">Select designation...</option>
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
                                Department <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={editEmployee.DepartmentID || ''}
                                onChange={(e) => setEditEmployee({...editEmployee, DepartmentID: parseInt(e.target.value) || null})}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              >
                                <option value="">Select department...</option>
                                {departments.map((dept) => (
                                  <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Salary Grade
                              </label>
                              <input
                                type="text"
                                value={editEmployee.SalaryGrade}
                                onChange={(e) => setEditEmployee({...editEmployee, SalaryGrade: e.target.value})}
                                placeholder="Salary Grade"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-gray-700">
                                Salary Amount
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={editEmployee.SalaryAmount || ''}
                                onChange={(e) => {
                                  const value = e.target.value.trim();
                                  if (value === '') {
                                    setEditEmployee({...editEmployee, SalaryAmount: null});
                                  } else {
                                    const parsed = parseFloat(value);
                                    setEditEmployee({...editEmployee, SalaryAmount: isNaN(parsed) ? null : parsed});
                                  }
                                }}
                                placeholder="Salary Amount"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-0 transition-colors bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Step 1: Basic Information */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">1</div>
                        <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Employee ID
                          </label>
                          <input
                            type="text"
                            value={editEmployee.EmployeeID}
                            placeholder="Employee ID"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                            required
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            User ID
                          </label>
                          <input
                            type="text"
                            value={editEmployee.UserID}
                            placeholder="User ID"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editEmployee.FirstName}
                            onChange={(e) => setEditEmployee({...editEmployee, FirstName: e.target.value})}
                            placeholder="First Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editEmployee.LastName}
                            onChange={(e) => setEditEmployee({...editEmployee, LastName: e.target.value})}
                            placeholder="Last Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Middle Name
                          </label>
                          <input
                            type="text"
                            value={editEmployee.MiddleName}
                            onChange={(e) => setEditEmployee({...editEmployee, MiddleName: e.target.value})}
                            placeholder="Middle Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Extension Name
                          </label>
                          <input
                            type="text"
                            value={editEmployee.ExtensionName}
                            onChange={(e) => setEditEmployee({...editEmployee, ExtensionName: e.target.value})}
                            placeholder="Jr., Sr., III, etc."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Sex
                          </label>
                          <select
                            value={editEmployee.Sex}
                            onChange={(e) => setEditEmployee({...editEmployee, Sex: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                            required
                          >
                            <option value="">Select sex...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Intersex">Intersex</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Photo
                          </label>
                          <div className="flex flex-col items-start space-y-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const img = new Image();
                                    img.onload = () => {
                                      const aspectRatio = img.width / img.height;
                                      if (aspectRatio < 0.9 || aspectRatio > 1.1) {
                                        alert('Please upload a square (2x2) image');
                                        return;
                                      }
                                      setEditEmployee({...editEmployee, Photo: event.target?.result as string});
                                    };
                                    img.src = event.target?.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                            />
                            {editEmployee.Photo && (
                              <div className="relative w-[200px] h-[200px] border-2 border-gray-200 rounded-lg overflow-hidden">
                                <img
                                  src={editEmployee.Photo}
                                  alt="Employee photo preview"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditEmployee({...editEmployee, Photo: ''})}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            <p className="text-sm text-gray-500">
                              Upload a square (2x2) photo. Supported formats: JPG, PNG
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={editEmployee.DateOfBirth}
                            onChange={(e) => setEditEmployee({...editEmployee, DateOfBirth: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Place of Birth
                          </label>
                          <input
                            type="text"
                            value={editEmployee.PlaceOfBirth}
                            onChange={(e) => setEditEmployee({...editEmployee, PlaceOfBirth: e.target.value})}
                            placeholder="City, Province"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Civil Status
                          </label>
                          <select
                            value={editEmployee.CivilStatus}
                            onChange={(e) => setEditEmployee({...editEmployee, CivilStatus: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          >
                            <option value="">Select status...</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Nationality
                          </label>
                          <input
                            type="text"
                            value={editEmployee.Nationality}
                            onChange={(e) => setEditEmployee({...editEmployee, Nationality: e.target.value})}
                            placeholder="e.g., Filipino"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Religion <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={editEmployee.Religion || ''}
                            onChange={(e) => setEditEmployee({...editEmployee, Religion: e.target.value})}
                            placeholder="Religion (optional)"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-0 transition-colors bg-white"
                          />
                          {editEmployee.Religion && (
                            <div className="flex items-start mt-2">
                              <input
                                type="checkbox"
                                id="editReligionConsent"
                                checked={editReligionConsent}
                                onChange={(e) => setEditReligionConsent(e.target.checked)}
                                className="mt-1 rounded border-gray-300 text-[#800000] focus:ring-[#800000] mr-2"
                              />
                              <label htmlFor="editReligionConsent" className="text-xs text-gray-600">
                                I consent to providing my religious affiliation. This information is optional and will only be used for accommodation purposes if needed.
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Contact Information */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">2</div>
                        <h3 className="text-xl font-bold text-gray-800">Contact Information</h3>
                  </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Email
                          </label>
                    <input
                            type="email"
                            value={editEmployee.Email}
                            onChange={(e) => setEditEmployee({...editEmployee, Email: e.target.value})}
                            placeholder="email@example.com"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex text-sm font-semibold text-gray-700 items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={editEmployee.Phone}
                            onChange={(e) => setEditEmployee({...editEmployee, Phone: e.target.value})}
                            placeholder="09123456789"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                            required
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Present Address
                          </label>
                    <input
                            type="text"
                            value={editEmployee.PresentAddress}
                            onChange={(e) => {
                              setEditEmployee({...editEmployee, PresentAddress: e.target.value});
                              if (editSameAsPresentAddress) {
                                setEditEmployee((prev) => ({...prev, PermanentAddress: e.target.value}));
                              }
                            }}
                            placeholder="Complete present address"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                    />
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={editSameAsPresentAddress}
                      onChange={(e) => {
                        setEditSameAsPresentAddress(e.target.checked);
                        if (e.target.checked) {
                          setEditEmployee((prev) => ({...prev, PermanentAddress: prev.PresentAddress}));
                        }
                      }}
                      className="rounded border-gray-300 text-[#800000] focus:ring-[#800000] mr-2"
                      id="sameAsPresentAddressEdit"
                    />
                    <label htmlFor="sameAsPresentAddressEdit" className="text-sm text-gray-700">Same as Present Address</label>
                  </div>
                  </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Permanent Address
                          </label>
                          <input
                            type="text"
                            value={editEmployee.PermanentAddress}
                            onChange={(e) => setEditEmployee({...editEmployee, PermanentAddress: e.target.value})}
                            placeholder="Complete permanent address"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                            disabled={editSameAsPresentAddress}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Government IDs */}
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
                        <h3 className="text-xl font-bold text-gray-800">Government IDs</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            SSS Number
                          </label>
                          <input
                            type="text"
                            value={editEmployee.SSSNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, SSSNumber: e.target.value})}
                            placeholder="00-0000000-0"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            TIN Number
                          </label>
                          <input
                            type="text"
                            value={editEmployee.TINNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, TINNumber: e.target.value})}
                            placeholder="000-000-000-000"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            PhilHealth Number
                          </label>
                          <input
                            type="text"
                            value={editEmployee.PhilHealthNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, PhilHealthNumber: e.target.value})}
                            placeholder="00-000000000-0"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Pag-IBIG Number
                          </label>
                          <input
                            type="text"
                            value={editEmployee.PagIbigNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, PagIbigNumber: e.target.value})}
                            placeholder="0000-0000-0000"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            GSIS Number
                          </label>
                          <input
                            type="text"
                            value={editEmployee.GSISNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, GSISNumber: e.target.value})}
                            placeholder="00000000000"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            PRC License Number
                          </label>
                          <input
                            type="text"
                            value={editEmployee.PRCLicenseNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, PRCLicenseNumber: e.target.value})}
                            placeholder="PRC License Number"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            PRC Validity
                          </label>
                          <input
                            type="date"
                            value={editEmployee.PRCValidity}
                            onChange={(e) => setEditEmployee({...editEmployee, PRCValidity: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Emergency Contact */}
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
                      <div className="flex items-center mb-6">
                        <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">5</div>
                        <h3 className="text-xl font-bold text-gray-800">Emergency Contact</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Contact Person Name
                          </label>
                          <input
                            type="text"
                            value={editEmployee.EmergencyContactName}
                            onChange={(e) => setEditEmployee({...editEmployee, EmergencyContactName: e.target.value})}
                            placeholder="Full name of emergency contact"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Contact Number
                          </label>
                          <input
                            type="tel"
                            value={editEmployee.EmergencyContactNumber}
                            onChange={(e) => setEditEmployee({...editEmployee, EmergencyContactNumber: e.target.value})}
                            placeholder="09123456789"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-0 transition-colors bg-white"
                          />
                        </div>
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    <span className="text-red-500">*</span> Required fields
                  </p>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={handleCloseEditModal}
                      className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingEmployee}
                      className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {isUpdatingEmployee ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Updating Employee...
                        </>
                      ) : (
                        'Update Employee'
                      )}
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
          <div className="bg-white dark:bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'white' }}>
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
                  Your CSV file should include the following columns (✓ = required):
                </p>
                <div className="w-full overflow-x-auto">
                  <div className="bg-white p-3 rounded border text-sm font-mono whitespace-nowrap min-w-max inline-block">
                    LastName,FirstName,MiddleName,ExtensionName,Sex,DateOfBirth,Email,Phone,EmploymentStatus,HireDate,ResignationDate,Designation,Position,DepartmentID,SalaryGrade,SalaryAmount
                  </div>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-700">
                    <strong>📝 Note:</strong> Employee ID will be auto-generated. <strong>Required fields:</strong> LastName, FirstName, DateOfBirth, Email, Phone, HireDate, Sex
                  </p>
                </div>
                <button
                  onClick={() => {
                    const csvHeaders = [
                      'LastName','FirstName','MiddleName','ExtensionName','Sex','DateOfBirth','Email','Phone','EmploymentStatus','HireDate','ResignationDate','Designation','Position','DepartmentID','SalaryGrade','SalaryAmount'
                    ];
                    const csvRows = [
                      csvHeaders.join(','),
                      // 3 sample employee rows with new structure (no EmployeeID, no Photo, removed unnecessary fields)
                      'Garcia,Juan,Cruz,,Male,1980-02-15,juan.sjsfi@gmail.com,09171234567,Regular,2010-06-01,,Faculty,Teacher I,21,12,45000.00',
                      'Reyes,Ana,Lopez,,Female,1985-07-20,ana.sjsfi@gmail.com,09181239876,Probationary,2015-08-15,,Faculty,Teacher II,22,13,48000.00',
                      'Santos,Mark,David,,Male,1992-11-05,mark.sjsfi@gmail.com,09183456789,Regular,2018-11-20,,Faculty,Teacher III,23,14,52000.00'
                    ];
                    const csvContent = csvRows.join('\n');
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
                      <Upload size={16} /> Import Employees
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PhotoModal
        isOpen={isPhotoModalOpen}
        photo={selectedPhoto}
        onClose={handleClosePhotoModal}
      />
      <SuccessModal
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage}
        onClose={() => setErrorMessage('')}
      />

      {/* Export Employee Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" style={{ backgroundColor: 'white' }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">Export Employees</h2>
                  <p className="text-blue-100 mt-1">Choose export format and filters</p>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-8">
              <div className="space-y-8">
                {/* Export Format Selection */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">1</div>
                    <h3 className="text-xl font-bold text-gray-800">Export Format</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setExportFormat('csv')}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        exportFormat === 'csv'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <FileSpreadsheet className={`w-6 h-6 ${exportFormat === 'csv' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <div className="font-semibold">CSV Format</div>
                        <div className="text-sm opacity-75">Spreadsheet format for Excel/Google Sheets</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('pdf')}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        exportFormat === 'pdf'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <FileText className={`w-6 h-6 ${exportFormat === 'pdf' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <div className="font-semibold">PDF Format</div>
                        <div className="text-sm opacity-75">Printable report format</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Export Filters */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center mb-6">
                    <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">2</div>
                    <h3 className="text-xl font-bold text-gray-800">Export Filters</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Department
                      </label>
                      <select
                        value={exportFilters.department}
                        onChange={(e) => setExportFilters({...exportFilters, department: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="all">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Designation
                      </label>
                      <select
                        value={exportFilters.designation}
                        onChange={(e) => setExportFilters({...exportFilters, designation: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="all">All Designations</option>
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
                        Employment Status
                      </label>
                      <select
                        value={exportFilters.status}
                        onChange={(e) => setExportFilters({...exportFilters, status: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="all">All Statuses</option>
                        <option value="Regular">Regular</option>
                        <option value="Probationary">Probationary</option>
                        <option value="Resigned">Resigned</option>
                        <option value="Hired">Hired</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Search Term
                      </label>
                      <input
                        type="text"
                        value={exportFilters.search}
                        onChange={(e) => setExportFilters({...exportFilters, search: e.target.value})}
                        placeholder="Search by name or email..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-0 transition-colors bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Column Selection */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6 mt-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
                    <h3 className="text-xl font-bold text-gray-800">Select Columns</h3>
                  </div>
                  <div className="space-y-6">
                    {exportColumnSections.map(section => (
                      <div key={section.title}>
                        <div className="font-semibold text-gray-700 mb-2">{section.title}</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                          {section.keys.map(key => {
                            const col = allExportColumns.find(c => c.key === key);
                            if (!col || excludedColumns.includes(col.key)) return null;
                            return (
                              <label key={col.key} className="flex items-center space-x-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedExportColumns.includes(col.key)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedExportColumns(prev => [...prev, col.key]);
                                    } else {
                                      setSelectedExportColumns(prev => prev.filter(k => k !== col.key));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                                />
                                <span>{col.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-blue-600 underline"
                    onClick={() => setSelectedExportColumns(allExportColumns.filter(col => !excludedColumns.includes(col.key)).map(col => col.key))}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="mt-2 ml-4 text-xs text-blue-600 underline"
                    onClick={() => setSelectedExportColumns([])}
                  >
                    Deselect All
                  </button>
                </div>

                {/* PDF Paper Size Selection */}
                {exportFormat === 'pdf' && (
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-6 mt-8">
                    <div className="flex items-center mb-6">
                      <div className="bg-pink-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">4</div>
                      <h3 className="text-xl font-bold text-gray-800">PDF Options</h3>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Paper Size</label>
                      <select
                        value={pdfPaperSize}
                        onChange={e => setPdfPaperSize(e.target.value as any)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="a4">A4 (210 x 297 mm)</option>
                        <option value="letter">Short (Letter, 8.5 x 11 in)</option>
                        <option value="legal">Long (Legal, 8.5 x 14 in)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Page Orientation</label>
                      <select
                        value={pdfOrientation}
                        onChange={e => setPdfOrientation(e.target.value as any)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-pink-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Export Summary */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
                    <h3 className="text-xl font-bold text-gray-800">Export Summary</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Format:</strong> {exportFormat.toUpperCase()}</p>
                    <p><strong>Department:</strong> {exportFilters.department === 'all' ? 'All Departments' : departments.find(d => d.id.toString() === exportFilters.department)?.name}</p>
                    <p><strong>Designation:</strong> {exportFilters.designation === 'all' ? 'All Designations' : exportFilters.designation.replace(/_/g, ' ')}</p>
                    <p><strong>Status:</strong> {exportFilters.status === 'all' ? 'All Statuses' : exportFilters.status}</p>
                    {exportFilters.search && <p><strong>Search:</strong> "{exportFilters.search}"</p>}
                    <p className="text-yellow-700 font-medium mt-3">
                      💡 The export will include all employee data matching your selected filters.
                    </p>
                  </div>
                </div>

                {/* Order By */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-6 mt-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
                    <h3 className="text-xl font-bold text-gray-800">Order By</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Order By</label>
                      <select
                        value={exportOrderBy}
                        onChange={e => setExportOrderBy(e.target.value as any)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="LastName">Last Name (A-Z)</option>
                        <option value="FirstName">First Name (A-Z)</option>
                        <option value="EmployeeID">Employee ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Direction</label>
                      <select
                        value={exportOrderDir}
                        onChange={e => setExportOrderDir(e.target.value as any)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-0 transition-colors bg-white"
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Hire Date Range */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6 mt-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-teal-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">5</div>
                    <h3 className="text-xl font-bold text-gray-800">Hire Date Range (Optional)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">From Date</label>
                      <input
                        type="date"
                        value={hireDateFrom}
                        onChange={e => setHireDateFrom(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-0 transition-colors bg-white"
                        placeholder="From"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">To Date</label>
                      <input
                        type="date"
                        value={hireDateTo}
                        onChange={e => setHireDateTo(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:ring-0 transition-colors bg-white"
                        placeholder="To"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Export will include all matching employee records
                </p>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportEmployees}
                    disabled={isExporting}
                    className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download size={16} /> Export {exportFormat.toUpperCase()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PhotoModal
        isOpen={isPhotoModalOpen}
        photo={selectedPhoto}
        onClose={handleClosePhotoModal}
      />
      <SuccessModal
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage}
        onClose={() => setErrorMessage('')}
      />
    </>
  );
};

export default EmployeeContentNew; 