import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Layers, Plus, Edit2, CheckCircle, XCircle } from 'lucide-react';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/departments');
      // Sort by sequence_order if available, otherwise by name
      const fetched = res.data?.items || res.data || [];
      const sorted = [...fetched].sort((a, b) => 
        (a.sequence_order || 0) - (b.sequence_order || 0)
      );
      setDepartments(sorted);
    } catch (err) {
      setMessage({ text: 'Failed to fetch departments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const seqOrderVal = Number(sequenceOrder) || 0;
    if (departments.some(d => d.sequence_order === seqOrderVal)) {
      setMessage({ text: `Sequence Order ${seqOrderVal} is already in use. Please choose a unique value.`, type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      await apiClient.post('/departments', {
        name: name.trim(),
        sequence_order: seqOrderVal,
        status: status.toLowerCase() // Backend expects 'active' or 'inactive'
      });
      setMessage({ text: 'Department added successfully!', type: 'success' });
      setName('');
      setSequenceOrder('');
      setStatus('ACTIVE');
      fetchDepartments();
    } catch (err) {
      setMessage({ 
        text: err.response?.data?.detail || 'Failed to create department. Does backend support "name" and "sequence_order" yet?', 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Department Pipeline</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Configure your departments and their sequential order in the production lifecycle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Department Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-4">
              <Plus className="text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">New Department</h3>
            </div>

            {message.text && (
              <div className={`p-3 mb-4 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Paint Shop"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sequence Order (Step #)</label>
                <input
                  type="number"
                  required
                  value={sequenceOrder}
                  onChange={e => setSequenceOrder(e.target.value)}
                  placeholder="e.g. 1"
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 sm:text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Dictates the order it appears in the Active Session timeline.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 sm:text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Department'}
              </button>
            </form>
          </div>
        </div>

        {/* List of Departments */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <Layers className="text-gray-500 w-5 h-5" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configured Sequence</h3>
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">No departments found. Create one.</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {departments.map((d, index) => (
                  <li key={d.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold font-mono">
                        {d.sequence_order ?? index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{d.name || d.dept_type}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">{d.id}</p>
                      </div>
                    </div>
                    
                    <div>
                      {d.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}