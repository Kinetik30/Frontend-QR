import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      // Trying the most likely standard URL endpoint
      await apiClient.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      setMessage({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to update password. Make sure your current password is correct.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto space-y-8 p-4 rounded-xl bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50/50 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-900">
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your personal account settings</p>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/30 rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 relative z-10">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
          <ShieldCheck className="text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
        </div>

        {message.text && (
          <div className={`p-3 mb-4 rounded text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address (Read-only)</label>
            <input type="text" disabled value={user?.email || ''} className="mt-1 block w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number (Read-only)</label>
            <input type="text" disabled value={user?.phone_number || ''} className="mt-1 block w-full border border-gray-200 dark:border-gray-700 rounded-md p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
            <input type="password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <input type="password" required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <input type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full px-4 py-2 mt-4 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
