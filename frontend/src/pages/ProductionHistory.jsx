import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { Archive, Search, ChevronLeft, ChevronRight, Eye, Calendar, Clock, ArrowRight, X, AlertTriangle, QrCode, Activity } from 'lucide-react';

export default function ProductionHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // detail modal
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Assuming backend pagination expects 1-indexed pages
      const res = await apiClient.get('/produced-items', {
        params: { page, limit: 10, search: search || undefined }
      });
      
      const data = res.value || res.data || res;
      setItems(data.items || data.data || []);
      setTotalPages(data.pages || data.total_pages || 1);
    } catch (err) {
      if (err.response?.status === 404) {
        // endpoint might not be ready yet, set empty list
        setItems([]);
      } else {
        setError('Failed to fetch production history');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, search]);

  useEffect(() => {
    apiClient.get('/departments').then(res => {
      const depts = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setDepartments([...depts].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)));
    }).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  // Extract unique item IDs from remarks
  const getItemIds = (item) => {
    if (item.item_id) return item.item_id;
    const remarks = item.remarks_data || [];
    if (remarks.length > 0) {
      const ids = [...new Set(remarks.map(r => r.item_id).filter(Boolean))];
      return ids.join(', ') || 'N/A';
    }
    return 'N/A';
  };

  // Determine status based on department coverage
  const getItemStatus = (item) => {
    const remarks = item.remarks_data || [];
    if (remarks.length === 0) return { label: 'Activation', type: 'gray' };

    // Find the last department in sequence that has a remark
    let lastDeptName = null;
    let reachedFinalDept = false;

    if (departments.length > 0) {
      const finalDept = departments[departments.length - 1];
      const finalHasRemark = remarks.find(r =>
        String(r.department_id) === String(finalDept.id) || r.department === finalDept.name || r.department === finalDept.dept_type
      );
      if (finalHasRemark) reachedFinalDept = true;

      for (let i = departments.length - 1; i >= 0; i--) {
        const dept = departments[i];
        const hasRemark = remarks.find(r =>
          String(r.department_id) === String(dept.id) || r.department === dept.name || r.department === dept.dept_type
        );
        if (hasRemark) {
          lastDeptName = dept.name || dept.dept_type;
          break;
        }
      }
    }

    if (reachedFinalDept) return { label: 'Complete Pipeline', type: 'green' };

    if (!lastDeptName) {
      lastDeptName = remarks[remarks.length - 1]?.department || 'Activation';
    }
    return { label: lastDeptName, type: 'amber' };
  };

  const renderTrackerNode = (label, isCompleted, hasError, isRelease = false, isGray = false) => {
    let colorClasses = "bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-800/40 dark:border-gray-700 dark:text-gray-500";
    if (isGray) {
      // keep gray
    } else if (hasError) {
      colorClasses = "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400";
    } else if (isRelease) {
      colorClasses = "bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500/30 dark:text-purple-400";
    } else if (isCompleted) {
      colorClasses = "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400";
    }

    return (
      <div className={`flex items-center text-sm font-medium px-4 py-1.5 rounded-md border shadow-sm ${colorClasses}`}>
        {hasError && <AlertTriangle size={14} className="mr-1.5 inline" />}
        {label}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Archive className="text-blue-500" />
            Production History
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View archived production data for released QR tags. Admin view only.
          </p>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden relative z-10 flex flex-col min-h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/80">
          <form onSubmit={handleSearch} className="flex-1 w-full sm:max-w-md relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by QR ID or Item ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              {search && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="hidden">Search</button>
          </form>
        </div>

        {/* Table area */}
        <div className="flex-1 overflow-x-auto">
          {loading && !items.length ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading archives...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Archive className="text-gray-300 dark:text-gray-600 w-16 h-16 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No archived items found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tags will appear here after they are released.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">QR Tag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Released At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800/30 divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{getItemIds(item)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <QrCode size={16} className="text-blue-500" />
                        <span className="text-sm text-gray-900 dark:text-white font-mono">{item.qr_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(item.released_at || item.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const st = getItemStatus(item);
                        const badgeClasses = st.type === 'green'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : st.type === 'amber'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
                        return (
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${badgeClasses}`}>
                            {st.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                      >
                        <Eye size={16} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800/50">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages || 1}</span>
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Archive size={24} className="text-blue-500" />
                  Archived Production Run
                </h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">QR: {selectedItem.qr_id}</span>
                  <span>Item: <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{getItemIds(selectedItem)}</span></span>
                  <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(selectedItem.released_at || selectedItem.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors dark:text-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-8 bg-gray-50/30 dark:bg-transparent flex-1">
              {/* Timeline Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  Historical Pipeline
                </h3>
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2 no-scrollbar bg-white dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  {/* Activation - always completed for archived items */}
                  {renderTrackerNode('Activation', true, false)}
                  <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                  
                  {/* Show full department pipeline with completed/skipped state */}
                  {departments.length > 0 ? (
                    departments.map((dept, idx) => {
                      const remarks = selectedItem.remarks_data || [];
                      const deptRemark = remarks.find(r =>
                        String(r.department_id) === String(dept.id) || r.department === dept.name || r.department === dept.dept_type
                      );
                      const isCompleted = !!deptRemark;
                      const hasError = deptRemark?.issue_remarks && deptRemark.issue_remarks.trim() !== '';
                      return (
                        <React.Fragment key={dept.id || idx}>
                          {renderTrackerNode(dept.name || dept.dept_type, isCompleted, hasError, false, !isCompleted)}
                          <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        </React.Fragment>
                      );
                    })
                  ) : (
                    // Fallback: use remarks_data directly if no departments loaded
                    Array.isArray(selectedItem.remarks_data) && selectedItem.remarks_data.length > 0 ? (
                      selectedItem.remarks_data.map((remark, idx) => {
                        const hasErr = remark.issue_remarks && remark.issue_remarks.trim() !== '';
                        return (
                          <React.Fragment key={idx}>
                            {renderTrackerNode(remark.department || 'Production', true, hasErr)}
                            <ArrowRight size={14} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <span className="text-sm text-gray-500 italic mx-4">No department logs available</span>
                    )
                  )}
                  
                  {renderTrackerNode('Release', true, false, true)}
                </div>
              </div>

              {/* Detailed Remarks Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Department Logs</h3>
                <div className="space-y-4">
                  {Array.isArray(selectedItem.remarks_data) && selectedItem.remarks_data.length > 0 ? (
                    selectedItem.remarks_data.map((remark, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{remark.department}</h4>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Calendar size={12} /> {formatDate(remark.created_at)}
                            </span>
                          </div>
                          {remark.issue_remarks && remark.issue_remarks.trim() !== '' && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                              <AlertTriangle size={12} /> Issue Flagged
                            </span>
                          )}
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4 mt-4">
                          <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">General Remarks</p>
                            <p className="text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap">{remark.general_remarks || 'None'}</p>
                          </div>
                          
                          {(remark.issue_remarks && remark.issue_remarks.trim() !== '') && (
                            <div className="bg-red-50/50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Issue Remarks</p>
                              <p className="text-sm text-red-900 dark:text-red-200 whitespace-pre-wrap">{remark.issue_remarks}</p>
                            </div>
                          )}
                        </div>

                        {remark.remarks_history && remark.remarks_history.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <details className="group">
                              <summary className="text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer flex items-center gap-1">
                                View Previous Revisions ({remark.remarks_history.length})
                              </summary>
                              <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                {remark.remarks_history.map((hist, hIdx) => (
                                  <div key={hIdx} className="text-xs">
                                    <span className="text-gray-500">{formatDate(hist.date)}: </span>
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {hist.general_remarks || 'None'} {hist.issue_remarks ? ` | Error: ${hist.issue_remarks}` : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">No detailed logs available for this production run.</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
