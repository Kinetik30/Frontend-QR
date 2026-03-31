import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users as UsersIcon, QrCode, Activity, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [qrRes, usersRes, sessionsRes] = await Promise.all([
          apiClient.get('/qr'),
          apiClient.get('/users').catch(() => ({ data: [] })), // Silently catch if not admin
          apiClient.get('/sessions').catch(() => ({ data: [] }))
        ]);
        setQrs(qrRes.data || []);
        setSessions(sessionsRes.data || []);
        
        if (usersRes.data) {
          setUsers(usersRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-center py-10 dark:text-gray-300">Loading Dashboard...</div>;

  // Compute QR Stats
  const activeQrs = qrs.filter(q => q.status === 'active').length;
  const inactiveQrs = qrs.filter(q => q.status === 'inactive').length;

  const qrChartData = [
    { name: 'Active', value: activeQrs, color: '#22c55e' }, // green-500
    { name: 'Inactive', value: inactiveQrs, color: '#ef4444' }, // red-500
  ];

  // Compute User Stats
  const rolesMap = { 1: 'Operators', 2: 'Supervisors', 3: 'Admins' };
  const userStats = users.reduce((acc, u) => {
    const roleName = rolesMap[u.role] || 'Unknown';
    acc[roleName] = (acc[roleName] || 0) + 1;
    return acc;
  }, {});

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 focus:outline-none">
          <p className="font-semibold text-gray-900 dark:text-white">{`${payload[0].name} QRs`}</p>
          <p className="text-sm font-medium" style={{ color: payload[0].payload.color }}>
            Total: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Overview of system operations and physical plant data</p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-${users.length > 0 ? '2' : '1'} gap-8`}>
        
        {/* QR Stats Graph */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2 border-b dark:border-gray-700 pb-4">
            <QrCode className="text-gray-600 dark:text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">QR Tag Status</h3>
          </div>
          
          {qrs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">No QR codes registered yet.</p>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qrChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      style={{ outline: "none" }}
                    >
                      {qrChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: "none" }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                <span>Total Mapped Tags: {qrs.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* User Stats Layout (Only shown if data is successfully returned/allowed) */}
        {users.length > 0 && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-4">
              <UsersIcon className="text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Registered Users</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700 col-span-2">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Users</p>
              </div>
              {Object.entries(userStats).map(([roleGroup, count]) => (
                <div key={roleGroup} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{roleGroup}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border dark:border-gray-700">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center gap-2">
          <Activity className="text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Active Sessions</h3>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {sessions.length === 0 ? (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">No active sessions found.</li>
          ) : sessions.map((session) => (
            <li key={session.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">{session.batch_number}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                 <Activity size={14} className="text-blue-500 dark:text-blue-400" /> Product: {session.product_name}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                 <Clock size={12} /> Started: {new Date(session.created_at).toLocaleString()}
                </span>
              </div>
              <Link
                to={`/qr/${session.qr_id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded transition-colors"
              >
                Manage
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
