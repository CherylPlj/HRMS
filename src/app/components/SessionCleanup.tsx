'use client';

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

export function SessionCleanup() {
  const { signOut } = useClerk();

  useEffect(() => {
    // Handle tab close
    const handleTabClose = () => {
      signOut();
    };

    window.addEventListener('beforeunload', handleTabClose);

    // Handle server disconnect
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);
      ws.onclose = () => {
        signOut();
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }

    return () => {
      window.removeEventListener('beforeunload', handleTabClose);
      if (ws) {
        ws.close();
      }
    };
  }, [signOut]);

  return null;
} 