'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SessionUser {
  UserID: string;
  FirstName: string;
  LastName: string;
  Email: string;
  LastLogin: string | null;
  Status: string;
  UserRole: {
    role: {
      name: string;
    }[];
  }[];
}

interface AuditLog {
  LogID: number;
  UserID: string;
  ActionType: string;
  EntityAffected: string;
  ActionDetails: string;
  IPAddress: string;
  Timestamp: string;
  User: {
    FirstName: string;
    LastName: string;
    Email: string;
  }[];
}

export default function SessionManagementContent() {
  const { user } = useUser();
  const [activeSessions, setActiveSessions] = useState<SessionUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'activity'>('sessions');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('24h');

  const fetchActiveSessions = async () => {
    try {
      // Get users who have logged in within the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('User')
        .select(`
          UserID,
          FirstName,
          LastName,
          Email,
          LastLogin,
          Status,
          UserRole (
            role:Role (
              name
            )
          )
        `)
        .gte('LastLogin', twentyFourHoursAgo.toISOString())
        .eq('Status', 'Active')
        .eq('isDeleted', false)
        .order('LastLogin', { ascending: false });

      if (error) throw error;
      setActiveSessions(data || []);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      let query = supabase
        .from('ActivityLog')
        .select(`
          LogID,
          UserID,
          ActionType,
          EntityAffected,
          ActionDetails,
          IPAddress,
          Timestamp,
          User (
            FirstName,
            LastName,
            Email
          )
        `)
        .order('Timestamp', { ascending: false })
        .limit(100);

      // Apply time filter
      if (timeFilter !== 'all') {
        const hoursBack = timeFilter === '1h' ? 1 : timeFilter === '24h' ? 24 : timeFilter === '7d' ? 168 : 720;
        const timeAgo = new Date();
        timeAgo.setHours(timeAgo.getHours() - hoursBack);
        query = query.gte('Timestamp', timeAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error fetching recent activity:', error);
        throw error;
      }
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Set empty array on error to prevent UI crashes
      setRecentActivity([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchActiveSessions(), fetchRecentActivity()]);
      setLoading(false);
    };

    fetchData();
  }, [timeFilter]);

  const handleForceLogout = async (userId: string) => {
    try {
      // This would require integration with Clerk to actually force logout
      // For now, we'll just update the LastLogin to simulate session end
      const { error } = await supabase
        .from('User')
        .update({ 
          LastLogin: null,
          DateModified: new Date().toISOString()
        })
        .eq('UserID', userId);

      if (error) throw error;
      await fetchActiveSessions(); // Refresh the list
    } catch (error) {
      console.error('Error forcing logout:', error);
    }
  };

  const filteredSessions = activeSessions.filter(session =>
    session.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.Email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActivity = recentActivity.filter(activity =>
    activity.User?.[0]?.FirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.User?.[0]?.LastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.User?.[0]?.Email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.ActionType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.ActionDetails?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Management</h2>
        <p className="text-gray-600">Monitor active user sessions and system activity.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Sessions ({filteredSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Activity ({filteredActivity.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search users or activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#800000]"
            />
          </div>
          {activeTab === 'activity' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#800000]"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Sessions (Last 24 Hours)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => {
                  const userRole = session.UserRole?.[0]?.role?.[0]?.name || 'No Role';
                  const lastLogin = session.LastLogin ? new Date(session.LastLogin) : null;
                  const timeAgo = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60)) : null;
                  
                  return (
                    <tr key={session.UserID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {session.FirstName} {session.LastName}
                          </div>
                          <div className="text-sm text-gray-500">{session.Email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userRole === 'Super Admin' ? 'bg-purple-100 text-purple-800' :
                          userRole === 'Admin' ? 'bg-red-100 text-red-800' :
                          userRole === 'Faculty' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {userRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lastLogin ? (
                          <div>
                            <div>{lastLogin.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">
                              {timeAgo !== null && (
                                timeAgo < 60 ? `${timeAgo}m ago` :
                                timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago` :
                                `${Math.floor(timeAgo / 1440)}d ago`
                              )}
                            </div>
                          </div>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          timeAgo !== null && timeAgo < 30 ? 'bg-green-100 text-green-800' :
                          timeAgo !== null && timeAgo < 120 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {timeAgo !== null && timeAgo < 30 ? 'Active' :
                           timeAgo !== null && timeAgo < 120 ? 'Idle' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {session.UserID !== user?.id && (
                          <button
                            onClick={() => handleForceLogout(session.UserID)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                          >
                            Force Logout
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No active sessions found in the last 24 hours.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent System Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredActivity.map((activity) => (
                  <tr key={activity.LogID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {activity.User?.[0]?.FirstName} {activity.User?.[0]?.LastName}
                        </div>
                        <div className="text-sm text-gray-500">{activity.User?.[0]?.Email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        activity.ActionType?.includes('login') ? 'bg-green-100 text-green-800' :
                        activity.ActionType?.includes('delete') ? 'bg-red-100 text-red-800' :
                        activity.ActionType?.includes('create') ? 'bg-blue-100 text-blue-800' :
                        activity.ActionType?.includes('update') ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.ActionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {activity.ActionDetails}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.IPAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activity.Timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredActivity.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No activity found for the selected time range.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 