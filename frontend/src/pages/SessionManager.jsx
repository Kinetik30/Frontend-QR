import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Power, PowerOff, PlayCircle, StopCircle, RefreshCcw, ArrowLeft } from 'lucide-react';

export default function SessionManager() {
  const { qrId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Form states for new session
  const [batch, setBatch] = useState('');
  const [product, setProduct] = useState('');

  const fetchQRData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/qr/${qrId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch QR details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRData();
  }, [qrId]);

  const toggleStatus = async (newStatus) => {
    try {
      if (newStatus === 'active') await apiClient.patch(`/qr/${qrId}/enable`);
      if (newStatus === 'inactive') await apiClient.patch(`/qr/${qrId}/disable`);
      fetchQRData();
      setStatusMessage(`QR successfully marked as ${newStatus}`);
    } catch (err) {
      setStatusMessage('Update failed: ' + err.response?.data?.detail);
    }
  };

  const startSession = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/qr/${qrId}/session`, {
        batch_number: batch,
        product_name: product
      });
      setBatch('');
      setProduct('');
      fetchQRData();
      setStatusMessage('New session started successfully!');
    } catch (err) {
      setStatusMessage('Failed to start session: ' + err.response?.data?.detail);
    }
  };

  const closeSession = async (sessionId) => {
    try {
      await apiClient.patch(`/session/${sessionId}/close`);
      // Releasing a tag makes it inactive
      await apiClient.patch(`/qr/${qrId}/disable`);
      fetchQRData();
      setStatusMessage('Tag released successfully.');
    } catch (err) {
      setStatusMessage('Failed to release tag: ' + err.response?.data?.detail);
    }
  };

  if (loading) return <div className="dark:text-white">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const { qr, active_session: session } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/dashboard" className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>
      
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">QR Code Controls</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{qr.id}</p>
          </div>
          <div className="flex gap-2">
            {qr.status !== 'active' && (
              <button onClick={() => toggleStatus('active')} className="flex items-center gap-1 bg-green-600 dark:bg-green-700 text-white px-3 py-2 rounded text-sm hover:bg-green-700 dark:hover:bg-green-600">
                <Power size={16} /> Activate Tag
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Current Status:</span>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase
              ${qr.status === 'active' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' 
              : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'}`}>
              {qr.status}
            </span>
          </div>

          {statusMessage && (
            <div className="p-3 mb-4 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
              {statusMessage}
            </div>
          )}

          {/* Active Session Viewer */}
          <div className="mt-8">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Active Production Session</h4>
            
            {session ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white"><span className="text-gray-500 dark:text-gray-400">Batch:</span> {session.batch_number || 'N/A'}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white"><span className="text-gray-500 dark:text-gray-400">Product:</span> {session.product_name || 'N/A'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">Session ID: {session.id}</p>
                </div>
                <div>
                  <button 
                    onClick={() => closeSession(session.id)}
                    className="flex items-center gap-1 bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 dark:hover:bg-gray-600"
                  >
                    <StopCircle size={16} /> Release Tag
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No active session on this QR code.</p>
                
                {qr.status === 'active' ? (
                  <form onSubmit={startSession} className="max-w-md mx-auto space-y-3 text-left">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Batch Number</label>
                      <input type="text" required value={batch} onChange={e=>setBatch(e.target.value)} className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                      <input type="text" required value={product} onChange={e=>setProduct(e.target.value)} className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
                    </div>
                    <button type="submit" className="w-full flex justify-center items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                      <PlayCircle size={16} /> Start New Session
                    </button>
                    <button type="button" onClick={() => toggleStatus('inactive')} className="w-full flex justify-center items-center gap-1 bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 dark:hover:bg-gray-600 mt-2">
                      <PowerOff size={16} /> Release Tag
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">Enable the QR code to start a session.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
