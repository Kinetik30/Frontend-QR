import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ArrowLeft, Database, Clock } from 'lucide-react';

export default function QRHistory() {
  const { qrId } = useParams();
  const [history, setHistory] = useState([]);
  const [tagDetails, setTagDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [historyRes, tagRes] = await Promise.allSettled([
          apiClient.get(`/qr/${qrId}/history`),
          apiClient.get(`/qr/${qrId}`)
        ]);

        if (tagRes.status === 'fulfilled') {
          setTagDetails(tagRes.value.data);
        } else {
          setError('QR Tag not found.');
          setLoading(false);
          return;
        }

        if (historyRes.status === 'fulfilled') {
          setHistory(historyRes.value.data);
        } else {
          // If history throws 404, it might just mean no sessions exist.
          setHistory([]);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [qrId]);

  if (loading) return <div className="dark:text-white">Loading History...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="relative max-w-5xl mx-auto space-y-6 p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 relative z-10">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>

      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl px-6 py-5 relative z-10">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
          <Database className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">QR Lifecycle History</h2>
        </div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">QR UUID: {qrId}</p>
          {tagDetails && (
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${tagDetails.is_active ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}>
              {tagDetails.is_active ? 'ACTIVATED' : 'NOT ACTIVATED'}
            </span>
          )}
        </div>

        {tagDetails && tagDetails.supervisor_id && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Claimed by Supervisor: {tagDetails.supervisor_id}</p>
        )}

        <div className="space-y-8 mt-6">
          {history.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No production sessions recorded for this QR yet.</p>
          ) : (
            history.map((session, idx) => (
              <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full mr-3
                      ${session.status === 'open' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300'}`}>
                      {session.status.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Batch: {session.batch_number || 'N/A'} | {session.product_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={14} /> Created: {new Date(session.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-gray-800">
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Scan Events</h5>
                  {session.scans && session.scans.length > 0 ? (
                    <ul className="space-y-3">
                      {session.scans.map(scan => (
                        <li key={scan.id} className="text-sm text-gray-700 dark:text-gray-300 flex gap-4 border-l-2 border-blue-500 pl-3">
                          <span className="text-gray-500 dark:text-gray-400 font-mono text-xs w-32">{new Date(scan.scanned_at).toLocaleString()}</span>
                          <span className="font-medium text-gray-900 dark:text-white w-32">{scan.department}</span>
                          <span className="text-gray-600 dark:text-gray-400">{scan.notes || '-'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">No scans recorded in this session.</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
