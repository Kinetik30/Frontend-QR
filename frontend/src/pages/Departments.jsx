import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Layers, Trash2, AlertTriangle } from 'lucide-react';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

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

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/departments/${id}`);
      setMessage({ text: 'Department deleted successfully!', type: 'success' });
      fetchDepartments();
    } catch (err) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to delete department.',
        type: 'error'
      });
    } finally {
      setDepartmentToDelete(null);
    }
  };

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
        status: 'active' // Backend expects 'active'
      });
      setMessage({ text: 'Department added successfully!', type: 'success' });
      setName('');
      setSequenceOrder('');
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
    <div className="relative max-w-6xl mx-auto space-y-8 p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Department Pipeline</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Configure your departments and their sequential order in the production lifecycle.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">

        {/* Create Department Form */}
        <div className="lg:col-span-1">
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
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
          <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center gap-2 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
              <Layers className="text-gray-500 w-5 h-5" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Configured Sequence</h3>
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">No departments found. Create one.</div>
            ) : (
              <ul className="divide-y divide-gray-200/50 dark:divide-gray-700/50 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm">
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
                      <button
                        onClick={() => setDepartmentToDelete(d)}
                        className="p-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-full transition-colors"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {departmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Department?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-200">"{departmentToDelete.name || departmentToDelete.dept_type}"</span>? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDepartmentToDelete(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(departmentToDelete.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
