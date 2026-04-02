import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import { Camera, CheckCircle, Smartphone, Power, PowerOff, AlertCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function SupervisorScanner() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedQR, setScannedQR] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const fetchQRState = async (qrId) => {
    if (!/^\d{8}$/.test(qrId)) {
      setStatus({ type: 'error', message: 'Invalid Tag: QR code must be an 8-digit number.' });
      setScannedQR(null);
      setActiveSession(null);
      return;
    }
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const res = await apiClient.get(`/qr/${qrId}`);
      setScannedQR(res.data.qr);
      setActiveSession(res.data.active_session);
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to fetch QR details. Ensure this is a valid system QR.' 
      });
      setScannedQR(null);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (result) => {
    if (result && result.length > 0) {
      const qrId = result[0].rawValue;
      setShowScanner(false);
      fetchQRState(qrId);
    }
  };

  const toggleStatus = async (newStatus) => {
    if (!scannedQR) return;
    
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      if (newStatus === 'active') {
          await apiClient.patch(`/qr/${scannedQR.id}/enable`, {});
          setStatus({ type: 'success', message: 'Tag activated successfully!' });
        } else {
          // Handle release
          if (activeSession) {
            await apiClient.patch(`/session/${activeSession.id}/close`, {});
          }
          await apiClient.patch(`/qr/${scannedQR.id}/disable`, {});
          setStatus({ type: 'success', message: 'Tag released successfully!' });
        }

      // Refresh state
      fetchQRState(scannedQR.id);
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || `Failed to ${newStatus === 'active' ? 'activate' : 'release'} tag.` 
      });
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border dark:border-gray-700">
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
              <Camera size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Supervisor Scanner</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quickly activate or release tags</p>
            </div>
          </div>
          <button 
            onClick={() => setShowScanner(!showScanner)}
            className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-800/50 font-medium transition-colors"
            type="button"
          >
            <Smartphone size={16} /> {showScanner ? "Close Camera" : "Open Camera"}
          </button>
        </div>

        {status.message && (
          <div className={`p-4 rounded-md flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300'}`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{status.message}</span>
          </div>
        )}

        {showScanner && (
          <div className="rounded-lg overflow-hidden border-2 border-purple-500 mb-4 bg-black">
            <Scanner 
              onScan={handleScan}
              onError={(error) => {
                console.error(error);
                setStatus({ type: 'error', message: 'Camera access denied or error occurred.' });
              }}
            />
          </div>
        )}

        {loading && <div className="text-center py-4 dark:text-gray-300">Loading...</div>}

        {!loading && scannedQR && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50 dark:bg-gray-700/50">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Scanned Tag</h3>
            <div className="mb-4">
              <p className="text-lg font-bold text-gray-900 dark:text-white break-all">{scannedQR.id}</p>
              {scannedQR.notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{scannedQR.notes}</p>}
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current Status:</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase
                ${scannedQR.status === 'active' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'}`}>
                {scannedQR.status}
              </span>
            </div>

            {scannedQR.status !== 'active' ? (
              <button 
                onClick={() => toggleStatus('active')} 
                className="w-full flex justify-center items-center gap-2 bg-green-600 dark:bg-green-700 text-white px-4 py-3 rounded-md text-base font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <Power size={20} /> Activate Tag
              </button>
            ) : (
              <button 
                onClick={() => toggleStatus('inactive')} 
                className="w-full flex justify-center items-center gap-2 bg-gray-800 dark:bg-gray-700 text-white px-4 py-3 rounded-md text-base font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
              >
                <PowerOff size={20} /> Release Tag
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}