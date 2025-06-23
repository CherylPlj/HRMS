'use client';

import { useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

export function SessionCleanup() {
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    // Clear session data when component mounts
    const clearSessionData = () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        // Clear any Clerk-specific items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('clerk') || key.startsWith('__clerk')) {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('clerk') || key.startsWith('__clerk')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    };

    // Clear session data when the user is explicitly signed out
    const handleUnload = () => {
      if (isLoaded && !isSignedIn) {
        clearSessionData();
      }
    };

    // Clear session data when tab/window is closed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearSessionData();
      }
    };

    // Add event listeners
    window.addEventListener('unload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener('unload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoaded, isSignedIn]);

  return null;
} 