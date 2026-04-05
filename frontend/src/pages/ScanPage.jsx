import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Camera, Send, CheckCircle, Smartphone, Info, AlertTriangle, ChevronRight } from 'lucide-react';
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

  const [sessionData, setSessionData] = useState(null);
  const [itemRemarks, setItemRemarks] = useState([]);
  const [originalData, setOriginalData] = useState(null);

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [departmentsToSkip, setDepartmentsToSkip] = useState([]);

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

  // Fetch session dynamically when qrId is valid
  useEffect(() => {
    if (!qrId || qrId.length < 8) {
      setSessionData(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/session/${qrId}`);
        setSessionData(res.data);
      } catch (err) {
        setSessionData(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [qrId]);

  // Filter remarks for the specific ITEM id
  useEffect(() => {
    if (sessionData && sessionData.remarks && itemId) {
      // Find all remarks for this specific item in this session
      const filtered = sessionData.remarks.filter(r => r.item_id === itemId);
      setItemRemarks(filtered);
    } else {
      setItemRemarks([]);
    }
  }, [sessionData, itemId]);

  // Handle auto-fill when department changes
  const handleDepartmentChange = (e) => {
    const selectedDeptId = e.target.value;
    setDepartment(selectedDeptId);

    if (!selectedDeptId) {
      setGeneralRemarks('');
      setErrorRemarks('');
      setOriginalData(null);
      return;
    }

    // Auto-fill if existing remark is found for this department
    const existingRemarksForDept = itemRemarks.filter(r => 
      r.department_id === selectedDeptId || r.department_id === parseInt(selectedDeptId, 10) || r.department === selectedDeptId
    );
    
    if (existingRemarksForDept.length > 0) {
      const latestRemark = existingRemarksForDept[existingRemarksForDept.length - 1];
      setGeneralRemarks(latestRemark.general_remarks || '');
      setErrorRemarks(latestRemark.issue_remarks || '');
      setOriginalData({
        id: latestRemark.id,
        history: latestRemark.remarks_history || [],
        general: latestRemark.general_remarks || '',
        error: latestRemark.issue_remarks || ''
      });
    } else {
      setGeneralRemarks('');
      setErrorRemarks('');
      setOriginalData(null);
    }
  };

  // Determine current pending department (first dept with no remarks)
  let firstPendingDeptId = null;
  let firstPendingDeptIndex = -1;
  if (departments.length > 0) {
    for (let i = 0; i < departments.length; i++) {
      const d = departments[i];
      const hasRemark = itemRemarks.some(r => r.department_id === d.id || r.department === d.name);
      if (!hasRemark) {
        firstPendingDeptId = d.id;
        firstPendingDeptIndex = i;
        break;
      }
    }
  }

  const isEditingExisting = originalData !== null;
  const isGeneralModified = isEditingExisting && generalRemarks !== originalData.general;
  const isErrorModified = isEditingExisting && errorRemarks !== originalData.error;
  const isModified = isGeneralModified || isErrorModified;

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

    try {
      // If NOT modified and trying to submit an already existing department
      if (isEditingExisting && !isModified) {
         setStatus({ type: 'error', message: 'No changes made. This specific department data is already logged for this item.' });
         return;
      }

      // Skip Department Logic
      const selectedDeptIndex = departments.findIndex(d => d.id === parseInt(department, 10) || d.id === department);
      
      if (!isEditingExisting && firstPendingDeptIndex !== -1 && selectedDeptIndex > firstPendingDeptIndex) {
          const skipped = departments.slice(firstPendingDeptIndex, selectedDeptIndex).filter(d => 
              !itemRemarks.some(r => r.department_id === d.id || r.department === d.name)
          );
          
          if (skipped.length > 0) {
              setDepartmentsToSkip(skipped);
              setShowSkipModal(true);
              return;
          }
      }
      
      await executeSubmit();
    } catch (err) {
        console.error(err);
    }
  };

  const executeSubmit = async (skippedArray = []) => {
    setStatus({ type: '', message: '' });
    setLoading(true);

    try {
        // Auto-log skipped departments if confirmed
        if (skippedArray.length > 0) {
            for (const skippedDept of skippedArray) {
                await apiClient.post(`/session/${qrId}/remarks`, {
                    department_id: skippedDept.id.toString(),
                    item_id: itemId,
                    general_remarks: 'Skipped',
                    issue_remarks: ''
                });
            }
        }

let finalGeneralRemarks = generalRemarks ? generalRemarks.trim() : '';
          let finalErrorRemarks = errorRemarks ? errorRemarks.trim() : '';

          if (!finalGeneralRemarks && !finalErrorRemarks) {
              finalGeneralRemarks = 'none';
          }

if (isEditingExisting && originalData?.id) {
                try {
                  await apiClient.put(`/session/${qrId}/remarks/${originalData.id}`, {
                      general_remarks: finalGeneralRemarks,
                      issue_remarks: finalErrorRemarks
                  });
                } catch (putErr) {
                  // Fallback: try PATCH if PUT returns 404/405
                  if (putErr.response?.status === 404 || putErr.response?.status === 405) {
                    await apiClient.patch(`/session/${qrId}/remarks/${originalData.id}`, {
                        general_remarks: finalGeneralRemarks,
                        issue_remarks: finalErrorRemarks
                    });
                  } else {
                    throw putErr;
                  }
                }
            } else {
                await apiClient.post(`/session/${qrId}/remarks`, {
                    department_id: department,
                    item_id: itemId,
                    general_remarks: finalGeneralRemarks,
                    issue_remarks: finalErrorRemarks
                });
            }
        
        setStatus({ type: 'success', message: skippedArray.length > 0 ? 'Scan and skipped departments logged successfully!' : 'Scan logged successfully!' });     

        setGeneralRemarks('');
        setErrorRemarks('');
        setDepartment('');
        setOriginalData(null);

        // re-fetch session to update data
        const res = await apiClient.get(`/session/${qrId}`);
        setSessionData(res.data);

    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to log scan. QR might not be active.'
      });
    } finally {
      setLoading(false);
      setShowSkipModal(false);
      setDepartmentsToSkip([]);
    }
  };

  const confirmSkip = async () => {
    await executeSubmit(departmentsToSkip);
  };

  return (
    <div className="relative max-w-xl mx-auto space-y-8 p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      
      {/* Skip Confirmation Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-amber-200 dark:border-amber-900/50 overflow-hidden">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border-b border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full shrink-0 flex items-center justify-center">
                        <AlertTriangle className="text-amber-600 dark:text-amber-500" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Skip Departments?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            You are moving directly to <strong>{departments.find(d => d.id === parseInt(department, 10) || d.id === department)?.name}</strong>. The following {departmentsToSkip.length} department(s) have not been logged yet and will manually be bypassed as "Skipped":
                        </p>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800 max-h-48 overflow-y-auto">
                    <ul className="space-y-2">
                        {departmentsToSkip.map((d, i) => (
                            <li key={d.id} className="flex flex-col">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <ChevronRight size={16} className="text-amber-500 shrink-0" />
                                    {d.sequence_order ?? i + 1}. {d.name || d.dept_type}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-4 flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <button
                        type="button"
                        onClick={() => {
                            setShowSkipModal(false);
                            setDepartmentsToSkip([]);
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirmSkip}
                        disabled={loading}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Logging...' : 'Confirm & Log Skip'}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 rounded-2xl p-6 space-y-6 border border-gray-200 dark:border-gray-700/50 relative z-10">
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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department / Station</label>
              {isEditingExisting && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                  <Info size={12} /> Viewing previous data
                </span>
              )}
            </div>
            
            <select
                value={department}
                onChange={handleDepartmentChange}
                className="mt-1 block w-full border border-gray-300 dark:border-blue-800/80 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-blue-50 dark:placeholder-gray-400 bg-white dark:bg-slate-800 sm:text-sm"
            >
              <option value="" className="bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200">Select a department...</option>
              {departments.map((d, index) => {
                const deptRemarks = itemRemarks.filter(r => r.department_id === d.id || r.department === d.name);
                const isCompleted = deptRemarks.length > 0;
                const hasError = deptRemarks.some(r => r.issue_remarks && r.issue_remarks.trim() !== '');
                const isCurrent = d.id === firstPendingDeptId;
                
                let optionClass = "bg-white dark:bg-[#2d3748] text-gray-900 dark:text-white font-medium py-1";
                let prefix = "";
                
                if (hasError) {
                  optionClass = "bg-red-50 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-medium py-1";
                  prefix = "⚠ ";
                } else if (isCompleted) {
                  optionClass = "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium py-1";
                  prefix = "✓ ";
                } else if (isCurrent) {
                  optionClass = "bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold py-1";
                  prefix = "▶ ";
                } else {
                  optionClass = "bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 py-1";
                }

                return (
                  <option
                    key={d.id}
                    value={d.id}
                    className={optionClass}
                  >
                    {prefix}{d.sequence_order ?? index + 1}. {d.name || d.dept_type}
                  </option>
                );
              })}
            </select>
          </div>

          {originalData?.history && originalData.history.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-gray-800/80 rounded-md border border-slate-200 dark:border-gray-700/50 mt-4">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-3">Previous Revisions</h4>
              <div className="space-y-3">
                {originalData.history.map((h, i) => (
                  <div key={i} className="text-xs text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 p-2.5 rounded shadow-sm border border-slate-100 dark:border-gray-600">
                    <div className="font-medium text-slate-800 dark:text-gray-200 mb-1.5 flex items-center justify-between gap-1">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Revision {i + 1}</span> 
                      <span className="text-slate-400 dark:text-gray-500 font-mono text-[10px]">{new Date(h.date || h.created_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                    </div>
                    <div className="space-y-1.5 mt-2 bg-slate-50 dark:bg-gray-800/50 p-2 rounded">
                      {h.general_remarks && h.general_remarks !== 'none' && <div><span className="font-semibold opacity-75">General:</span> {h.general_remarks}</div>}
                      {h.issue_remarks && <div><span className="font-semibold text-amber-600 dark:text-amber-500 opacity-75">Issue:</span> {h.issue_remarks}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">General Remarks</label>
              {isGeneralModified && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> Edited
                </span>
              )}
            </div>
            <textarea
              rows={2}
              placeholder="Any general observations?"
              value={generalRemarks}
              onChange={(e) => setGeneralRemarks(e.target.value)}
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-gray-700 sm:text-sm ${
                isGeneralModified ? 'border-amber-300 dark:border-amber-600/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Error Remarks</label>
              {isErrorModified && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> Edited
                </span>
              )}
            </div>
            <textarea
              rows={2}
              placeholder="Describe any issues or defects..."
              value={errorRemarks}
              onChange={(e) => setErrorRemarks(e.target.value)}
              className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 text-gray-900 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-gray-700 sm:text-sm ${
                isErrorModified ? 'border-amber-300 dark:border-amber-600/50 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !qrId || (isEditingExisting && !isModified)}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {loading ? 'Logging...' : (isEditingExisting ? (isModified ? 'Update Data (Edit Existing Remark)' : 'No Changes') : 'Log Scan')}
          </button>
        </form>
      </div>
    </div>
  );
}




