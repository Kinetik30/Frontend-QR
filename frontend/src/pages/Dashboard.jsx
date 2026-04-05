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

  const [selectedSessionToRelease, setSelectedSessionToRelease] = useState(null);
  const [tagActionLoading, setTagActionLoading] = useState(false);
  const [tagActionMessage, setTagActionMessage] = useState({ text: '', type: '' });

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

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReleaseTag = async () => {
    if (!selectedSessionToRelease) return;
    setTagActionLoading(true);
    setTagActionMessage({ text: '', type: '' });
    
    try {
      const qrId = selectedSessionToRelease.qr_id || selectedSessionToRelease.id;
      
      // Single call: archives remarks to produced_items + disables QR atomically
      await apiClient.patch(`/session/${qrId}/close`, {});
      
      setTagActionMessage({ text: 'Tag successfully released and archived!', type: 'success' });
      fetchStats();
      
      setTimeout(() => {
        setSelectedSessionToRelease(null);
        setTagActionMessage({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      setTagActionMessage({ text: err.response?.data?.detail || 'Failed to release tag.', type: 'error' });
    } finally {
      setTagActionLoading(false);
    }
  };

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
    <div className="relative max-w-6xl mx-auto space-y-8 p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">

      <div className="grid grid-cols-1 gap-8 relative z-10">
        
        {/* QR Stats Graph */}
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-2 mb-2 pb-4">
            <QrCode className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">QR Tag Status</h3>
          </div>
          
          {(!qrs || qrs.length === 0) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">No QR codes registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mt-6">
              
              {/* Extreme left: Total Tags */}
              <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-gray-200 dark:border-gray-700/50 flex flex-col justify-center items-center h-56 shadow-lg shadow-blue-900/5">
                <p className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">Total</p>
                <div className="p-3 rounded-full mb-3 bg-blue-100/50 dark:bg-blue-900/30 backdrop-blur-sm">
                  <QrCode size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">MAPPED TAGS</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{qrs?.length || 0}</p>
              </div>

              {/* Middle: Active / Inactive Cards Stacked */}
              <div className="flex flex-col gap-4 h-56">
                {/* Active Card */}
                <div className="relative bg-white dark:bg-gray-800 p-5 rounded-[1.5rem] shadow-xl shadow-[#22c55e]/20 border border-gray-200 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-[#22c55e]/30 transition-all duration-300 flex-1 flex group">
                  <div className="absolute right-0 top-4 bottom-4 w-3 bg-[#22c55e] rounded-l-xl transition-all group-hover:w-4"></div>
                  <div className="flex justify-between items-center w-full pr-6">      
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active</h4>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeQrs}</p>
                    </div>
                    <div className="p-2.5 border-[1.5px] border-gray-800 dark:border-gray-200 rounded-xl">
                      <QrCode size={22} strokeWidth={2.2} className="text-[#22c55e]" />
                    </div>
                  </div>
                </div>

                {/* Inactive Card */}
                <div className="relative bg-white dark:bg-gray-800 p-5 rounded-[1.5rem] shadow-xl shadow-[#ef4444]/20 border border-gray-200 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-[#ef4444]/30 transition-all duration-300 flex-1 flex group">
                  <div className="absolute right-0 top-4 bottom-4 w-3 bg-[#ef4444] rounded-l-xl transition-all group-hover:w-4"></div>
                  <div className="flex justify-between items-center w-full pr-6">      
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Inactive</h4>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{inactiveQrs}</p>
                    </div>
                    <div className="p-2.5 border-[1.5px] border-gray-800 dark:border-gray-200 rounded-xl">
                      <QrCode size={22} strokeWidth={2.2} className="text-[#ef4444]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Extreme right: Donut Chart with Center Stat */}
              <div className="h-56 w-full relative flex items-center justify-center">
                {/* Center Stat Overlay (placed behind the chart SVG) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                  <span className="text-3xl font-bold text-gray-800 dark:text-white">
                    {qrs && qrs.length > 0 ? Math.round((activeQrs / qrs.length) * 100) : 0}%
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                    Active
                  </span>
                </div>

                <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                  <PieChart>
                    <Pie
                      data={qrChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      style={{ outline: "none" }}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {qrChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          style={{ outline: "none", transition: 'opacity 0.3s ease, filter 0.3s ease' }} 
                          className="hover:opacity-80 hover:drop-shadow-md cursor-pointer transition-all duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ fill: 'transparent' }} 
                      isAnimationActive={true} 
                      animationDuration={300}
                      animationEasing="ease-out"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* User Stats Layout (Only shown if data is successfully returned/allowed and user is admin) */}
        {isAdmin && users?.length > 0 && (
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-2 mb-6 pb-4">
              <UsersIcon className="text-[#00c897]" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Registered Users</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">     
              {/* Total Users */}
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl shadow-[#00c897]/25 border border-gray-200 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-[#00c897]/40 transition-all duration-300 flex min-h-[140px] group">
                <div className="absolute right-0 top-6 bottom-6 w-3.5 bg-[#00c897] rounded-l-2xl transition-all group-hover:w-5"></div>
                <div className="flex flex-col justify-between w-full pr-4">      
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 border-[1.5px] border-gray-800 dark:border-gray-200 rounded-xl">
                      <UsersIcon size={24} strokeWidth={2.2} className="text-[#00c897]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Users</h4>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{users?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Admins */}
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl shadow-[#9c27b0]/25 border border-gray-200 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-[#9c27b0]/40 transition-all duration-300 flex min-h-[140px] group">
                <div className="absolute right-0 top-6 bottom-6 w-3.5 bg-[#9c27b0] rounded-l-2xl transition-all group-hover:w-5"></div>
                <div className="flex flex-col justify-between w-full pr-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 border-[1.5px] border-gray-800 dark:border-gray-200 rounded-xl">
                      <Shield size={24} strokeWidth={2.2} className="text-[#9c27b0]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Admins</h4> 
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{userStats['Admins'] || 0}</p>
                  </div>
                </div>
              </div>

              {/* Supervisors */}
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl shadow-[#ff7900]/25 border border-gray-200 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-[#ff7900]/40 transition-all duration-300 flex min-h-[140px] group">
                <div className="absolute right-0 top-6 bottom-6 w-3.5 bg-[#ff7900] rounded-l-2xl transition-all group-hover:w-5"></div>
                <div className="flex flex-col justify-between w-full pr-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 border-[1.5px] border-gray-800 dark:border-gray-200 rounded-xl">
                      <ClipboardList size={24} strokeWidth={2.2} className="text-[#ff7900]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Supervisors</h4>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{userStats['Supervisors'] || 0}</p>
                  </div>
                </div>
              </div>

              {/* Operators */}
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl shadow-[#4863ff]/25 border border-gray-200 dark:border-gray-700/50 hover:shadow-2xl hover:shadow-[#4863ff]/40 transition-all duration-300 flex min-h-[140px] group">
                <div className="absolute right-0 top-6 bottom-6 w-3.5 bg-[#4863ff] rounded-l-2xl transition-all group-hover:w-5"></div>
                <div className="flex flex-col justify-between w-full pr-4">      
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 border-[1.5px] border-gray-800 dark:border-gray-200 rounded-xl">
                      <UserCog size={24} strokeWidth={2.2} className="text-[#4863ff]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Operators</h4>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white">{userStats['Operators'] || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700/50 relative z-10">
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
              <li key={session.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-gray-900 dark:text-white text-lg">{session.id || session.qr_id || session.batch_number || 'Unknown ID'}</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Activity size={14} className="text-blue-500 dark:text-blue-400" /> {session.notes || session.product_name || 'No Label'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> {(() => {
                      const d = session.enabled_at || session.created_at || session.activated_at;
                      if (!d) return 'No date';
                      const parsed = new Date(d);
                      return isNaN(parsed.getTime()) ? 'No date' : parsed.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                    })()}
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

                        const deptRemarks = session.remarks?.filter(r => r.department_id === dept.id || r.department === dept.name || r.department === dept.dept_type) || [];
                        const hasError = deptRemarks.some(r => r.issue_remarks && r.issue_remarks.trim() !== "");

                        let colorClasses = "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400";
                        if (hasError) {
                          colorClasses = "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400";
                        } else if (isCompleted) {                            colorClasses = "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
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
              
              <div className="flex items-center gap-2 flex-shrink-0 mb-2">
                <Link
                  to={`/qr/${session.qr_id || session.id}/history`}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <Eye size={16} /> View
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedSessionToRelease(session);
                  }}
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
                    isReleaseNext
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Release Tag
                </button>
              </div>
            </li>
          )})}
        </ul>
      </div>

      {selectedSessionToRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Release Active Session</h3>
              <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-4">Tag ID: {selectedSessionToRelease.qr_id || selectedSessionToRelease.id}</p>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4 border border-gray-100 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Session Notes / Product</p>
                <div className="flex justify-between items-start mb-3">
                  <p className="text-gray-900 dark:text-white">{selectedSessionToRelease.notes || selectedSessionToRelease.product_name || 'No description'}</p>
                </div>
              </div>

              {tagActionMessage.text && (
                <div className={`p-3 mb-4 rounded text-sm ${tagActionMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {tagActionMessage.text}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {(!tagActionMessage.text || tagActionMessage.type === 'error') && !tagActionLoading && (
                  <button 
                    onClick={handleReleaseTag}
                    disabled={tagActionLoading}
                    className="flex-1 text-white rounded-md py-2 font-medium transition bg-red-600 hover:bg-red-700"
                  >
                    Release Tag
                  </button>
                )}
                {(tagActionMessage.type === 'success' || tagActionLoading) && (
                  <button 
                    disabled
                    className="flex-1 text-white rounded-md py-2 font-medium transition bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                  >
                    {tagActionLoading ? 'Processing...' : 'Done'}
                  </button>
                )}
                <button 
                  onClick={() => { setSelectedSessionToRelease(null); setTagActionMessage({ text: '', type: '' }); }}
                  disabled={tagActionLoading}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


