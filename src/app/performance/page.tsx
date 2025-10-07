import React, { useState } from 'react';

const TASK_STATUSES = ['Completed', 'Ongoing', 'Pending'];
const dummyTasks = [
    { id: 1, employee: 'Erice Marial', department: 'Admin', task: 'Prepare report', status: 'Completed', date: '2025-10-01' },
    { id: 2, employee: 'Mark David Santos', department: 'Intermediate', task: 'Lesson plan', status: 'Ongoing', date: '2025-10-05' },
];

export default function PerformancePage() {
    const [filter, setFilter] = useState({ status: '', employee: '', date: '' });
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // Filtered tasks
    const filteredTasks = dummyTasks.filter(t =>
        (!filter.status || t.status === filter.status) &&
        (!filter.employee || t.employee.toLowerCase().includes(filter.employee.toLowerCase())) &&
        (!filter.date || t.date === filter.date)
    );

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-[#800000] mb-6">Performance Module</h1>
            {/* Filter/Search */}
            <div className="flex gap-4 mb-6 flex-wrap">
                <select className="border rounded px-3 py-2" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                    <option value="">All Statuses</option>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="border rounded px-3 py-2" placeholder="Employee" value={filter.employee} onChange={e => setFilter(f => ({ ...f, employee: e.target.value }))} />
                <input className="border rounded px-3 py-2" type="date" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} />
                <button className="bg-[#800000] text-white px-4 py-2 rounded">Search</button>
                <button className="border border-[#800000] text-[#800000] px-4 py-2 rounded">Export PDF</button>
                <button className="border border-[#800000] text-[#800000] px-4 py-2 rounded">Export Excel</button>
            </div>
            {/* Task Table */}
            <div className="overflow-x-auto mb-8">
                <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2 border-b text-left">Employee</th>
                            <th className="px-3 py-2 border-b text-left">Department</th>
                            <th className="px-3 py-2 border-b text-left">Task</th>
                            <th className="px-3 py-2 border-b text-left">Status</th>
                            <th className="px-3 py-2 border-b text-left">Date</th>
                            <th className="px-3 py-2 border-b text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border-b">{t.employee}</td>
                                <td className="px-3 py-2 border-b">{t.department}</td>
                                <td className="px-3 py-2 border-b">{t.task}</td>
                                <td className="px-3 py-2 border-b">{t.status}</td>
                                <td className="px-3 py-2 border-b">{t.date}</td>
                                <td className="px-3 py-2 border-b">
                                    <button className="text-[#800000] underline">Generate Report</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Rating & Comment Section */}
            <div className="bg-white rounded shadow p-6 mb-8 max-w-lg">
                <h2 className="text-lg font-semibold mb-2">Evaluation</h2>
                <div className="flex items-center gap-2 mb-2">
                    <span>Rating:</span>
                    {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} onClick={() => setRating(star)} className={star <= rating ? 'text-yellow-500' : 'text-gray-300'}>★</button>
                    ))}
                </div>
                <textarea className="border rounded w-full p-2 mb-2" rows={3} placeholder="Add comments..." value={comment} onChange={e => setComment(e.target.value)} />
                <button className="bg-[#800000] text-white px-4 py-2 rounded">Submit Evaluation</button>
            </div>
            {/* Notifications */}
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                <p className="font-bold">Notifications</p>
                <p>Report submissions and deadlines will appear here.</p>
            </div>
        </div>
    );
}
