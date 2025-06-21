'use client';

import { SessionCleanup } from "./SessionCleanup";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionCleanup />
      {children}
    </>
  );
} 