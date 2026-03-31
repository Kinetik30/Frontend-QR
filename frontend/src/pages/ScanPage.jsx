import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import { Camera, Send, CheckCircle, Smartphone } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ScanPage() {
  const [qrId, setQrId] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!qrId || !department) {
      setStatus({ type: 'error', message: 'QR ID and Department are required.' });
      return;
    }

    setStatus({ type: '', message: '' });
    setLoading(true);

    try {
      await apiClient.post(`/qr/${qrId}/scan`, { department, notes });
      setStatus({ type: 'success', message: 'Scan logged successfully!' });
      setQrId('');
      setNotes('');
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
    <div className="max-w-xl mx-auto space-y-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 border dark:border-gray-700">
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
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
                  setQrId(result[0].rawValue);
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
            <label className="block text-sm font-medium text-gray-700">QR ID</label>
            <input
              type="text"
              required
              readOnly
              placeholder="Scan a QR code to fill..."
              value={qrId}
              onChange={(e) => setQrId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Department / Station</label>
            <input
              type="text"
              required
              placeholder="e.g. Assembly Line 1"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="Any issues or observations?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white sm:text-sm"
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
