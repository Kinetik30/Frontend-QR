import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ArrowLeft, ArrowRight, Clock, QrCode, Activity, User, Calendar } from 'lucide-react';

export default function QRHistory() {
  const { qrId } = useParams();

  const [tagDetails, setTagDetails] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [enabledByName, setEnabledByName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [tagRes, deptRes, usersRes, sessionRes] = await Promise.allSettled([
          apiClient.get(`/qr/${qrId}`),
          apiClient.get('/departments'),
          apiClient.get('/users'),
          apiClient.get(`/session/${qrId}`)
        ]);

        let qrData = null;
        if (tagRes.status === 'fulfilled') {
          const data = tagRes.value.data;
          qrData = data?.qr || data;
          setTagDetails(qrData);
        } else {
          setError('QR Tag not found.');
          setLoading(false);
          return;
        }

        // Get active session from /session/{qrId} — same endpoint ScanPage uses
        if (sessionRes.status === 'fulfilled') {
          const sessionData = sessionRes.value.data;
          if (sessionData) {
            setActiveSession(sessionData);
          }
        }



        if (deptRes.status === 'fulfilled') {
          const deptData = deptRes.value.data;
          const depts = Array.isArray(deptData) ? deptData : deptData?.items || [];
          const sorted = [...depts].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
          setDepartments(sorted);
        }

        // Resolve enabled_by UUID to actual user name
        if (qrData?.enabled_by && usersRes.status === 'fulfilled') {
          const usersData = usersRes.value.data;
          const users = Array.isArray(usersData) ? usersData : usersData?.items || [];
          const found = users.find(u => u.id === qrData.enabled_by);
          setEnabledByName(found?.name || found?.email || qrData.enabled_by);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [qrId]);

  const formatDate = (d) => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const isActive = tagDetails?.status === 'active' || tagDetails?.is_active;

  // Build progress tracker for a session
  const renderProgressTracker = (session) => {
    let highestCompletedIdx = -1;
    if (departments.length > 0) {
      departments.forEach((dept, idx) => {
        const hasRemark = session.remarks?.find(r =>
          r.department_id === dept.id || r.department === dept.name || r.department === dept.dept_type
        );
        if (hasRemark) highestCompletedIdx = idx;
      });
    }

    const isReleaseNext = departments.length > 0 && highestCompletedIdx === departments.length - 1;
    const releaseHasRemark = session.remarks?.find(r => r.department === 'Release' || r.department_id === 'Release');
    const isReleaseCompleted = releaseHasRemark || session.status === 'closed' || session.status === 'rel' || session.status === 'com';

    let releaseColorClasses = "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400";
    if (isReleaseCompleted) {
      releaseColorClasses = "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
    } else if (isReleaseNext) {
      releaseColorClasses = "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500/30 dark:text-purple-400";
    }
    if (!isActive) {
      releaseColorClasses = "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400";
    }

    return (
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2 no-scrollbar">
        {/* Activation Node */}
        <div className={`flex items-center text-sm font-medium px-4 py-1.5 rounded-md border shadow-sm ${
          isActive 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400' 
            : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400'
        }`}>
          Activation
        </div>
        <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />

        {departments.length > 0 ? (
          departments.map((dept, idx) => {
            const isCompleted = idx <= highestCompletedIdx;
            const isCurrent = idx === highestCompletedIdx + 1;

            const deptRemarks = session.remarks?.filter(r =>
              r.department_id === dept.id || r.department === dept.name || r.department === dept.dept_type
            ) || [];
            const hasError = deptRemarks.some(r => r.issue_remarks && r.issue_remarks.trim() !== "");

            let colorClasses = "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400";
            if (isActive) {
              if (hasError) {
                colorClasses = "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400";
              } else if (isCompleted) {
                colorClasses = "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
              } else if (isCurrent) {
                colorClasses = "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500/30 dark:text-blue-400";
              }
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
          Array.isArray(session.remarks) && session.remarks.length > 0 ? (
            session.remarks.map((remark, idx) => (
              <React.Fragment key={remark.id || idx}>
                 <div className={`flex items-center text-sm font-medium px-4 py-1.5 rounded-md border shadow-sm ${
                  isActive 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400'
                }`}>
                  {remark.department || 'Scan'}
                </div>
                <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
              </React.Fragment>
            ))
          ) : (
            <React.Fragment>
              <div className={`flex items-center text-sm font-medium px-4 py-1.5 rounded-md border shadow-sm ${
                isActive 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400' 
                  : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-400'
              }`}>
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
    );
  };

  if (loading) return <div className="p-6 text-center dark:text-white">Loading History...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  const qr = tagDetails;

  return (
    <div className="relative max-w-5xl mx-auto space-y-6 p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      <Link to="/tags" className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 relative z-10">
        <ArrowLeft size={16} className="mr-1" /> Back to QR Tags
      </Link>

      {/* Tag Info Card */}
      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden relative z-10">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <QrCode className="text-gray-500 dark:text-gray-400" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{qrId}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{qr?.notes || 'No label'}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
            isActive
              ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800'
              : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
          }`}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {/* Tag Details Grid */}
        <div className="grid grid-cols-3 gap-4 p-6">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created At</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 flex items-center gap-1">
              <Calendar size={14} className="text-gray-400" /> {formatDate(qr?.created_at) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enabled At</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 flex items-center gap-1">
              <Clock size={14} className="text-gray-400" /> {isActive ? formatDate(qr?.enabled_at) || 'Never' : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enabled By</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 flex items-center gap-1">
              <User size={14} className="text-gray-400" /> {isActive ? enabledByName || 'N/A' : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Session with Progress Tracker */}
      {activeSession && (
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden relative z-10">
          <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center gap-2">
            <Activity className="text-gray-500 dark:text-gray-400" size={20} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Current Session</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ml-auto font-semibold ${
              isActive 
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              {activeSession.batch_number && (
                <span className="text-sm font-medium text-gray-900 dark:text-white">Batch: {activeSession.batch_number}</span>
              )}
              {activeSession.product_name && (
                <span className="text-sm text-gray-600 dark:text-gray-400">| {activeSession.product_name}</span>
              )}
            </div>

            {/* Progress Tracker */}
            {renderProgressTracker(activeSession)}

            {/* Active Session Remarks */}
            {activeSession.remarks && activeSession.remarks.length > 0 && (
              <div className="mt-4 ml-1">
                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Remarks</h5>
                <ul className="space-y-2">
                  {activeSession.remarks.map((remark, idx) => (
                    <li key={remark.id || idx} className={`text-sm flex gap-4 border-l-2 pl-3 py-1 ${
                      remark.issue_remarks && remark.issue_remarks.trim()
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-emerald-500 dark:border-emerald-400'
                    }`}>
                      <span className="text-gray-500 dark:text-gray-400 font-mono text-xs min-w-[140px]">
                        {formatDate(remark.created_at || remark.scanned_at) || 'N/A'}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white min-w-[100px]">
                        {remark.department || remark.department_id || 'Unknown'}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {remark.ok_remarks || remark.issue_remarks || remark.notes || '-'}
                      </span>
                      {remark.issue_remarks && remark.issue_remarks.trim() && (
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Issue</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
