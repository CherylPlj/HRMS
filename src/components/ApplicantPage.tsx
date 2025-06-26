"use client";

import React, { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import Link from 'next/link';

interface Vacancy {
  id: string;
  title: string;
}

interface FormErrors {
  [key: string]: string;
}

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  showErrorMessage?: boolean;
}

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  error,
  placeholder,
  showErrorMessage = false,
}: InputFieldProps) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000]`}
    />
    {showErrorMessage && error && (
      <p className="mt-1 text-sm text-red-500">{error}</p>
    )}
  </div>
);

const SuccessModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Application Submitted Successfully!
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Thank you for your interest in joining our team. We have received your application and will review it shortly.
            You will receive a confirmation email with further details.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-[#4ade80] hover:bg-[#22c55e] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4ade80]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplicantPage = () => {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    extName: '',
    email: '',
    contactNumber: '',
    vacancy: '',
    sex: '',
    dateOfBirth: '',
    resume: null as File | null,
  })

  const [errors, setErrors] = useState<FormErrors>({});
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        const response = await fetch('/api/vacancies/public');
        if (!response.ok) {
          throw new Error('Failed to fetch vacancies');
        }
        const data = await response.json();
        setVacancies(data);
      } catch (error) {
        console.error('Error fetching vacancies:', error);
        toast.error('Failed to load job vacancies');
      }
    };

    fetchVacancies();
  }, []);

  const checkExistingEmail = debounce(async (email: string) => {
    try {
      const response = await fetch(`/api/candidates/check-email?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        throw new Error('Failed to check email');
      }
      const data = await response.json();
      if (data.exists) {
        setErrors(prev => ({
          ...prev,
          email: 'This email has already been used for an application'
        }));
        toast.error('You have already submitted an application with this email');
      }
    } catch (error) {
      console.error('Error checking email:', error);
    }
  }, 500);

  const validateAge = (dateOfBirth: string): { valid: boolean; age: number | null } => {
    if (!dateOfBirth) return { valid: false, age: null };
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return { valid: false, age: null };

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return { valid: age >= 18 && age <= 65, age };
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
      case 'lastName':
        return value.trim().length < 2 ? `${name === 'firstName' ? 'First' : 'Last'} name must be at least 2 characters` : '';
      
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? 'Please enter a valid email address' : '';
      
      case 'contactNumber':
        const phoneRegex = /^(\+63|0)[0-9]{10}$/;
        return !phoneRegex.test(value) ? 'Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)' : '';
      
      case 'sex':
        return !value ? 'Please select your sex' : '';
      
      case 'dateOfBirth':
        if (!value) return 'Please enter your date of birth';
        const { valid, age } = validateAge(value);
        return !valid ? `Age must be between 18 and 65 years old (current age: ${age} years)` : '';
      
      case 'vacancy':
        return !value ? 'Please select a job vacancy' : '';
      
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // Validate all required fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'resume' && key !== 'middleName' && key !== 'extName') {
        const error = validateField(key, value as string);
        if (error) {
          newErrors[key] = error;
        }
      }
    });

    // Resume validation
    if (!formData.resume) {
      newErrors.resume = 'Please upload your resume';
    } else {
      const allowedTypes = ['.pdf', '.doc', '.docx'];
      const fileExtension = '.' + formData.resume.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        newErrors.resume = 'Please upload a PDF or Word document';
      }
      if (formData.resume.size > 5 * 1024 * 1024) {
        newErrors.resume = 'File size must be less than 5MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate field in real-time
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));

    // Special handling for email
    if (name === 'email' && value.includes('@') && !error) {
      checkExistingEmail(value);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, resume: e.target.files![0] }));
      // Clear error when user selects a file
      if (errors.resume) {
        setErrors((prev) => ({ ...prev, resume: '' }));
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('VacancyID', formData.vacancy);
      data.append('LastName', formData.lastName);
      data.append('FirstName', formData.firstName);
      data.append('MiddleName', formData.middleName);
      data.append('ExtensionName', formData.extName);
      data.append('Email', formData.email);
      data.append('ContactNumber', formData.contactNumber);
      
      // Ensure sex is properly set
      if (!formData.sex) {
        throw new Error('Please select your sex');
      }
      data.append('Sex', formData.sex);

      // Validate and format date of birth
      if (!formData.dateOfBirth) {
        throw new Error('Please enter your date of birth');
      }
      const { valid, age } = validateAge(formData.dateOfBirth);
      if (!valid) {
        throw new Error(`Age must be between 18 and 65 years old (current age: ${age} years)`);
      }
      // Convert to ISO string for consistent date format
      const dob = new Date(formData.dateOfBirth);
      data.append('DateOfBirth', dob.toISOString());

      if (formData.resume) {
        data.append('resume', formData.resume);
      }

      const response = await fetch('/api/candidates/public', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      // Clear form
      setFormData({
        lastName: '',
        firstName: '',
        middleName: '',
        extName: '',
        email: '',
        contactNumber: '',
        vacancy: '',
        sex: '',
        dateOfBirth: '',
        resume: null,
      });
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Show success modal instead of toast
      setShowSuccessModal(true);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <Toaster 
        position="top-right"
        toastOptions={{
          error: {
            style: {
              background: '#ef4444',
              color: 'white',
            },
            iconTheme: {
              primary: 'white',
              secondary: '#ef4444',
            },
          },
        }}
      />
      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
      />
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <a 
            href="https://sjsfi.vercel.app/careers" 
            className="inline-flex items-center text-[#800000] hover:text-[#600000] transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                clipRule="evenodd" 
              />
            </svg>
            Back to Careers
          </a>
        </div>
        <h1 className="text-2xl font-bold text-[#800000] mb-6">Application Form</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField 
              label="First Name" 
              name="firstName" 
              value={formData.firstName} 
              onChange={handleChange} 
              required 
              error={errors.firstName}
              showErrorMessage={true}
            />
            <InputField 
              label="Middle Name" 
              name="middleName" 
              value={formData.middleName} 
              onChange={handleChange} 
            />
            <InputField 
              label="Last Name" 
              name="lastName" 
              value={formData.lastName} 
              onChange={handleChange} 
              required 
              error={errors.lastName}
              showErrorMessage={true}
            />
            <InputField 
              label="Extension Name" 
              name="extName" 
              value={formData.extName} 
              onChange={handleChange} 
              placeholder="Jr., Sr., III, etc."
            />
            <InputField 
              label="Email Address" 
              name="email" 
              type="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
              error={errors.email}
              showErrorMessage={true}
            />
            <InputField 
              label="Contact Number" 
              name="contactNumber" 
              value={formData.contactNumber} 
              onChange={handleChange} 
              required 
              error={errors.contactNumber}
              placeholder="+639123456789 or 09123456789"
              showErrorMessage={true}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                name="sex"
                required
                value={formData.sex}
                onChange={handleChange}
                className={`w-full border ${errors.sex ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000]`}
              >
                <option value="">-- Select Sex --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.sex && (
                <p className="mt-1 text-sm text-red-500">{errors.sex}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfBirth"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full border ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000]`}
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>
              )}
              {formData.dateOfBirth && !errors.dateOfBirth && (
                <p className="mt-1 text-sm text-gray-600">
                  Age: {validateAge(formData.dateOfBirth).age} years old
                </p>
              )}
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Vacancy <span className="text-red-500">*</span>
              </label>
              <select
                name="vacancy"
                required
                value={formData.vacancy}
                onChange={handleChange}
                className={`w-full border ${errors.vacancy ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000]`}
              >
                <option value="">Select Job Title</option>
                {vacancies.map((vacancy) => (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.title}
                  </option>
                ))}
              </select>
              {errors.vacancy && (
                <p className="mt-1 text-sm text-red-500">{errors.vacancy}</p>
              )}
            </div>
            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Resume (PDF/DOCX) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                required
                onChange={handleFileChange}
                className={`w-full border ${errors.resume ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800000] focus:border-[#800000]`}
              />
              {errors.resume && (
                <p className="mt-1 text-sm text-red-500">{errors.resume}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">Maximum file size: 5MB</p>
            </div>
          </div>
          <div className="text-right">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 bg-[#4ade80] text-white rounded-md font-medium hover:bg-[#22c55e] transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center text-gray-600 border-t pt-6">
          <p>
            Please email us if you have any concerns or updates with your application at:{' '}
            <a 
              href="mailto:sjsfihrms@gmail.com" 
              className="text-[#800000] hover:underline"
            >
              sjsfihrms@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ApplicantPage