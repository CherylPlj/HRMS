'use client';

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

export function SessionCleanup() {
  const { signOut } = useClerk();

  useEffect(() => {
    // Only clean up session when the tab is actually closed, not on refresh
    const handleTabClose = (event: Event) => {
      // Check if it's a refresh
      if (window.performance && window.performance.navigation.type === 1) {
        return; // Don't sign out on refresh
      }
      
      // Only sign out if the tab is actually being closed
      if (!document.hidden) {
        return; // Don't sign out if the document is still visible
      }

      signOut();
    };

    window.addEventListener('beforeunload', handleTabClose);

    // Handle visibility change to detect actual tab close vs refresh
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Store a timestamp when the tab becomes hidden
        sessionStorage.setItem('tabHiddenAt', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        // Check if this is a refresh (quick visibility change) or a real tab close/reopen
        const hiddenAt = sessionStorage.getItem('tabHiddenAt');
        if (hiddenAt) {
          const hiddenDuration = Date.now() - parseInt(hiddenAt);
          if (hiddenDuration < 1000) { // Less than 1 second means it's likely a refresh
            sessionStorage.removeItem('tabHiddenAt');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [signOut]);

  return null;
} 