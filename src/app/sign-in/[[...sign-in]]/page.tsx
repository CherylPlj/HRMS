"use client";

import { useUser, useClerk, useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Eye, ArrowLeft, AlertCircle } from 'lucide-react';

// Initialize Supabase client with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Add type definitions for the database response
interface Role {
  name: string;
}

interface UserRole {
  role: {
    name: string;
  };
}

interface UserCheck {
  UserID: string;
  Status: string;
  Email: string;
  UserRole: UserRole[];
}

interface WarningModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

const WarningModal: React.FC<WarningModalProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-[#800000]" />
        </div>
        <h2 className="text-xl font-bold text-center text-[#800000] mb-4">Access Denied</h2>
        <p className="text-gray-700 text-center mb-6">{message}</p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-[#800000]/80 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { signIn, setActive } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const portal = searchParams?.get('portal') || 'faculty';
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    message: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    // Initialize rememberMe from localStorage on component mount
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rememberMe') === 'true';
    }
    return false;
  });

  // Load remembered email and state on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedState = localStorage.getItem('rememberMe') === 'true';
      
      if (rememberedEmail && rememberedState) {
        setFormData(prev => ({ ...prev, email: rememberedEmail }));
        setRememberMe(true);
      }
    }
  }, []);

  const validateEmailCharacters = (email: string) => {
    // Regular expression to match only allowed characters
    const validEmailRegex = /^[a-zA-Z0-9._\-@ ]*$/;
    if (!validEmailRegex.test(email)) {
      return 'Only letters, numbers, dots, underscores, hyphens, and @ are allowed';
    }

    // Check for length requirements
    if (email.length > 50) {
      return 'Email must not exceed 50 characters';
    }

    if (email.length < 6 && email.length > 0) {
      return 'Email must be at least 6 characters';
    }

    // Always check for valid email format if there's input
    if (email.length > 0) {
      const emailRegex = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9._\-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        if (!email.includes('@')) {
          return 'Please include @ in the email address';
        }
        if (!email.includes('.')) {
          return 'Please include a domain (e.g., .com, .edu)';
        }
        return 'Please enter a valid email address (e.g., example@domain.com)';
      }
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      const error = validateEmailCharacters(value);
      setEmailError(error);
      
      if (error && error.includes('Only letters, numbers')) {
        // Don't update the form if invalid characters are entered
        return;
      }
      
      if (value.length > 50) {
        setFormData(prev => ({
          ...prev,
          [name]: value.slice(0, 50)
        }));
        return;
      }
    }
    
    if (name === 'password') {
      if (value.length >= 50) {
        setPasswordError('Password must not exceed 50 characters');
        setFormData(prev => ({
          ...prev,
          [name]: value.slice(0, 50)
        }));
        return;
      } else if (value.length < 6 && value.length > 0) {
        setPasswordError('Password must be at least 6 characters');
      } else {
        setPasswordError(null);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous errors when user starts typing
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.email || !formData.password) {
        setIsLoading(false);
        throw new Error('Please fill in all fields');
      }

      if (formData.email.length < 6) {
        setIsLoading(false);
        throw new Error('Email must be at least 6 characters');
      }

      if (formData.email.length > 50) {
        setIsLoading(false);
        throw new Error('Email must not exceed 50 characters');
      }

      const emailError = validateEmailCharacters(formData.email);
      if (emailError) {
        setIsLoading(false);
        throw new Error(emailError);
      }

      if (formData.password.length < 6) {
        setIsLoading(false);
        throw new Error('Password must be at least 6 characters');
      }

      if (formData.password.length > 50) {
        setIsLoading(false);
        throw new Error('Password must not exceed 50 characters');
      }

      if (!signIn) {
        setIsLoading(false);
        throw new Error('Authentication is not initialized');
      }

      // First verify the role before attempting to sign in
      const { data: userCheck, error: userError } = await supabase
        .from('User')
        .select(`
          UserID,
          Status,
          Email,
          isDeleted,
          UserRole!inner (
            role:Role (
              name
            )
          )
        `)
        .eq('Email', formData.email)
        .single();

      if (userError) {
        setIsLoading(false);
        throw new Error('Failed to verify user role');
      }

      if (!userCheck) {
        setIsLoading(false);
        throw new Error('User not found in the system');
      }

      const userRoles = (userCheck as unknown as UserCheck).UserRole;
      if (!userRoles || userRoles.length === 0) {
        setIsLoading(false);
        throw new Error('User role not found');
      }

      const role = userRoles[0]?.role?.name;
      if (!role) {
        setIsLoading(false);
        throw new Error('Invalid role configuration');
      }

      const portalRole = portal.toLowerCase();
      if (role.toLowerCase() !== portalRole) {
        setIsLoading(false);
        setWarningModal({
          isOpen: true,
          message: `Your account has ${role.toLowerCase()} privileges. Please use the ${role.toLowerCase()} portal instead.`
        });
        setFormData({ email: '', password: '' }); // Clear form data when showing warning
        return;
      }

      // Proceed with sign in only if role matches
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      });

      if (result.status === "complete") {
        await setActive({ 
          session: result.createdSessionId,
        });
        
        // Handle remember me state persistence
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberMe');
        }

        // After successful sign-in, verify user and redirect
        const userEmail = formData.email;

        if (userCheck.isDeleted) {
          await signOut();
          setIsLoading(false);
          throw new Error('This account has been deleted');
        }

        if (userCheck.Status !== 'Active') {
          await signOut();
          setIsLoading(false);
          throw new Error('Your account is not active');
        }

        // Update last login timestamp
        await fetch('/api/updateLastLogin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: userCheck.UserID }),
        });

        // Redirect to the appropriate dashboard
        router.push(`/dashboard/${role.toLowerCase()}`);
      } else {
        setIsLoading(false);
        throw new Error('Sign in failed');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please try again.');
      if (isSignedIn) {
        await signOut();
      }
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (isSignedIn) {
      signOut();
    }
    router.push('/');
  };

  const closeWarningModal = () => {
    setWarningModal({ isOpen: false, message: '' });
    setFormData({ email: '', password: '' }); // Clear the form
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (checked) {
      localStorage.setItem('rememberMe', 'true');
      if (formData.email) {
        localStorage.setItem('rememberedEmail', formData.email);
      }
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberMe');
    }
  };

  // Return early if auth is not loaded
  if (!isLoaded || !signIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <>
      <WarningModal 
        isOpen={warningModal.isOpen}
        message={warningModal.message}
        onClose={closeWarningModal}
      />

      <div className="min-h-screen flex">
        {/* Left side - Background */}
        <div className="flex-1 bg-[url('/portalBG.png')] bg-cover bg-center" />

        {/* Right side - Login panel */}
        <div className="absolute right-0 w-full md:w-1/3 min-h-screen min-w-[360px] pt-[10vh] overflow-hidden bg-white/70 backdrop-blur-[20px] backdrop-saturate-[168%] shadow-md m-0 rounded-none flex flex-col bg-clip-border border border-transparent break-words mb-4">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 text-[#800000] hover:text-[#800000]/80 transition-colors duration-200 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col items-center h-full w-full">
            <div className="flex flex-col items-center justify-center w-full mb-4">
              <Image
                alt="SJSFI Logo"
                src="/sjsfilogo.png"
                width={90}
                height={90}
                className="mb-2"
                priority
              />
              <h1 className="text-3xl text-center w-full mb-2 mx-1">
                <span className="font-bold text-[#800000]">SJSFI-HRMS </span>
                {portal.charAt(0).toUpperCase() + portal.slice(1)} Module
              </h1>
            </div>
            <div className="flex flex-col items-center justify-center w-full">
              <p className="text-center text-black text-sm mb-4">
                Sign in to start your session
              </p>
              {error && (
                <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded w-full mx-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="w-full px-4" autoComplete="off">
                <div className="mb-4 w-full">
                  <div className="relative w-full">
                    <input
                      autoComplete="off"
                      placeholder="Email Address"
                      className={`bg-white border text-black text-sm border-gray-300 rounded-sm px-4 py-2 w-full focus:outline-0 focus:ring-1 focus:ring-[#800000] focus:border-transparent pr-10 ${
                        emailError ? 'border-red-500' : ''
                      }`}
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-xs text-red-600">
                      {emailError}
                    </p>
                  )}
                </div>
                <div className="mb-4 w-full">
                  <div className="relative w-full">
                    <input
                      autoComplete="off"
                      placeholder="Password"
                      className={`bg-white border text-black text-sm border-gray-300 rounded-sm px-4 py-2 w-full focus:outline-0 focus:ring-1 focus:ring-[#800000] focus:border-transparent pr-10 ${
                        passwordError ? 'border-red-500' : ''
                      }`}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black focus:outline-none"
                      disabled={isLoading}
                    >
                      <Eye className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1 text-xs text-red-600">
                      {passwordError}
                    </p>
                  )}
                </div>
                <div className="mb-4 w-full flex items-center">
                  <label className="flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      className="form-checkbox h-4 w-4 text-[#800000] rounded border-gray-300 focus:ring-[#800000]"
                      disabled={isLoading}
                    />
                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                  </label>
                </div>
                <div className="mb-4 w-full">
                  <button
                    type="submit"
                    className={`text-sm rounded-sm px-4 py-2 w-full transition duration-200 ease-in-out ${
                      isLoading || !formData.email || !formData.password
                        ? 'bg-white text-red-600 cursor-not-allowed opacity-75'
                        : 'bg-[#800000] hover:bg-[#800000]/80 text-white'
                    }`}
                    disabled={isLoading || !formData.email || !formData.password}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
                <div className="flex items-center justify-center mb-4 w-full">
                  <a
                    className="font-medium text-sm text-[#800000] hover:underline hover:text-[#800000]/80 transition duration-200 ease-in-out"
                    href="/forgot-password"
                  >
                    I forgot my password
                  </a>
                </div>
                <div className="flex items-center justify-center mb-4 w-full">
                  <p className="text-sm text-black text-center">
                    By using this service, you understood and agree to the
                    <span className="font-medium text-[#DAA520]"> SJSFI Online Services </span>
                    <a
                      className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                      href="/terms-of-use"
                    >
                      Terms of Use
                    </a>
                    {' '}and{' '}
                    <a
                      className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                      href="/privacy-statement"
                    >
                      Privacy Statement
                    </a>
                    .
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
