"use client";

import { Suspense } from 'react';
import RecruitmentContent from '@/components/RecruitmentContent';

function RecruitmentContentFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading recruitment...</p>
      </div>
    </div>
  );
}

export default function RecruitmentPage() {
  return (
    <Suspense fallback={<RecruitmentContentFallback />}>
      <RecruitmentContent />
    </Suspense>
  );
}
