import React, { useState, useEffect } from 'react';

type Notification = {
    id: number;
    message: string;
    isRead: boolean;
    createdAt: string;
};

type Task = {
    id: number;
    employee?: string;
    employeeId?: string;
    department?: string;
    title?: string;
    task?: string;
    status?: string;
    dueDate?: string;
    date?: string;
};

const TASK_STATUSES = ['Completed', 'Ongoing', 'Pending'];

export default function PerformancePage() {
    const [filter, setFilter] = useState({ status: '', employee: '', date: '' });
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notificationError, setNotificationError] = useState('');

    // Fetch tasks from backend
    useEffect(() => {
        async function fetchTasks() {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams();
                if (filter.status) params.append('status', filter.status);
                if (filter.employee) params.append('employeeId', filter.employee);
                if (filter.date) params.append('dateFrom', filter.date);
                const res = await fetch(`/api/performance/tasks?${params.toString()}`);
                if (!res.ok) throw new Error('Failed to fetch tasks');
                const data = await res.json();
                setTasks(data);
            } catch (err) {
                if (err instanceof Error) setError(err.message);
                else setError('Unknown error');
            } finally {
                setLoading(false);
            }
        }
        fetchTasks();
    }, [filter]);

    // Fetch notifications from backend
    useEffect(() => {
        async function fetchNotifications() {
            setLoadingNotifications(true);
            setNotificationError('');
            try {
                const res = await fetch('/api/performance/notifications');
                if (!res.ok) throw new Error('Failed to fetch notifications');
                const data = await res.json();
                setNotifications(data);
            } catch (err) {
                if (err instanceof Error) setNotificationError(err.message);
                else setNotificationError('Unknown error');
            } finally {
                setLoadingNotifications(false);
            }
        }
        fetchNotifications();
    }, []);

    // Filtered tasks (if backend returns more than needed)
    const filteredTasks = tasks.filter(t =>
        (!filter.status || t.status === filter.status) &&
        (!filter.employee || (t.employee?.toLowerCase() || '').includes(filter.employee.toLowerCase())) &&
        (!filter.date || t.dueDate?.slice(0, 10) === filter.date)
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
                <button className="border border-[#800000] text-[#800000] px-4 py-2 rounded" onClick={async () => {
                    if (!filteredTasks.length) return;
                    const res = await fetch('/api/performance/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'pdf', reportId: filteredTasks[0].id })
                    });
                    const data = await res.json();
                    if (data.url) window.open(data.url, '_blank');
                    else alert(data.error || 'Export failed');
                }}>Export PDF</button>
                <button className="border border-[#800000] text-[#800000] px-4 py-2 rounded" onClick={async () => {
                    if (!filteredTasks.length) return;
                    const res = await fetch('/api/performance/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'excel', reportId: filteredTasks[0].id })
                    });
                    const data = await res.json();
                    if (data.url) window.open(data.url, '_blank');
                    else alert(data.error || 'Export failed');
                }}>Export Excel</button>
            </div>
            {/* Task Table */}
            {loading && <div className="mb-4 text-gray-500">Loading tasks...</div>}
            {error && <div className="mb-4 text-red-500">{error}</div>}
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
                <button className="bg-[#800000] text-white px-4 py-2 rounded" onClick={async () => {
                    if (!filteredTasks.length || !rating) return alert('Select a task and rating');
                    try {
                        const res = await fetch('/api/performance/evaluations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                taskId: filteredTasks[0].id,
                                rating,
                                comment,
                                evaluatorId: 'currentUserId' // Replace with actual user id from auth context
                            })
                        });
                        if (!res.ok) throw new Error('Failed to submit evaluation');
                        setRating(0);
                        setComment('');
                        alert('Evaluation submitted!');
                        // Optionally refresh notifications
                        const notifRes = await fetch('/api/performance/notifications');
                        if (notifRes.ok) setNotifications(await notifRes.json());
                    } catch (err) {
                        alert(err instanceof Error ? err.message : 'Unknown error');
                    }
                }}>Submit Evaluation</button>
            </div>
            {/* Notifications */}
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                <p className="font-bold">Notifications</p>
                {loadingNotifications && <p>Loading notifications...</p>}
                {notificationError && <p className="text-red-500">{notificationError}</p>}
                {!loadingNotifications && !notificationError && notifications.length === 0 && <p>No notifications yet.</p>}
                <ul>
                    {notifications.map(n => (
                        <li key={n.id} className={n.isRead ? 'opacity-60' : ''}>
                            {n.message} <span className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
