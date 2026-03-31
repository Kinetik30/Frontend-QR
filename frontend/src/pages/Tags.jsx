import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { QrCode, Activity, Clock, Smartphone, PlusCircle } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Tags() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [qrNotes, setQrNotes] = useState('');
  const [qrIdToRegister, setQrIdToRegister] = useState('');
  const [showRegisterScanner, setShowRegisterScanner] = useState(false);
  const navigate = useNavigate();

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/qr');
      setQrCodes(res.data);
    } catch (err) {
      setError('Failed to fetch QR codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, []);

  const registerQR = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await apiClient.post('/qr', { id: qrIdToRegister, notes: qrNotes });
      setQrNotes('');
      setQrIdToRegister('');
      setShowRegisterScanner(false);
      fetchQRCodes();
      alert('QR Created Successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create QR');
    } finally {
      setRegistering(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">Active</span>;
      case 'inactive': return <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full">Inactive</span>;
      default: return <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">{status}</span>;
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-white">Loading tags...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b dark:border-gray-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registered QR Tags</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage physical QR labels and their current sessions</p>
        </div>
        <button 
          onClick={() => setShowScanner(!showScanner)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Smartphone size={16} /> {showScanner ? "Close Camera" : "Scan to Find"}
        </button>
      </div>

      {showScanner && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan QR to open management view</h3>
          </div>
          <div className="rounded-lg overflow-hidden border-2 border-blue-500 max-w-sm mx-auto bg-black">
            <Scanner 
              onScan={(result) => {
                if (result && result.length > 0) {
                  setShowScanner(false);
                  navigate(`/qr/${result[0].rawValue}`);
                }
              }}
              onError={(err) => console.error(err)}
            />
          </div>
        </div>
      )}

      {/* Admin Only: Register New QR Tag inline */}
      {user?.role === 3 && (
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PlusCircle className="text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Register New QR</h3>
            </div>
            <button 
              onClick={() => setShowRegisterScanner(!showRegisterScanner)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              <Smartphone size={16} /> {showRegisterScanner ? "Close Scanner" : "Scan ID"}
            </button>
          </div>
          
          {showRegisterScanner && (
            <div className="mb-4 rounded-lg overflow-hidden border-2 border-green-500 max-w-sm mx-auto bg-black">
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    setQrIdToRegister(result[0].rawValue);
                    setShowRegisterScanner(false);
                  }
                }}
                onError={(err) => console.error(err)}
              />
            </div>
          )}

          <form onSubmit={registerQR} className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">QR ID (Scan or input manually)</label>
              <input 
                type="text" 
                value={qrIdToRegister} 
                onChange={e=>setQrIdToRegister(e.target.value)} 
                placeholder="Scanned or typed ID" 
                required
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" 
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">QR Label/Notes</label>
              <input 
                type="text" 
                value={qrNotes} 
                onChange={e=>setQrNotes(e.target.value)} 
                placeholder="e.g. Line 3 - Station 2" 
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
              />
            </div>
            <button 
              type="submit" 
              disabled={registering} 
              className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 h-10 w-full sm:w-auto"
            >
              Register QR
            </button>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {qrCodes.length === 0 ? (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">No QR codes registered.</li>
          ) : qrCodes.map((qr) => (
            <li key={qr.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <QrCode className="text-gray-500 dark:text-gray-400" size={24} />
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white break-all">{qr.id}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{qr.notes || 'No description provided'}</p>
                    <div className="mt-1">
                      {getStatusBadge(qr.status)}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    to={`/qr/${qr.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-md transition-colors"
                  >
                    <Activity size={16} /> {qr.status === 'active' ? 'Release Tag' : 'Activate Tag'}
                  </Link>
                  <Link
                    to={`/qr/${qr.id}/history`}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    <Clock size={16} /> History
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
