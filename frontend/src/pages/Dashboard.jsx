import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users as UsersIcon, QrCode, Activity, Clock, ArrowRight, Eye, User, Shield, ClipboardList, UserCog } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [qrs, setQrs] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [qrRes, usersRes, sessionsRes, deptRes] = await Promise.all([
          apiClient.get('/qr').catch(() => ({ data: [] })),
          apiClient.get('/users').catch(() => ({ data: [] })),
          apiClient.get('/session/active-qrs').catch(() => ({ data: [] })),
          apiClient.get('/departments').catch(() => ({ data: [] }))
        ]);
        const safeGetArray = (res) => {
          if (!res || !res.data) return [];
          if (Array.isArray(res.data)) return res.data;
          const key = Object.keys(res.data).find(k => Array.isArray(res.data[k]));
          return key ? res.data[key] : [];
        };

        setQrs(safeGetArray(qrRes));
        setSessions(safeGetArray(sessionsRes));
        setUsers(safeGetArray(usersRes));
        
        const fetchedDepts = safeGetArray(deptRes);
        const sortedDepts = [...fetchedDepts].sort((a, b) => 
          (a.sequence_order || 0) - (b.sequence_order || 0)
        );
        setDepartments(sortedDepts);
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
  const activeQrs = (qrs || []).filter(q => q.status === 'active').length;
  const inactiveQrs = (qrs || []).filter(q => q.status === 'inactive').length;

  const qrChartData = [
    { name: 'Active', value: activeQrs, color: '#22c55e' }, // green-500
    { name: 'Inactive', value: inactiveQrs, color: '#ef4444' }, // red-500
  ];

  // Compute User Stats
    const rolesMap = { 
    1: 'Operators',
    2: 'Supervisors',
    3: 'Admins',
    'operator': 'Operators',
    'supervisor': 'Supervisors',
    'admin': 'Admins'
  };
  const userStats = (users || []).reduce((acc, u) => {
    let r = u?.role_level ?? u?.role ?? u?.role_id ?? u?.type ?? u?.account_type;
    if (r && typeof r === 'object') r = r.id || r.name || r.value;
    if (typeof r === 'string') {
      r = isNaN(Number(r)) ? r.toLowerCase().trim() : Number(r);
    }
    // If backend is returning 0 or it maps to nothing, default to operator
    if (!r || r === 0) r = 'operator';
    
    const roleName = rolesMap[r] || 'Operators';
    
    acc[roleName] = (acc[roleName] || 0) + 1;
    return acc;
  }, { Admins: 0, Supervisors: 0, Operators: 0 });

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

  const isAdmin = user?.role === 'admin';

  return (
    <div className="relative max-w-6xl mx-auto space-y-8 p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-gray-900">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Overview of system operations and physical plant data</p>
      </div>

      <div className="grid grid-cols-1 gap-8 relative z-10">
        
        {/* QR Stats Graph */}
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
            <QrCode className="text-gray-600 dark:text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">QR Tag Status</h3>
          </div>
          
          {(!qrs || qrs.length === 0) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">No QR codes registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mt-6">
              
              {/* Extreme left: Total Tags */}
              <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/60 dark:border-gray-700/50 flex flex-col justify-center items-center h-56 shadow-lg shadow-blue-900/5">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">Total</p>
                <div className="p-3 rounded-full mb-3 bg-blue-100/50 dark:bg-blue-900/30 backdrop-blur-sm">
                  <QrCode size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">MAPPED TAGS</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{qrs?.length || 0}</p>
              </div>

              {/* Middle: Active / Inactive Cards Stacked */}
              <div className="flex flex-col gap-4 h-56">
                <div className="bg-emerald-50/50 dark:bg-emerald-900/20 backdrop-blur-md p-4 rounded-2xl border border-emerald-100/60 dark:border-emerald-800/40 flex flex-col justify-center items-center flex-1 shadow-lg shadow-emerald-900/5">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Active</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeQrs}</p>
                </div>
                <div className="bg-red-50/50 dark:bg-red-900/20 backdrop-blur-md p-4 rounded-2xl border border-red-100/60 dark:border-red-800/40 flex flex-col justify-center items-center flex-1 shadow-lg shadow-red-900/5">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Inactive</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{inactiveQrs}</p>
                </div>
              </div>

              {/* Extreme right: Pie Chart */}
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qrChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      style={{ outline: "none" }}
                    >
                      {qrChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: "none" }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* User Stats Layout (Only shown if data is successfully returned/allowed and user is admin) */}
        {isAdmin && users?.length > 0 && (
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
              <UsersIcon className="text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Registered Users</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/60 dark:border-gray-700/50 flex flex-col justify-between items-center h-48 hover:shadow-xl transition-shadow shadow-blue-900/5 group">
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Total Users</p>
                <UsersIcon size={42} strokeWidth={1.5} className="text-indigo-500 dark:text-indigo-400 drop-shadow-sm my-2 group-hover:scale-110 transition-transform" />
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{users?.length || 0}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">TOTAL USERS</p>
              </div>

              {/* Admins */}
              <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/60 dark:border-gray-700/50 flex flex-col justify-between items-center h-48 hover:shadow-xl transition-shadow shadow-purple-900/5 group">
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Admins</p>
                <Shield size={42} strokeWidth={1.5} className="text-purple-500 dark:text-purple-400 drop-shadow-sm my-2 group-hover:scale-110 transition-transform" />
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{userStats['Admins'] || 0}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">ADMINS</p>
              </div>

              {/* Supervisors */}
              <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/60 dark:border-gray-700/50 flex flex-col justify-between items-center h-48 hover:shadow-xl transition-shadow shadow-blue-900/5 group">
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Supervisors</p>
                <ClipboardList size={42} strokeWidth={1.5} className="text-blue-500 dark:text-blue-400 drop-shadow-sm my-2 group-hover:scale-110 transition-transform" />
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{userStats['Supervisors'] || 0}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">SUPERVISORS</p>
              </div>

              {/* Operators */}
              <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/60 dark:border-gray-700/50 flex flex-col justify-between items-center h-48 hover:shadow-xl transition-shadow shadow-emerald-900/5 group">
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Operators</p>
                <UserCog size={42} strokeWidth={1.5} className="text-emerald-500 dark:text-emerald-400 drop-shadow-sm my-2 group-hover:scale-110 transition-transform" />
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{userStats['Operators'] || 0}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">OPERATORS</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden border border-white/50 dark:border-gray-700/50 relative z-10">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center gap-2">
          <Activity className="text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Active Sessions</h3>
        </div>
        <ul className="divide-y divide-gray-200/50 dark:divide-gray-700/50 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
          {(!sessions || sessions.length === 0) ? (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">No active sessions found.</li>
          ) : sessions.map((session) => {
            let highestCompletedIdx = -1;
            if (departments && departments.length > 0) {
              departments.forEach((dept, idx) => {
                const hasRemark = session.remarks?.find(r => r.department_id === dept.id || r.department === dept.name || r.department === dept.dept_type);
                if (hasRemark) highestCompletedIdx = idx;
              });
            }
            
            const isReleaseNext = departments && departments.length > 0 && highestCompletedIdx === departments.length - 1;
            const releaseHasRemark = session.remarks?.find(r => r.department === 'Release' || r.department_id === 'Release');
            const isReleaseCompleted = releaseHasRemark || session.status === 'rel' || session.status === 'com';

            let releaseColorClasses = "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400";
            if (isReleaseCompleted) {
              releaseColorClasses = "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
            } else if (isReleaseNext) {
              releaseColorClasses = "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500/30 dark:text-purple-400";
            }

            return (
              <li key={session.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-gray-900 dark:text-white text-lg">{session.id || session.qr_id || session.batch_number || 'Unknown ID'}</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Activity size={14} className="text-blue-500 dark:text-blue-400" /> {session.notes || session.product_name || 'No Label'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> {session.created_at ? new Date(session.created_at).toLocaleString() : 'Invalid Date'}
                  </span>
                </div>
                
                {/* Timeline UI */}
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2 no-scrollbar">
                  {/* Activation Node */}
                  <div className="flex items-center text-sm font-medium px-4 py-1.5 rounded-md border bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400 shadow-sm">
                    Activation
                  </div>

                  <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />

                  {/* Mid Nodes from Departments Pipeline */}
                  {departments && departments.length > 0 ? (
                    departments.map((dept, idx) => {
                      const isCompleted = idx <= highestCompletedIdx;
                      const isCurrent = idx === highestCompletedIdx + 1;

                      let colorClasses = "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400";
                      if (isCompleted) {
                        colorClasses = "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
                      } else if (isCurrent) {
                        colorClasses = "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-400";
                      }

                      return (
                        <React.Fragment key={dept.id || idx}>
                          <div className={`flex items-center text-sm font-medium px-4 py-1.5 rounded-md border shadow-sm transition-colors ${colorClasses}`}>
                            {dept.name || dept.dept_type}
                          </div>
                          <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        </React.Fragment>
                      );
                    })
                  ) : (
                    // Fallback to remarks mapping if no departments
                    Array.isArray(session.remarks) && session.remarks.length > 0 ? (
                      session.remarks.map((remark, idx) => (
                        <React.Fragment key={remark.id || idx}>
                          <div className="flex items-center text-sm font-medium px-4 py-1.5 rounded-md border bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400 shadow-sm">
                            {remark.department || 'Scanning'}
                          </div>
                          <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        </React.Fragment>
                      ))
                    ) : (
                      <React.Fragment>
                        <div className="flex items-center text-sm font-medium px-4 py-1.5 rounded-md border bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400 shadow-sm">
                          Scanning
                        </div>
                        <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      </React.Fragment>
                    )
                  )}

                  {/* Release Node */}
                  <div className={`flex items-center text-sm font-medium px-4 py-1.5 rounded-md border shadow-sm transition-colors ${releaseColorClasses}`}>
                    Release
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={`/qr/${session.id || session.qr_id}/history`}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <Eye size={16} /> View
                </Link>
                <Link
                  to={`/qr/${session.id || session.qr_id}`}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Release Tag
                </Link>
              </div>
            </li>
          )})}
        </ul>
      </div>
    </div>
  );
}
