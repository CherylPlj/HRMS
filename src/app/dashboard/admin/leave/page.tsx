"use client";

import { Suspense } from 'react';
import LeaveContent from '@/components/LeaveContent';

function LeaveContentFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading leave management...</p>
      </div>
    </div>
  );
}

export default function LeavePage() {
  return (
    <Suspense fallback={<LeaveContentFallback />}>
      <LeaveContent />
    </Suspense>
  );
}

