// app/applicant/page.tsx

import { Suspense } from 'react';
import ApplicantPage from '@/components/ApplicantPage';

function ApplicantPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading application form...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ApplicantPageFallback />}>
      <ApplicantPage />
    </Suspense>
  );
}