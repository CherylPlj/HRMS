'use client';

import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-4 text-gray-900">Reports Module</h2>
        <div className="bg-white rounded-lg shadow p-6 md:p-8 text-center border border-gray-200">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <p className="text-gray-600 mb-2">The Reports and Analytics module is currently under development.</p>
          <p className="text-sm text-gray-400">Please check back later for performance reports, attendance summaries, and recruitment analytics.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;