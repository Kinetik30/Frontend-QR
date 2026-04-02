import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Camera, Send, CheckCircle, Smartphone } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ScanPage() {
  const [qrId, setQrId] = useState('');
  const [itemId, setItemId] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [errorRemarks, setErrorRemarks] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await apiClient.get('/departments');
        const fetched = res.data?.items || res.data || [];
        const sorted = [...fetched].sort((a, b) => 
          (a.sequence_order || 0) - (b.sequence_order || 0)
        );
        setDepartments(sorted);
      } catch (err) {
        console.error('Failed to fetch departments', err);
      }
    };
    fetchDepartments();
  }, []);

  const handleScan = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!qrId || !itemId || !department) {
      setStatus({ type: 'error', message: 'QR ID, Item ID, and Department are required.' });
      return;
    }

    if (!/^\d{8}$/.test(qrId)) {
      setStatus({ type: 'error', message: 'Invalid Tag: QR code must be an 8-digit number.' });
      return;
    }

    setStatus({ type: '', message: '' });
    setLoading(true);

    try {
      // First verify if item exists to handle unique constraint warning or validation
      // Usually checking if the QR already logged an item or if the item is known
      const sessionRes = await apiClient.get(`/session/${qrId}`);
      if (sessionRes.data && sessionRes.data.remarks) {
         const isItemAlreadyUsed = sessionRes.data.remarks.some(r => r.item_id === itemId);
         if (isItemAlreadyUsed) {
           setStatus({ type: 'error', message: 'Item ID has already been logged. Please use a unique Item ID.' });
           setLoading(false);
           return;
         }
      }
    } catch (err) {
      // Ignore get session errors here and let the post handle failures (like session not active)
    }

    try {
      await apiClient.post(`/session/${qrId}/remarks`, {
        department_id: department,
        item_id: itemId,
        general_remarks: generalRemarks,
        issue_remarks: errorRemarks
      });
      setStatus({ type: 'success', message: 'Scan logged successfully!' });
      setQrId('');
      setItemId('');
      setGeneralRemarks('');
      setErrorRemarks('');
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.detail || 'Failed to log scan. QR might not be active.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-xl mx-auto space-y-8 p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-emerald-50 dark:from-gray-900 dark:via-indigo-900/20 dark:to-gray-900">
      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl p-6 space-y-6 border border-white/50 dark:border-gray-700/50 relative z-10">
        <div className="flex justify-between items-center border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100/50 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-300">
              <Camera size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Operator Scanner</h2>
          </div>
          <button 
            onClick={() => setShowScanner(!showScanner)}
            className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 font-medium"
            type="button"
          >
            <Smartphone size={16} /> {showScanner ? "Close Camera" : "Open Camera"}
          </button>
        </div>

        {status.message && (
          <div className={`p-4 rounded-md flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {status.type === 'success' ? <CheckCircle size={20} /> : <span className="font-bold">!</span>}
            <span>{status.message}</span>
          </div>
        )}

        {showScanner && (
          <div className="rounded-lg overflow-hidden border-2 border-blue-500 mb-4 bg-black">
            <Scanner 
              onScan={(result) => {
                if (result && result.length > 0) {
                  const scannedId = result[0].rawValue;
                  if (!/^\d{8}$/.test(scannedId)) {
                    setStatus({ type: 'error', message: 'Invalid Tag: QR code must be an 8-digit number.' });
                    setShowScanner(false);
                    return;
                  }
                  setQrId(scannedId);
                  setShowScanner(false);
                  setStatus({ type: 'success', message: 'QR Scanned successfully!' });
                }
              }}
              onError={(error) => {
                console.error(error);
                setStatus({ type: 'error', message: 'Camera access denied or error occurred.' });
              }}
            />
          </div>
        )}

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">QR ID</label>
            <input
              type="text"
              required
              maxLength={8}
              placeholder="Scan or type 8-digit ID..."
              value={qrId}
              onChange={(e) => setQrId(e.target.value.replace(/\D/g, ''))}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white dark:placeholder-gray-400 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item ID</label>
            <input
              type="text"
              required
              placeholder="e.g. ITEM-204"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-gray-700 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department / Station</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-gray-700 sm:text-sm"
              >
                <option value="">Select a department...</option>
                {departments.map((d, index) => (
                  <option key={d.id} value={d.id}>
                    {d.sequence_order ?? index + 1}. {d.name || d.dept_type}
                  </option>
                ))}
              </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">General Remarks</label>
            <textarea
              rows={2}
              placeholder="Any general observations?"
              value={generalRemarks}
              onChange={(e) => setGeneralRemarks(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-gray-700 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Error Remarks</label>
            <textarea
              rows={2}
              placeholder="Describe any issues or defects..."
              value={errorRemarks}
              onChange={(e) => setErrorRemarks(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-gray-900 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-gray-700 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !qrId}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Send size={18} />
            {loading ? 'Logging...' : 'Log Scan'}
          </button>
        </form>
      </div>
    </div>
  );
}
