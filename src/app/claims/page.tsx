
import React, { useState } from 'react';

const TABS = [
    { label: 'Configuration' },
    { label: 'Submit Claim' },
    { label: 'My Claims' },
    { label: 'Employee Claims' },
    { label: 'Assign Claim' },
];

const dummyClaims = [
    {
        referenceId: '20250930000015',
        employeeName: 'Ahmed Elian',
        eventName: 'Accommodation',
        description: 'Performance Test Claim - DSL Generated at 2025-09-30',
        currency: 'PHP',
        submittedDate: '2025-09-30',
        status: 'Initiated',
        amount: '0.00',
    },
];

export default function ClaimsPage() {
    const [activeTab, setActiveTab] = useState(3); // Default to 'Employee Claims'

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-[#800000] mb-6">CLAIMS</h1>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {TABS.map((tab, idx) => (
                    <button
                        key={tab.label}
                        onClick={() => setActiveTab(idx)}
                        className={`px-4 py-2 rounded-t-md font-medium border-b-2 transition-colors duration-150
                            ${activeTab === idx
                                ? 'bg-white border-[#800000] text-[#800000] shadow'
                                : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b shadow p-6">
                {activeTab === 3 && (
                    <>
                        {/* Filter/Search Form */}
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input className="border border-gray-300 rounded px-3 py-2" placeholder="Employee Name" />
                            <input className="border border-gray-300 rounded px-3 py-2" placeholder="Reference Id" />
                            <input className="border border-gray-300 rounded px-3 py-2" placeholder="Event Name" />
                            <input className="border border-gray-300 rounded px-3 py-2" type="date" placeholder="From Date" />
                            <input className="border border-gray-300 rounded px-3 py-2" type="date" placeholder="To Date" />
                            <select className="border border-gray-300 rounded px-3 py-2">
                                <option>Status</option>
                                <option>Initiated</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                            </select>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button className="bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-900 transition-colors">Search</button>
                            <button className="border border-[#800000] text-[#800000] px-4 py-2 rounded hover:bg-gray-100 transition-colors">Reset</button>
                            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors ml-auto">+ Assign Claim</button>
                        </div>

                        {/* Claims Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full border text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-3 py-2 border-b text-left">Reference Id</th>
                                        <th className="px-3 py-2 border-b text-left">Employee Name</th>
                                        <th className="px-3 py-2 border-b text-left">Event Name</th>
                                        <th className="px-3 py-2 border-b text-left">Description</th>
                                        <th className="px-3 py-2 border-b text-left">Currency</th>
                                        <th className="px-3 py-2 border-b text-left">Submitted Date</th>
                                        <th className="px-3 py-2 border-b text-left">Status</th>
                                        <th className="px-3 py-2 border-b text-left">Amount</th>
                                        <th className="px-3 py-2 border-b text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dummyClaims.map((claim, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 border-b">{claim.referenceId}</td>
                                            <td className="px-3 py-2 border-b">{claim.employeeName}</td>
                                            <td className="px-3 py-2 border-b">{claim.eventName}</td>
                                            <td className="px-3 py-2 border-b">{claim.description}</td>
                                            <td className="px-3 py-2 border-b">{claim.currency}</td>
                                            <td className="px-3 py-2 border-b">{claim.submittedDate}</td>
                                            <td className="px-3 py-2 border-b">{claim.status}</td>
                                            <td className="px-3 py-2 border-b">{claim.amount}</td>
                                            <td className="px-3 py-2 border-b">
                                                <button className="text-[#800000] underline hover:text-red-900">View Details</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {/* Placeholder for other tabs */}
                {activeTab !== 3 && (
                    <div className="text-gray-500 py-12 text-center">This feature will be implemented soon.</div>
                )}
            </div>
        </div>
    );
}
