'use client';

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

export function SessionCleanup() {
  const { signOut } = useClerk();

  useEffect(() => {
    // Function to clear all session data
    const clearSession = async () => {
      try {
        await signOut();
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    };

    // Clear session on mount if there's no active session
    clearSession();

    // Handle page unload
    const handleUnload = () => {
      localStorage.clear();
      sessionStorage.clear();
    };

    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('unload', handleUnload);
    };
  }, [signOut]);

  return null;
} 