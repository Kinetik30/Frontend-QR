import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { QrCode, Activity, Clock, Smartphone, PlusCircle, Trash } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Tags() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOperator = user?.role === 'operator';
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [qrNotes, setQrNotes] = useState('');
  const [qrIdToRegister, setQrIdToRegister] = useState('');
  const [showRegisterScanner, setShowRegisterScanner] = useState(false);
  const [scanMessage, setScanMessage] = useState({ text: '', type: '' });
  const [createMessage, setCreateMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  // Tag Modal states
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagActionLoading, setTagActionLoading] = useState(false);
  const [tagActionMessage, setTagActionMessage] = useState({ text: '', type: '' });
  const [tagToDelete, setTagToDelete] = useState(null);
  const [activationNotes, setActivationNotes] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isPaginatedView, setIsPaginatedView] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [readyForRelease, setReadyForRelease] = useState(new Set());

  const fetchQRCodes = async (page = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/qr?page=${page}&page_size=10`);
      
      let qrData = [];
      if (res.data?.items) {
        qrData = res.data.items;
        setTotalPages(res.data.total_pages || 1);
        setTotalItems(res.data.total || 0);
      } else {
        // Fallback for mock or unexpected structure
        qrData = Array.isArray(res.data) ? res.data : [];
        const key = Object.keys(res.data || {}).find(k => Array.isArray(res.data[k]));
        if (key && !Array.isArray(res.data)) qrData = res.data[key];
        
        // Mock fallback pagination
        setTotalPages(1);
        setTotalItems(qrData.length);
      }

      // Operators can only see active tags
      if (isOperator) {
        setQrCodes((qrData || []).filter(q => q.status === 'active'));
      } else {
        setQrCodes(qrData || []);
      }
      setCurrentPage(page);
    } catch (err) {
      setError('Failed to fetch QR codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes(1);
    // Fetch departments for release-readiness check
    apiClient.get('/departments').then(res => {
      const depts = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setDepartments([...depts].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)));
    }).catch(() => {});
  }, []);

  // Check which active QRs are ready for release
  useEffect(() => {
    if (departments.length === 0 || qrCodes.length === 0) return;
    const activeQrs = qrCodes.filter(q => q.status === 'active');
    if (activeQrs.length === 0) return;

    const checkRelease = async () => {
      const releaseSet = new Set();
      await Promise.all(activeQrs.map(async (qr) => {
        try {
          const res = await apiClient.get(`/session/${qr.id}`);
          const remarks = res.data?.remarks || [];
          let highestIdx = -1;
          departments.forEach((dept, idx) => {
            const has = remarks.find(r => r.department_id === dept.id || r.department === dept.name || r.department === dept.dept_type);
            if (has) highestIdx = idx;
          });
          if (highestIdx === departments.length - 1) {
            releaseSet.add(qr.id);
          }
        } catch {}
      }));
      setReadyForRelease(releaseSet);
    };
    checkRelease();
  }, [qrCodes, departments]);

  const registerQR = async (e) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(qrIdToRegister)) {
      setCreateMessage({ type: 'error', text: 'Invalid Tag: QR code must be an 8-digit number.' });
      return;
    }
    setRegistering(true);
    try {
      await apiClient.post('/qr', { id: qrIdToRegister, notes: qrNotes });
      setQrNotes('');
      setQrIdToRegister('');
      setShowRegisterScanner(false);
      fetchQRCodes(isPaginatedView ? currentPage : 1);
      setCreateMessage({ text: 'QR Created Successfully!', type: 'success' });
      setTimeout(() => setCreateMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      setCreateMessage({ text: err.response?.data?.detail || 'Failed to create QR', type: 'error' });
    } finally {
      setRegistering(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full">Active</span>;
      case 'inactive': return <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">Inactive</span>;
      default: return <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded-full">{status}</span>;
    }
  };

  const handleToggleTagStatus = async (tag) => {
    setTagActionLoading(true);
    setTagActionMessage({ text: '', type: '' });
    const newStatus = tag.status === 'active' ? 'inactive' : 'active';

    try {
      if (newStatus === 'active') {
        await apiClient.patch(`/qr/${tag.id}/enable`, { notes: activationNotes.trim() || undefined });
      } else {
        // Archive remarks to produced_items, then disable QR — all in one call
        await apiClient.patch(`/session/${tag.id}/close`, {});
      }
      setTagActionMessage({ text: `Tag successfully ${newStatus === 'active' ? 'activated' : 'released and archived'}!`, type: 'success' });
      fetchQRCodes(isPaginatedView ? currentPage : 1);
      setActivationNotes('');
      setTimeout(() => {
        setSelectedTag(null);
        setTagActionMessage({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      setTagActionMessage({ text: err.response?.data?.detail || 'Failed to update tag status.', type: 'error' });
    } finally {
      setTagActionLoading(false);
    }
  };

  const handleDeleteTag = (tagId) => {
    setTagActionMessage({ text: '', type: '' });
    setTagToDelete(tagId);
  };

  const confirmDeleteAction = async () => {
    if (!tagToDelete) return;
    
    setTagActionLoading(true);
    setTagActionMessage({ text: '', type: '' });
    
    try {
      await apiClient.delete(`/qr/${tagToDelete}`);
      setTagActionMessage({ text: 'Tag completely deleted!', type: 'success' });
      fetchQRCodes(isPaginatedView ? currentPage : 1);
      setTimeout(() => {
        setTagToDelete(null);
        setSelectedTag(null);
        setTagActionMessage({ text: '', type: '' });
        setManualDeleteId('');
      }, 2000);
    } catch (err) {
      setTagActionMessage({ text: err.response?.data?.detail || 'Failed to delete tag.', type: 'error' });
    } finally {
      setTagActionLoading(false);
    }
  };

  const [manualDeleteId, setManualDeleteId] = useState('');

  const handleManualDelete = (e) => {
    e.preventDefault();
    if (!manualDeleteId) return;
    setTagActionMessage({ text: '', type: '' });
    setTagToDelete(manualDeleteId);
  };

  if (loading) return <div className="text-center py-10 dark:text-white">Loading tags...</div>;

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6 relative z-10">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-500">⚠</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p> 
              {user?.role === 'admin' && (
                <p className="text-xs text-red-600 dark:text-red-300 mt-1">     
                    Database serialization crashed. A legacy tag (like a malformed string) might be trapping the list. Use inline delete to clear bad tags.     
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 pb-4 relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registered QR Tags</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage physical QR labels and their current sessions</p>
        </div>
        <button
          onClick={() => setShowScanner(!showScanner)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors shadow-md shadow-blue-500/20"
        >
          <Smartphone size={16} /> {showScanner ? "Close Camera" : "Scan to Find"}
        </button>
      </div>

      {showScanner && (
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700/50 relative z-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan QR to open management view</h3>
          </div>

          {scanMessage.text && (
            <div className={`p-3 mb-4 rounded text-sm text-center ${scanMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {scanMessage.text}
            </div>
          )}

          <div className="rounded-lg overflow-hidden border-2 border-blue-500 max-w-sm mx-auto bg-black">
            <Scanner 
              onScan={(result) => {
                if (result && result.length > 0) {
                  const scannedId = result[0].rawValue;
                  if (!/^\d{8}$/.test(scannedId)) {
                    setScanMessage({ text: 'Invalid Tag: QR code must be an 8-digit number.', type: 'error' });
                    return;
                  }
                  setShowScanner(false);
                  const found = qrCodes.find(q => q.id === scannedId);
                  
                  if (found) {
                    setSelectedTag(found);
                    setScanMessage({ text: '', type: '' });
                  } else {
                    setScanMessage({ text: 'Tag ID not found in system: ' + scannedId, type: 'error' });
                    setShowScanner(true); // Keep scanner open to try again
                    setTimeout(() => setScanMessage({ text: '', type: '' }), 5000);
                  }
                }
              }}
              onError={(err) => console.error(err)}
            />
          </div>
        </div>
      )}

      {/* Admin Only: Register New QR Tag inline */}
      {user?.role === 'admin' && (
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700/50 relative z-10">
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
          
          {createMessage.text && (
            <div className={`p-3 mb-4 rounded text-sm ${createMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {createMessage.text}
            </div>
          )}

          {showRegisterScanner && (
            <div className="mb-4 rounded-lg overflow-hidden border-2 border-green-500 max-w-sm mx-auto bg-black">
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const scannedId = result[0].rawValue;
                    if (!/^\d{8}$/.test(scannedId)) {
                      setCreateMessage({ type: 'error', text: 'Invalid Tag: QR code must be an 8-digit number.' });
                      setShowRegisterScanner(false);
                      return;
                    }
                    setQrIdToRegister(scannedId);
                    setShowRegisterScanner(false);
                    setCreateMessage({ type: '', text: '' });
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
                onChange={e=>setQrIdToRegister(e.target.value.replace(/\D/g, ''))} 
                maxLength={8}
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
              className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 h-10 w-full sm:w-auto shadow-md shadow-blue-500/20"
            >
              Register QR
            </button>
          </form>
        </div>
      )}

      {/* Tag Stats */}
      <div className="grid grid-cols-3 gap-4 relative z-10">
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-lg rounded-2xl p-4 border border-gray-200 dark:border-gray-700/50 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Total Tags</p>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-lg rounded-2xl p-4 border border-gray-200 dark:border-gray-700/50 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{(qrCodes || []).filter(q => q.status === 'active').length}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Active</p>
        </div>
        <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-lg rounded-2xl p-4 border border-gray-200 dark:border-gray-700/50 text-center">
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{(qrCodes || []).filter(q => q.status === 'inactive').length}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Inactive</p>
        </div>
      </div>

      {/* Tag Overview heading */}
      <div className="flex items-center justify-between relative z-10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tag Overview</h3>
        <Link
          to="/tags/all"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 text-sm"
        >
          View All Tags →
        </Link>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden relative z-10">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {qrCodes.length === 0 ? (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">{isOperator ? 'No active QR tags found.' : 'No QR codes registered.'}</li>
            ) : [...qrCodes].sort((a, b) => {
              // 1. Ready for release first
              const aRelease = readyForRelease.has(a.id) ? 0 : 1;
              const bRelease = readyForRelease.has(b.id) ? 0 : 1;
              if (aRelease !== bRelease) return aRelease - bRelease;
              // 2. Active before inactive
              const aActive = a.status === 'active' ? 0 : 1;
              const bActive = b.status === 'active' ? 0 : 1;
              if (aActive !== bActive) return aActive - bActive;
              // 3. Within same status: oldest first (by enabled_at for active, created_at for inactive)
              const aDate = a.status === 'active' ? (a.enabled_at || a.created_at || '') : (a.created_at || '');
              const bDate = b.status === 'active' ? (b.enabled_at || b.created_at || '') : (b.created_at || '');
              return new Date(aDate) - new Date(bDate);
            }).map((qr) => (
              <li key={qr.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <QrCode className="text-gray-500 dark:text-gray-400" size={24} />
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white break-all">{qr.id}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{qr.status === 'active' ? (qr.notes || 'No label') : 'Inactive tag'}</p>
                    <div className="mt-1">
                      {getStatusBadge(qr.status)}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {/* Delete button - admin only */}
                  {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(qr.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-md transition-colors"
                      >
                        <Trash size={16} />
                      </button>
                  )}
                  {/* Activate/Release button - admin and supervisor only, hidden for operators */}
                  {!isOperator && (
                    <button
                      onClick={() => setSelectedTag(qr)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        qr.status === 'active'
                          ? readyForRelease.has(qr.id)
                            ? 'text-white bg-purple-600 hover:bg-purple-700'
                            : 'text-white bg-red-600 hover:bg-red-700'
                          : 'text-white bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      <Activity size={16} /> {qr.status === 'active' ? 'Release Tag' : 'Activate Tag'}
                    </button>
                  )}
                  {/* History link - visible to all roles */}
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

      {/* Inline Tag Details / Status Overlay Model */}
      {selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tag Details</h3>
              <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-4">{selectedTag.id}</p>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4 border border-gray-100 dark:border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Status</p>
                    <div className="mt-1">{getStatusBadge(selectedTag.status)}</div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTag(selectedTag.id)}
                      disabled={tagActionLoading}
                      title="Delete Tag (Admin Only)"
                      className="text-red-500 hover:text-red-700 p-1 bg-red-50 dark:bg-red-900/30 rounded transition-colors"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>

                {selectedTag.status === 'active' && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes / Label</p>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedTag.notes || 'No label'}</p>
                  </div>
                )}

                {selectedTag.status !== 'active' && !isOperator && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QR Label / Notes</label>
                    <input
                      type="text"
                      value={activationNotes}
                      onChange={(e) => setActivationNotes(e.target.value)}
                      placeholder="Enter a label or description for this tag..."
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This label will be displayed on the tag after activation.</p>
                  </div>
                )}
              </div>

              {tagActionMessage.text && (
                <div className={`p-3 mb-4 rounded text-sm ${tagActionMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {tagActionMessage.text}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {/* Activate/Release in modal - hidden for operators */}
                {!isOperator && (!tagActionMessage.text || tagActionMessage.type === 'error') && !tagActionLoading && (
                  <button 
                    onClick={() => handleToggleTagStatus(selectedTag)}
                    disabled={tagActionLoading}
                    className={`flex-1 text-white rounded-md py-2 font-medium transition ${
                      selectedTag.status === 'active' 
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {selectedTag.status === 'active' ? 'Release Tag' : 'Activate Tag'}
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
                  onClick={() => { setSelectedTag(null); setTagActionMessage({ text: '', type: '' }); setActivationNotes(''); }}
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

      {/* Delete Confirmation Modal */}
      {tagToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden relative">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Deletion</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to completely delete QR tag <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{tagToDelete}</span>? This action is permanent.
              </p>
              
              {tagActionMessage.text && (
                <div className={`p-3 mb-4 rounded text-sm ${tagActionMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {tagActionMessage.text}
                </div>
              )}

              <div className="flex gap-3">
                {(!tagActionMessage.text || tagActionMessage.type === 'error') && !tagActionLoading && (
                  <button
                    onClick={confirmDeleteAction}
                    disabled={tagActionLoading}
                    className="flex-1 bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
                {(tagActionMessage.type === 'success' || tagActionLoading) && (
                  <button
                    disabled
                    className="flex-1 text-white rounded-md py-2 font-medium transition bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                  >
                    Processing...
                  </button>
                )}
                <button
                  onClick={() => { setTagToDelete(null); setTagActionMessage({ text: '', type: '' }); }}
                  disabled={tagActionLoading}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded-md font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

