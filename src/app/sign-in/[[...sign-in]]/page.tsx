"use client";

import { useUser, useClerk, useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Eye, EyeOff, ArrowLeft, AlertCircle, X } from 'lucide-react';
import { validatePassword, sanitizePassword, loginRateLimiter, unknownIPRateLimiter, checkLoginAttempts, recordFailedLoginAttempt, resetLoginAttempts } from '@/lib/security';
import { getClientIp } from '@/lib/ip';
import { validateEmailCharacters } from '@/lib/validation';
import RoleSelection from '@/components/RoleSelection';
import { getUserRoles, setSelectedRole, getDashboardPath } from '@/lib/userRoles';

// Initialize Supabase client with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
  clerk: any;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose, onSubmit, clerk }) => {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'pin' | 'newPassword' | 'success'>('email');
  const [resetData, setResetData] = useState<any>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Simple validation for forgot password modal - no external dependencies
    let error = null;
    
    // Check for invalid characters
    const validEmailRegex = /^[a-zA-Z0-9._\-@ ]*$/;
    if (!validEmailRegex.test(value)) {
      error = 'Only letters, numbers, dots, underscores, hyphens, and @ are allowed';
    }
    
    // Check length
    if (value.length > 50) {
      error = 'Email must not exceed 50 characters';
    }
    
    // Check email format if there's input
    if (value.length > 0 && !error) {
      const emailRegex = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9._\-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(value)) {
        if (!value.includes('@')) {
          error = 'Please include @ in the email address';
        } else if (!value.includes('.')) {
          error = 'Please include a domain (e.g., .com, .edu)';
        } else {
          error = 'Please enter a valid email address (e.g., example@domain.com)';
        }
      }
    }
    
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
    setEmailError(null);
    
    // Validate empty field
    if (!email || !email.trim()) {
      setEmailError('Email is required');
      return;
    }

    // Use the same inline validation as handleEmailChange
    let emailError = null;
    
    // Check for invalid characters
    const validEmailRegex = /^[a-zA-Z0-9._\-@ ]*$/;
    if (!validEmailRegex.test(email)) {
      emailError = 'Only letters, numbers, dots, underscores, hyphens, and @ are allowed';
    }
    
    // Check length
    if (email.length > 50) {
      emailError = 'Email must not exceed 50 characters';
    }
    
    // Check email format
    if (email.length > 0 && !emailError) {
      const emailRegex = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9._\-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        if (!email.includes('@')) {
          emailError = 'Please include @ in the email address';
        } else if (!email.includes('.')) {
          emailError = 'Please include a domain (e.g., .com, .edu)';
        } else {
          emailError = 'Please enter a valid email address (e.g., example@domain.com)';
        }
      }
    }
    
    if (emailError) {
      setEmailError(emailError);
      return;
    }

    setIsLoading(true);

    try {

      console.log('Submitting password reset for email:', email);

      const result = await onSubmit(email);
      
      if (result) {
      setResetData(result);
      setStep('pin');
        console.log('Password reset email sent successfully');
      } else {
        throw new Error('No result returned from password reset');
      }
    } catch (err: any) {
      console.error('Error during email submission:', err);
      
      // More specific error handling
      let errorMessage = 'Failed to send reset code';
      
      if (err.message) {
        if (err.message.includes('not found') || err.message.includes('invalid')) {
          // errorMessage = 'Email address not found. Please check your email and try again.';
          errorMessage = 'Reset code will be sent if the email is correct.';
        } else if (err.message.includes('too many') || err.message.includes('rate')) {
          errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
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
      // Sanitize password to prevent SQL injection
      const sanitizedPassword = sanitizePassword(newPassword);
      
      // Validate password silently (no descriptive messages)
      if (!validatePassword(sanitizedPassword)) {
        setPasswordError('Invalid');
        setIsLoading(false);
        return;
      }

      // Reset the password using sanitized password
      const passwordResetResult = await resetData.resetPassword({
        password: sanitizedPassword
      });

      console.log('Password reset result:', passwordResetResult);

      // If a session was created during reset, sign out immediately
      if (passwordResetResult?.status === 'complete') {
        console.log('Password reset completed successfully');
        
        // Check if we're now signed in and sign out if needed
        if (clerk) {
          // Small delay to let Clerk process the session creation
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Force sign out to prevent auto-login
            console.log('Force signing out after successful password reset...');
            await clerk.signOut();
            
            // Additional delay to ensure sign out completes
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (signOutError) {
            console.error('Error signing out after password reset:', signOutError);
          }
        }
      }

      // Sync the password status in Supabase
      try {
        console.log('Attempting to sync password status for email:', email);
        
        // Try to get the user ID from the reset data
        const userID = resetData?.userData?.id || passwordResetResult?.userData?.id;
        console.log('User ID from reset data:', userID);
        
        const response = await fetch('/api/sync-user-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email,
            userID: userID 
          }),
        });
        
        // Check if response has content
        const contentType = response.headers.get('content-type');
        let result = {};
        
        if (contentType && contentType.includes('application/json')) {
          try {
            result = await response.json();
          } catch (jsonError) {
            console.warn('Failed to parse sync response as JSON:', jsonError);
            result = { error: 'Invalid JSON response' };
          }
        } else {
          result = { error: 'Non-JSON response received', status: response.status };
        }
        
        console.log('Sync response:', result);
        
        if (!response.ok) {
          console.warn('Sync API returned non-OK status:', response.status, result);
          // Log as warning instead of error since this doesn't affect password reset functionality
        } else {
          console.log('Password sync completed successfully');
        }
      } catch (syncError) {
        console.warn('Error syncing password status:', syncError);
        // Don't fail the password reset if sync fails - this is optional functionality
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Clear all state
    setEmail('');
    setPin('');
    setNewPassword('');
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setShowNewPassword(false);
    setStep('email');
    setResetData(null);
    setIsLoading(false);
    
    // Call the parent close handler
    onClose();
    
    // No page refresh when just closing the modal
    // User should be able to close and reopen without losing their place
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

        {/* Helpful explanation for non-tech savvy users */}
        {step === 'email' && (
          <p className="text-sm text-gray-600 mb-4">
            If you've forgotten your password, we'll help you create a new one. 
            Enter your email address and we'll send you a verification code to confirm it's really you.
          </p>
        )}

        {step === 'success' ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">Your password has been successfully reset.</p>
            <p className="text-gray-600 mb-4 text-sm">You can now sign in with your new password.</p>
            <button
              onClick={async () => {
                try {
                  // Ensure user is signed out after password reset
                  if (clerk) {
                    console.log('Final sign out before returning to login...');
                    await clerk.signOut();
                    
                    // Wait for sign out to complete
                    await new Promise(resolve => setTimeout(resolve, 500));
                  }
                  
                  // Just close the modal - no page refresh or navigation
                  handleClose();
                  
                  console.log('Password reset completed. User can now sign in with new password.');
                } catch (error) {
                  console.error('Error signing out after password reset:', error);
                  // Still proceed with closing the modal
                  handleClose();
                }
              }}
              className="bg-[#800000] text-white px-6 py-2 rounded hover:bg-[#800000]/80 transition-colors"
            >
              Continue to Sign In
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
                <p className="text-sm text-gray-600 mb-3">
                  We've sent a verification code to your email. This code helps us make sure it's really you trying to reset your password.
                </p>
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
                <p className="text-sm text-gray-600 mb-3">
                  Now create a new password for your account. Make sure it's something you'll remember, but keep it secure.
                </p>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                <input
                  id="new-password"
                    type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                      const value = e.target.value;
                      const sanitized = sanitizePassword(value);
                      setNewPassword(sanitized);
                    setError(null);
                      
                      // Real-time password validation
                      const validation = validatePassword(sanitized);
                      setPasswordError(validation ? null : 'Invalid');
                  }}
                  className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#800000]`}
                  placeholder="Enter new password"
                />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black focus:outline-none"
                    disabled={isLoading}
                  >
                    {showNewPassword ? (
                      <Eye className="h-[18px] w-[18px]" />
                    ) : (
                      <EyeOff className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
                {/* Password validation errors are not displayed to prevent information disclosure */}
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
                disabled={isLoading}
                className="px-4 py-2 text-sm text-white rounded bg-[#800000] hover:bg-[#800000]/80 disabled:opacity-50 disabled:cursor-not-allowed"
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
  const { isLoaded, isSignedIn, user } = useUser();
  const { signIn } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect_url');
  const portal = searchParams?.get('portal');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [hasAttemptedSignIn, setHasAttemptedSignIn] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [isProcessingPasswordReset, setIsProcessingPasswordReset] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [userRolesList, setUserRolesList] = useState<string[]>([]);

  // Function to show error popup
  const showErrorPopup = (message: string) => {
    setErrorModalMessage(message);
    setShowErrorModal(true);
  };

  // Check for pending password reset after page reload
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      const pendingReset = localStorage.getItem('pendingPasswordReset');
      console.log('Checking for pending password reset...', { pendingReset, isLoaded, isSignedIn });
      
      if (pendingReset) {
        try {
          const resetData = JSON.parse(pendingReset);
          const timeDiff = Date.now() - resetData.timestamp;
          
          console.log('Found pending reset:', resetData, 'Time diff:', timeDiff);
          
          // If the pending reset is less than 5 minutes old, auto-open the modal
          if (timeDiff < 5 * 60 * 1000) {
            console.log('Resuming password reset for:', resetData.email);
            
            // Wait a bit more for the page to fully load before opening modal
            setTimeout(() => {
              setShowForgotPasswordModal(true);
              // Clear the pending reset
              localStorage.removeItem('pendingPasswordReset');
            }, 1000);
          } else {
            // Clear old pending reset
            console.log('Clearing old pending reset');
            localStorage.removeItem('pendingPasswordReset');
          }
        } catch (error) {
          console.error('Error parsing pending password reset:', error);
          localStorage.removeItem('pendingPasswordReset');
        }
      }
    }
  }, [isLoaded]);

  // Prevent back/forward navigation to portal or sign-in for authenticated users
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Replace portal entry in history if present (removes portal from back navigation)
    // This ensures portal is removed from history when navigating to sign-in
    const currentPath = window.location.pathname;
    // Replace current entry to remove portal from history
    window.history.replaceState({ url: currentPath, preventBack: true }, '', currentPath);

    const handlePopState = () => {
      // Use setTimeout to check after navigation has occurred
      setTimeout(() => {
        const currentPath = window.location.pathname;
        
        // If user is authenticated and tries to navigate to portal or sign-in, redirect them
        if (isLoaded && isSignedIn && user) {
          // Prevent navigation to portal (/) or sign-in
          if (currentPath === '/' || currentPath === '/sign-in' || currentPath.startsWith('/sign-in')) {
            // Get user role and redirect appropriately
            const checkAndRedirect = async () => {
              try {
                const { data: userData } = await supabase
                  .from('User')
                  .select(`
                    UserRole!inner (
                      role:Role (name)
                    )
                  `)
                  .eq('Email', user.emailAddresses[0].emailAddress.toLowerCase().trim())
                  .single();

                if (userData) {
                  const role = (userData as any).UserRole?.[0]?.role?.name?.toLowerCase() || '';
                  const redirectPath = role === 'admin' || role === 'super admin' 
                    ? '/dashboard/admin' 
                    : role === 'faculty' 
                    ? '/dashboard/faculty' 
                    : '/dashboard';
                  
                  window.history.replaceState({ url: redirectPath, preventBack: true }, '', redirectPath);
                  router.replace(redirectPath);
                }
              } catch (error) {
                console.error('Error redirecting on navigation:', error);
              }
            };
            checkAndRedirect();
          }
        }
        
        // Also prevent forward navigation to portal or sign-in for unauthenticated users
        // (to prevent going forward from portal to sign-in and vice versa)
        if (!isSignedIn && (currentPath === '/' || currentPath === '/sign-in' || currentPath.startsWith('/sign-in'))) {
          // Allow navigation within sign-in flow, but prevent going to portal
          if (currentPath === '/') {
            // If trying to go forward to portal, stay on sign-in
            const signInPath = window.location.pathname.startsWith('/sign-in') 
              ? window.location.pathname 
              : '/sign-in';
            window.history.replaceState({ url: signInPath, preventBack: true }, '', signInPath);
            router.replace(signInPath);
          }
        }
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoaded, isSignedIn, user, router]);

  // Check if user is already signed in and redirect accordingly
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Check if there's a pending password reset - if so, don't redirect
      const pendingReset = typeof window !== 'undefined' ? localStorage.getItem('pendingPasswordReset') : null;
      
      // Only redirect if user is actually authenticated and we're not in a loading state
      // Don't auto-redirect if user explicitly chose a portal (they want to sign in as different user)
      // Don't auto-redirect if there's a pending password reset
      console.log('Auto-redirect check:', { isLoaded, isSignedIn, user: !!user, isLoading, portal, pendingReset: !!pendingReset });
      
      if (isLoaded && isSignedIn && user && !isLoading && !pendingReset) {
        try {
          // Add initial delay to ensure Clerk auth is fully propagated
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Get user's role from Supabase with retries
          let userData = null;
          let error = null;
          const maxRetries = 3;
          const retryDelay = 1000;

          for (let i = 0; i < maxRetries; i++) {
            const result = await supabase
              .from('User')
              .select(`
                UserID,
                Status,
                isDeleted,
                UserRole (
                  role:Role (
                    name
                  )
                )
              `)
              .eq('Email', user.emailAddresses[0].emailAddress.toLowerCase().trim())
              .single();

            if (result.data && !result.error) {
              userData = result.data;
              break;
            }

            error = result.error;
            if (i < maxRetries - 1) {
              console.log(`Retry ${i + 1} for user data fetch`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }

          if (error || !userData) {
            console.error("Error fetching user role:", error);
            // Don't redirect if we can't verify the user
            return;
          }

          // Check if user is active
          if (!userData || userData.isDeleted || userData.Status !== 'Active') {
            console.log("User is not active or has been deleted");
            // Don't redirect inactive users, let them see an error
            return;
          }

          const roleData = userData?.UserRole?.[0]?.role;
          const role = (roleData as any)?.name?.toLowerCase() || '';

          // Check if the current portal matches the user's role
          const userMatchesPortal = !portal || 
            (portal === 'admin' && (role === 'admin' || role === 'super admin')) || 
            (portal === 'faculty' && role === 'faculty');

          if (!userMatchesPortal) {
            console.log(`User role (${role}) doesn't match portal (${portal}), signing out`);
            // Sign out the user if they're trying to access wrong portal
            if (clerk) {
              await clerk.signOut();
              return;
            }
          }

          console.log(`Redirecting authenticated ${role} user to dashboard...`);

          // Use window.location.replace for hard redirect to prevent back navigation
          if (role === 'admin' || role === 'super admin') {
            window.location.replace('/dashboard/admin');
          } else if (role === 'faculty') {
            window.location.replace('/dashboard/faculty');
          } else {
            window.location.replace('/dashboard');
          }
        } catch (error) {
          console.error("Error during authentication verification:", error);
          // Don't redirect on error, let the user try again
          return;
        }
      }
    };

    // Add a small delay before checking to avoid immediate redirects
    const timer = setTimeout(checkAuthAndRedirect, 500);
    
    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, user, router, isLoading, portal]);

  // If still loading, show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  // If user is already signed in and not accessing a specific portal, show a loading message
  if (isSignedIn && user && !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading. Please wait...</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      // Handle pasted content that might exceed max length
      const trimmedValue = value.length > 50 ? value.slice(0, 50) : value;
      
      const emailValidationError = validateEmailCharacters(trimmedValue);
      setEmailError(emailValidationError);
      
      // Only prevent invalid characters, but allow length trimming
      if (emailValidationError && emailValidationError.includes('Only letters, numbers')) {
        return;
      }
      
      setEmail(trimmedValue);
      
      // Clear general error if email becomes valid
      if (!emailValidationError) {
        setError(null);
      }
    }
    
    if (name === 'password') {
       // Sanitize password input to prevent SQL injection
      const sanitized = sanitizePassword(value);
      
      // Validate password silently (no error messages displayed)
      const isValid = validatePassword(sanitized);
      
      // Update password state with sanitized value
      setPassword(sanitized);
       // Clear any previous password errors when user types
       setPasswordError(null);
       if (isValid) {
        setError(null);
      }
      // Clear email error if password is being edited and email is valid
      if (isValid && !validateEmailCharacters(email)) {
        setEmailError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setHasAttemptedSignIn(true);

    // Validate empty fields
    let hasErrors = false;
    if (!email || !email.trim()) {
      setEmailError('Email is required');
      hasErrors = true;
    }
    if (!password || !password.trim()) {
      setPasswordError('Password is required');
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setIsLoading(true);

    try {
      // Get client IP for rate limiting with fallback and timeout
      let userIP: string;
      try {
        // Add timeout to IP fetch to prevent hanging
        const ipPromise = getClientIp();
        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('IP fetch timeout')), 3000)
        );
        
        userIP = await Promise.race([ipPromise, timeoutPromise]);
      } catch (ipError) {
        console.warn('IP detection failed, using fallback:', ipError);
        userIP = 'unknown';
      }

      // Check rate limiting with appropriate limiter
      try {
        if (userIP === 'unknown') {
          await unknownIPRateLimiter.consume('unknown');
        } else {
          await loginRateLimiter.consume(userIP);
        }
      } catch {
        setIsLoading(false);
        showErrorPopup('Too many login attempts. Please try again later.');
        return;
      }

      // Check IP-based login attempts
      const { blocked, remainingAttempts } = checkLoginAttempts(userIP);
      if (blocked) {
        setIsLoading(false);
        showErrorPopup('Account temporarily locked due to too many failed attempts. Please try again later.');
        return;
      }

      if (email.length > 50) {
        setIsLoading(false);
        setEmailError('Email must not exceed 50 characters');
        return;
      }

      const emailValidationError = validateEmailCharacters(email);
      if (emailValidationError) {
        setIsLoading(false);
        setEmailError(emailValidationError);
        return;
      }

     // Sanitize password to prevent SQL injection
     const sanitizedPassword = sanitizePassword(password);
      
     // Validate password silently (no descriptive messages)
      if (!validatePassword(sanitizedPassword)) {
        setIsLoading(false);
        setPasswordError('Invalid password format');
        return;
      }

      if (!signIn) {
        setIsLoading(false);
        showErrorPopup('Authentication is not initialized');
        return;
      }

      // Attempt to sign in with Clerk first (using sanitized password)
      let result;
      try {
        result = await signIn.create({
          identifier: email,
          password: sanitizedPassword,
        });
      } catch (clerkError: any) {
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        console.error('Clerk authentication failed:', clerkError);
        showErrorPopup('Invalid Credentials');
        return;
      }

      if (result.status !== "complete") {
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        showErrorPopup('Invalid Credentials');
        return;
      }

      // Add initial delay to allow Clerk auth to propagate
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Add retry mechanism for new users
      const maxRetries = 5; // Increased from 3 to 5
      const retryDelay = 1000; // 1 second
      let retryCount = 0;
      let userCheck;
      let userError;

      while (retryCount < maxRetries) {
        // Test database connection first
        try {
          const { error: connectionError } = await supabase.from('User').select('UserID').limit(1);
          if (connectionError && connectionError.message.includes('connection')) {
            console.error('Database connection issue detected:', connectionError);
            setIsLoading(false);
            showErrorPopup('Service temporarily unavailable. Please try again in a moment.');
            return;
          }
        } catch (connError) {
          console.error('Database connection test failed:', connError);
          setIsLoading(false);
          showErrorPopup('Service temporarily unavailable. Please try again in a moment.');
          return;
        }

        // Now verify the user exists in our database and get their role
        try {
          const { data, error } = await supabase
            .from('User')
            .select(`
              UserID,
              Status,
              isDeleted,
              UserRole (
                role:Role (
                  name
                )
              )
            `)
            .eq('Email', email.toLowerCase().trim())
            .single();

          userCheck = data;
          userError = error;

          if (userCheck && userCheck.UserRole?.[0]?.role) {
            break; // User found with role, exit retry loop
          }

          // If user not found or no role and we haven't exceeded retries, wait and try again
          if (retryCount < maxRetries - 1) {
            console.log(`User not found or no role in database, retry ${retryCount + 1} of ${maxRetries}`);
            // Exponential backoff: wait longer between each retry
            await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount)));
            retryCount++;
          } else {
            // Sign out of Clerk since we couldn't verify the user in our database
            if (clerk) {
              await clerk.signOut();
            }
            recordFailedLoginAttempt(userIP);
            setIsLoading(false);
            showErrorPopup('Account setup in progress. Please try again in a few moments.');
            return;
          }
        } catch (dbError) {
          console.error('Database query error:', dbError);
          userError = dbError;
          break;
        }
      }

      if (userError || !userCheck || !userCheck.UserRole?.[0]?.role) {
        // Sign out of Clerk since we couldn't verify the user
        if (clerk) {
          await clerk.signOut();
        }
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        showErrorPopup('Invalid Credentials');
        return;
      }

      const userRoles = userCheck.UserRole;
      
      // Check if user is deleted or inactive
      if (userCheck.isDeleted || userCheck.Status !== 'Active') {
        recordFailedLoginAttempt(userIP);
        setIsLoading(false);
        showErrorPopup('Invalid Credentials');
        return;
      }

      // If we get here, both Clerk authentication and database verification passed
      resetLoginAttempts(userIP); // Reset attempts on successful login
      
      // Get all user roles
      const allRoles = userRoles.map((ur: any) => ur.role.name.toLowerCase());
      setUserRolesList(allRoles);
      
      // Role-based login validation (check if user has any of the required roles for portal)
      if (portal) {
        if (portal === 'admin' && !allRoles.some(r => r === 'admin' || r === 'super admin')) {
          recordFailedLoginAttempt(userIP);
          setIsLoading(false);
          showErrorPopup('Invalid Credentials');
          return;
        }
        
        if (portal === 'faculty' && !allRoles.includes('faculty')) {
          recordFailedLoginAttempt(userIP);
          setIsLoading(false);
          showErrorPopup('Invalid Credentials');
          return;
        }
      }
      
      // Force a small delay to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If user has multiple roles, show role selection
      if (allRoles.length > 1) {
        setIsLoading(false);
        setShowRoleSelection(true);
        return;
      }
      
      // Single role - proceed with redirect
      const userRole = allRoles[0];
      handleRoleSelected(userRole);
    } catch (err: any) {
      setIsLoading(false);
      console.error('Login error:', err);
      // Override all error messages with our custom message for security
      showErrorPopup('Invalid Credentials');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleRoleSelected = async (role: string) => {
    // Store selected role
    setSelectedRole(role);
    
    // Determine redirect path
    const redirectPath = redirectUrl || getDashboardPath(role);
    
    // Handle redirect
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', redirectPath);
      window.location.replace(redirectPath);
    }
  };

  const handleForgotPassword = async (email: string) => {
    if (!signIn) {
      throw new Error('Authentication is not initialized');
    }

    try {
      setIsProcessingPasswordReset(true);
      
      // More robust sign-out process for password reset
      if (isSignedIn && clerk) {
        console.log('User is signed in, need to sign out before password reset...');
        console.log('Current user:', user?.emailAddresses?.[0]?.emailAddress);
        console.log('Reset email:', email);
        
        // Store the password reset intent in localStorage
        if (typeof window !== 'undefined') {
          const resetData = {
            email,
            timestamp: Date.now(),
            portal: portal || null,
            redirectUrl: redirectUrl || null
          };
          console.log('Storing pending password reset:', resetData);
          localStorage.setItem('pendingPasswordReset', JSON.stringify(resetData));
        }
        
        console.log('Signing out user...');
        await clerk.signOut();
        
        // Longer delay to ensure sign out is complete and state is cleared
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force a page reload to clear any cached state
        if (typeof window !== 'undefined') {
          console.log('Reloading page to clear auth state...');
          window.location.reload();
          return; // This will stop execution as page reloads
        }
      }

      console.log('Initiating password reset for:', email);
      
      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      if (!result) {
        throw new Error('Failed to initiate password reset');
      }

      console.log('Password reset initiated successfully:', result);
      return result;
    } catch (err: any) {
      console.error('Password reset error:', err);
      // Don't show "clerk is not defined" error to user
      if (err.message?.includes('clerk is not defined')) {
        throw new Error('Authentication service is not available. Please refresh the page and try again.');
      }
      throw new Error(err.message || 'Failed to send reset code');
    } finally {
      setIsProcessingPasswordReset(false);
    }
  };

  // Show role selection if user has multiple roles
  if (showRoleSelection) {
    return <RoleSelection onRoleSelected={handleRoleSelected} />;
  }

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
                <span className="font-bold text-[#800000]">SJSFI-HRMS</span>
                {portal ? (
                  <span className="ml-1">
                    {portal === 'admin' ? 'Admin Portal' : 
                     portal === 'faculty' ? 'Employee Portal' : 
                     'Portal'}
                  </span>
                ) : redirectUrl ? (
                  <span className="ml-1">
                    {redirectUrl.includes('admin') ? 'Admin Module' : 
                     redirectUrl.includes('faculty') ? 'Faculty Module' : 
                     'Module'}
                  </span>
                ) : (
                  <span className="ml-1">Portal</span>
                )}
              </h1>
            </div>
            <div className="flex flex-col items-center justify-center w-full">
              <p className="text-center text-black text-sm mb-4">
                Sign in to start your session
              </p>
              <form onSubmit={handleSubmit} className="w-full px-4" autoComplete="off">
                <div className="mb-4 w-full">
                  <div className="relative w-full">
                    <input
                      autoComplete="off"
                      placeholder="Email Address"
                      className={`bg-white border text-black text-sm border-gray-300 rounded-sm px-4 py-2 w-full focus:outline-0 focus:ring-1 ${
                        emailError ? 'focus:ring-red-500 border-red-500' : 'focus:ring-[#800000]'
                      }`}
                      type="text"
                      name="email"
                      value={email}
                      onChange={handleInputChange}
                      onPaste={(e) => {
                        // Allow paste to happen, then validate after a brief delay
                        setTimeout(() => {
                          const target = e.target as HTMLInputElement;
                          handleInputChange({
                            target: { name: 'email', value: target.value }
                          } as React.ChangeEvent<HTMLInputElement>);
                        }, 0);
                      }}
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
                        passwordError ? 'focus:ring-red-500 border-red-500' : 'focus:ring-[#800000]'
                      }`}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={handleInputChange}
                      onPaste={(e) => {
                        // Allow paste to happen, then validate after a brief delay
                        setTimeout(() => {
                          const target = e.target as HTMLInputElement;
                          handleInputChange({
                            target: { name: 'password', value: target.value }
                          } as React.ChangeEvent<HTMLInputElement>);
                        }, 0);
                      }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black focus:outline-none"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <Eye className="h-[18px] w-[18px]" />
                      ) : (
                        <EyeOff className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1 text-xs text-red-600">{passwordError}</p>
                  )}
                  {error && !passwordError && (
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                  )}
                </div>
                <div className="mb-4 w-full">
                  <button
                    type="submit"
                    className="text-sm rounded-sm px-4 py-2 w-full transition duration-200 ease-in-out bg-[#800000] hover:bg-[#800000]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
                <div className="mb-4 w-full">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-sm text-[#800000] hover:text-[#800000]/80 focus:outline-none w-full text-center"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="flex items-center justify-center mb-4 w-full">
                  <p className="text-sm text-black text-center">
                    By using this service, you understood and agree to the
                    <span className="font-medium text-[#DAA520]"> SJSFI Online Services </span>
                    <a
                      className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                      target="_blank"
                      href="https://sjsfi.vercel.app/privacy-policy"
                    >
                      Privacy Policy,
                    </a>
                    {' '}
                    <a
                      className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                      href="https://sjsfi.vercel.app/terms-of-service"
                      target="_blank"
                    >
                      Terms of Use,
                    </a>
                    {' '}and{' '}
                    <a
                      className="text-[#800000] hover:text-[#800000]/80 transition duration-200 ease-in-out underline"
                      href="https://sjsfi.vercel.app/data-privacy"
                      target="_blank"
                    >
                      Data Privacy Notice
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
        clerk={clerk}
      />

      <WarningModal
        isOpen={showErrorModal}
        message={errorModalMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </>
  );
} 
