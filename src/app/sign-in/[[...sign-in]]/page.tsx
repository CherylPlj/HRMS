"use client";

import { useUser, useClerk, useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Eye, ArrowLeft, AlertCircle, X } from 'lucide-react';
import { validatePassword, loginRateLimiter, checkLoginAttempts, recordFailedLoginAttempt, resetLoginAttempts } from '@/lib/security';
import { getClientIp } from '@/lib/ip';
import { validateEmailCharacters } from '@/lib/validation';

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

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<any>;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'pin' | 'newPassword' | 'success'>('email');
  const [resetData, setResetData] = useState<any>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const error = validateEmailCharacters(value);
    setEmailError(error);
    
    if (error && error.includes('Only letters, numbers')) {
      // Don't update if invalid characters
      return;
    }
    
    if (value.length > 50) {
      setEmail(value.slice(0, 50));
      return;
    }

    setEmail(value);
    setError(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const emailError = validateEmailCharacters(email);
      if (emailError) {
        setError(emailError);
        setIsLoading(false);
        return;
      }

      const result = await onSubmit(email);
      setResetData(result);
      setStep('pin');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!pin || pin.length !== 6) {
        throw new Error('Please enter a valid 6-digit code');
      }

      await resetData.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: pin
      });

      setStep('newPassword');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        setError(passwordError);
        setIsLoading(false);
        return;
      }

      await resetData.resetPassword({
        password: newPassword
      });

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPin('');
    setNewPassword('');
    setError(null);
    setEmailError(null);
    setStep('email');
    setResetData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-[#800000] mb-4">
          {step === 'email' && 'Reset Password'}
          {step === 'pin' && 'Enter Verification Code'}
          {step === 'newPassword' && 'Set New Password'}
          {step === 'success' && 'Password Reset Complete'}
        </h2>

        {step === 'success' ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">Your password has been successfully reset.</p>
            <button
              onClick={handleClose}
              className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-[#800000]/80 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form 
            onSubmit={
              step === 'email' ? handleEmailSubmit :
              step === 'pin' ? handlePinSubmit :
              step === 'newPassword' ? handlePasswordSubmit :
              undefined
            } 
            className="space-y-4"
          >
            {step === 'email' && (
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full px-3 py-2 border ${
                    emailError ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                    emailError ? 'focus:ring-red-500' : 'focus:ring-[#800000]'
                  }`}
                  placeholder="Enter your email"
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>
            )}

            {step === 'pin' && (
              <div>
                <label htmlFor="reset-pin" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Please enter the 6-digit code sent to {email}
                </p>
                <input
                  id="reset-pin"
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPin(value);
                    setError(null);
                  }}
                  className={`w-full px-3 py-2 border ${
                    error ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                    error ? 'focus:ring-red-500' : 'focus:ring-[#800000]'
                  } text-center tracking-widest`}
                  placeholder="000000"
                />
              </div>
            )}

            {step === 'newPassword' && (
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  className={`w-full px-3 py-2 border ${
                    error ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                    error ? 'focus:ring-red-500' : 'focus:ring-[#800000]'
                  }`}
                  placeholder="Enter new password"
                />
              </div>
            )}

            {error && !emailError && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || (
                  step === 'email' ? !email || !!emailError :
                  step === 'pin' ? !pin || pin.length !== 6 :
                  !newPassword
                )}
                className={`px-4 py-2 text-sm text-white rounded ${
                  isLoading || (
                    step === 'email' ? !email || !!emailError :
                    step === 'pin' ? !pin || pin.length !== 6 :
                    !newPassword
                  )
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#800000] hover:bg-[#800000]/80'
                }`}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  step === 'email' ? 'Send Code' :
                  step === 'pin' ? 'Verify Code' :
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        )}
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
  const redirectUrl = searchParams?.get('redirect_url');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  // Force sign out when the component mounts only if we're not being redirected from a protected route
  useEffect(() => {
    if (isLoaded && isSignedIn && !redirectUrl) {
      signOut();
    }
  }, [isLoaded, isSignedIn, signOut, redirectUrl]);

  // If still loading, show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

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
      // Show password requirements immediately
      const error = validatePassword(value);
      setPasswordError(error);
      
      // Only update form data if not exceeding max length
      if (value.length > 50) {
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Only clear the main error message
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Get client IP for rate limiting
      const userIP = await getClientIp();

      // Check rate limiting
      try {
        await loginRateLimiter.consume(userIP);
      } catch {
        setIsLoading(false);
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Check IP-based login attempts
      const { blocked, remainingAttempts } = checkLoginAttempts(userIP);
      if (blocked) {
        setIsLoading(false);
        throw new Error('Account temporarily locked due to too many failed attempts. Please try again later.');
      }

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

      // Validate password complexity
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setIsLoading(false);
        throw new Error(passwordError);
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
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        throw new Error('Failed to verify user role');
      }

      if (!userCheck) {
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        throw new Error('User not found in the system');
      }

      const userRoles = (userCheck as unknown as UserCheck).UserRole;
      if (!userRoles || userRoles.length === 0) {
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        throw new Error('User role not found');
      }

      // Check if user is deleted or inactive
      if (userCheck.isDeleted || userCheck.Status !== 'Active') {
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        throw new Error('Account is inactive or has been deleted');
      }

      // Attempt to sign in with Clerk
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        resetLoginAttempts(userIP); // Reset attempts on successful login
        
        // Handle redirect
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          const role = userRoles[0].role.name.toLowerCase();
          router.push(`/dashboard/${role}`);
        }
      } else {
        recordFailedLoginAttempt(userIP);
        throw new Error('Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (isSignedIn) {
      signOut();
    }
    router.push('/');
  };

  const handleForgotPassword = async (email: string) => {
    try {
      const result = await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      if (!result) {
        throw new Error('Failed to initiate password reset');
      }

      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send reset code');
    }
  };

  return (
    <>
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
                      className={`bg-white border text-black text-sm border-gray-300 rounded-sm px-4 py-2 w-full focus:outline-0 focus:ring-1 ${
                        emailError ? 'focus:ring-red-500' : 'focus:ring-[#800000]'
                      }`}
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-xs text-red-600">{emailError}</p>
                  )}
                </div>
                <div className="mb-4 w-full">
                  <div className="relative w-full">
                    <input
                      autoComplete="off"
                      placeholder="Password"
                      className={`bg-white border text-black text-sm border-gray-300 rounded-sm px-4 py-2 w-full focus:outline-0 focus:ring-1 ${
                        passwordError ? 'focus:ring-red-500' : 'focus:ring-[#800000]'
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
                    <p className="mt-1 text-xs text-red-600">{passwordError}</p>
                  )}
                </div>
                <div className="mb-4 w-full">
                  <button
                    type="submit"
                    className={`text-sm rounded-sm px-4 py-2 w-full transition duration-200 ease-in-out ${
                      isLoading || !!emailError || !!passwordError
                        ? 'bg-white text-red-600 cursor-not-allowed opacity-75'
                        : 'bg-[#800000] hover:bg-[#800000]/80 text-white'
                    }`}
                    disabled={isLoading || !!emailError || !!passwordError}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
                <div className="mb-4 w-full">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-sm text-[#800000] hover:text-[#800000]/80 focus:outline-none"
                  >
                    Forgot password?
                  </button>
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

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSubmit={handleForgotPassword}
      />
    </>
  );
} 
