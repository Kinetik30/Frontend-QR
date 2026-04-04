import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { QrCode, Activity, Clock, Trash, ArrowLeft, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const PAGE_SIZE = 20;

export default function AllTags() {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  // Tag action modal states
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagActionLoading, setTagActionLoading] = useState(false);
  const [tagActionMessage, setTagActionMessage] = useState({ text: '', type: '' });
  const [tagToDelete, setTagToDelete] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [readyForRelease, setReadyForRelease] = useState(new Set());

  const fetchQRCodes = async (page = 1, filter = statusFilter) => {
    try {
      setLoading(true);
      let url = `/qr?page=${page}&page_size=${PAGE_SIZE}`;
      if (filter && filter !== 'all') {
        url += `&status=${filter}`;
      }
      const res = await apiClient.get(url);
      console.log('[AllTags] API response:', url, res.data);

      let qrData = [];
      if (res.data?.items) {
        qrData = res.data.items;
      } else {
        qrData = Array.isArray(res.data) ? res.data : [];
        const key = Object.keys(res.data || {}).find(k => Array.isArray(res.data[k]));
        if (key && !Array.isArray(res.data)) qrData = res.data[key];
      }

      // Always apply client-side filter (backend may not support it)
      if (filter && filter !== 'all') {
        qrData = qrData.filter(q => q.status === filter);
      }

      // Use backend pagination info if available, otherwise compute
      if (res.data?.total_pages && filter === 'all') {
        setTotalPages(res.data.total_pages || 1);
        setTotalItems(res.data.total || 0);
      } else {
        setTotalPages(Math.ceil(qrData.length / PAGE_SIZE) || 1);
        setTotalItems(qrData.length);
      }

      setQrCodes(qrData || []);
      setCurrentPage(page);
    } catch (err) {
      console.error('[AllTags] Fetch error:', err?.response?.status, err?.response?.data || err.message);
      setQrCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes(1, statusFilter);
    apiClient.get('/departments').then(res => {
      const depts = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setDepartments([...depts].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)));
    }).catch(() => {});
  }, [statusFilter]);

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
          if (highestIdx === departments.length - 1) releaseSet.add(qr.id);
        } catch {}
      }));
      setReadyForRelease(releaseSet);
    };
    checkRelease();
  }, [qrCodes, departments]);

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
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
        await apiClient.patch(`/qr/${tag.id}/enable`, {});
      } else {
        await apiClient.patch(`/qr/${tag.id}/disable`, {});
      }
      setTagActionMessage({ text: `Tag successfully marked as ${newStatus}!`, type: 'success' });
      fetchQRCodes(currentPage, statusFilter);
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
      fetchQRCodes(currentPage, statusFilter);
      setTimeout(() => {
        setTagToDelete(null);
        setSelectedTag(null);
        setTagActionMessage({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      setTagActionMessage({ text: err.response?.data?.detail || 'Failed to delete tag.', type: 'error' });
      setTagActionLoading(false);
    }
  };

  // Dynamic page number generation
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchQRCodes(page, statusFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterBtnClass = (filter) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
      statusFilter === filter
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
        : 'bg-white/60 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/60'
    }`;

  return (
    <div className="relative space-y-6 max-w-5xl mx-auto p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 pb-4 relative z-10">
        <div>
          <Link to="/tags" className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 mb-2">
            <ArrowLeft size={16} className="mr-1" /> Back to QR Tags
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All QR Tags</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{totalItems} tags total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 relative z-10">
        <Filter size={16} className="text-gray-500 dark:text-gray-400" />
        <button onClick={() => handleFilterChange('all')} className={filterBtnClass('all')}>All</button>
        <button onClick={() => handleFilterChange('active')} className={filterBtnClass('active')}>Active</button>
        <button onClick={() => handleFilterChange('inactive')} className={filterBtnClass('inactive')}>Inactive</button>
      </div>

      {/* Tag List */}
      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden relative z-10">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">Loading tags...</li>
          ) : qrCodes.length === 0 ? (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">No QR codes found for this filter.</li>
          ) : [...qrCodes].sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1)).map((qr) => (
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
                  {user?.role === 'admin' && (
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

        {/* Pagination Controls */}
        {totalPages > 1 && !loading && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages} · {totalItems} tags
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 dark:text-gray-500 text-sm select-none">…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tag Details / Status Modal — identical to Tags.jsx */}
      {selectedTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tag Details</h3>
              <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mb-4">{selectedTag.id}</p>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4 border border-gray-100 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes / Label</p>
                <div className="flex justify-between items-start mb-3">
                  <p className="text-gray-900 dark:text-white">{selectedTag.notes || 'No description'}</p>
                  {user?.role === 'admin' && (
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
                
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Status</p>
                <div className="mt-1">{getStatusBadge(selectedTag.status)}</div>
              </div>

              {tagActionMessage.text && (
                <div className={`p-3 mb-4 rounded text-sm ${tagActionMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {tagActionMessage.text}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {(!tagActionMessage.text || tagActionMessage.type === 'error') && !tagActionLoading && (
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
                  onClick={() => { setSelectedTag(null); setTagActionMessage({ text: '', type: '' }); }}
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
