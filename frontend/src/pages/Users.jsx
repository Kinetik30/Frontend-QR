import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { ShieldAlert, Users as UsersIcon, UserPlus } from 'lucide-react';       

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('operator');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [createMessage, setCreateMessage] = useState({ text: '', type: '' });   

  // Password reset inline box states
  const [resettingUser, setResettingUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState({ text: '', type: '' });

  // Delete user states
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState({ text: '', type: '' });     

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/users');
      let userData = res.data;
      if (!Array.isArray(userData)) {
        // Handle object wrapper fallback
        const key = Object.keys(userData || {}).find(k => Array.isArray(userData[k]));
        userData = key ? userData[key] : [];
      }
      setUsers(userData || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    // The backend now expects the integer role
    setCreateMessage({ text: '', type: '' });

    try {
      await apiClient.post('/users', {
        email,
        name,
        password,
        role_level: role,
        role: role,
        phone_number: phoneNumber
      });
      setEmail(''); setPassword(''); setName(''); setRole('operator'); setPhoneNumber('');
      fetchUsers();
      setCreateMessage({ text: 'User created successfully!', type: 'success' });
      setTimeout(() => setCreateMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      setCreateMessage({ text: err.response?.data?.detail || 'Failed to create user', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (roleLevel) => {
    let normalized = roleLevel;
    if (typeof normalized === 'number') {
      if (normalized === 3) normalized = 'admin';
      else if (normalized === 2) normalized = 'supervisor';
      else if (normalized === 1) normalized = 'operator';
      else normalized = 'operator';
    } else if (typeof normalized === 'string') {
      normalized = normalized.toLowerCase().trim();
      // If the backend returns '0' as a string for some reason
      if (normalized === '0' || normalized === '1' || normalized === '2' || normalized === '3') {
        if (normalized === '3') normalized = 'admin';
        else if (normalized === '2') normalized = 'supervisor';
        else if (normalized === '1') normalized = 'operator';
        else normalized = 'operator';
      }
    } else {
      normalized = 'operator';
    }

    switch (normalized) {
        case 'admin':
          return <span className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full">Admin</span>;
        case 'supervisor':
          return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">Supervisor</span>;
        case 'operator':
          return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">Operator</span>;  
        default: return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">Unknown</span>;
      }
    };

  const initiateReset = (u) => {
    setResettingUser(u);
    setResetPasswordValue('');
    setResetMessage({ text: '', type: '' });
  };

  const cancelReset = () => {
    setResettingUser(null);
    setResetPasswordValue('');
    setResetMessage({ text: '', type: '' });
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetMessage({ text: '', type: '' });

    if (resetPasswordValue.length < 6) {
      setResetMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setIsResetting(true);
    try {
      await apiClient.put(`/users/${resettingUser.id}/reset-password`, { new_password: resetPasswordValue });
      setResetMessage({ text: `Password for ${resettingUser.email} reset successfully!`, type: 'success' });
      setTimeout(() => {
         setResettingUser(null);
         setResetPasswordValue('');
         setResetMessage({ text: '', type: '' });
      }, 3000);
    } catch (err) {
      setResetMessage({ text: err.response?.data?.detail || 'Failed to reset password. Check backend endpoint.', type: 'error' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = (u) => {
    setUserToDelete(u);
    setDeleteMessage({ text: '', type: '' });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteMessage({ text: '', type: '' });
    setIsDeletingUser(true);

    try {
      await apiClient.delete(`/users/${userToDelete.id}`);
      fetchUsers();
      setDeleteMessage({ text: 'User successfully deleted.', type: 'success' });
      setTimeout(() => {
        setUserToDelete(null);
        setDeleteMessage({ text: '', type: '' });
        setIsDeletingUser(false);
      }, 2000);
    } catch (err) {
      setDeleteMessage({ text: err.response?.data?.detail || 'Failed to delete user.', type: 'error' });
      setIsDeletingUser(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Create and view system access roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Create User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-4">
              <UserPlus className="text-purple-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create User</h3>
            </div>

            {createMessage.text && (
              <div className={`p-3 mb-4 rounded text-sm ${createMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>        
                {createMessage.text}
              </div>
            )}

            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                <input type="text" required value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value)} placeholder="e.g. +1234567890" className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                <input type="password" required minLength="6" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Level</label>
                <select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500">
                  <option value="operator">Operator</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={creating} className="w-full px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <UsersIcon size={20} className="text-gray-500 dark:text-gray-400" /> Active Users directory
              </h3>
            </div>

            {loadingUsers ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading directory...</div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">    
                {users.length === 0 ? (
                  <li className="p-6 text-center text-gray-500 dark:text-gray-400">No users found.</li>
                ) : (
                  users.map(u => (
                    <li key={u.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex flex-col">
                      <div className="flex items-center justify-between">       
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                          </div>
                        <div className="flex items-center gap-4">
                            {getRoleBadge(u.role_level ?? u.roleLevel ?? u.role)}
                          <button
                            onClick={() => initiateReset(u)}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline font-medium"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:underline font-medium ml-2"      
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Inline Password Reset Form */}
                      {resettingUser?.id === u.id && (
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-600 animate-in fade-in slide-in-from-top-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Reset Password for <span className="font-bold">{u.name}</span>
                          </p>

                          {resetMessage.text && (
                            <div className={`p-2 mb-3 rounded text-xs ${resetMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {resetMessage.text}
                            </div>
                          )}

                          <form onSubmit={handleResetPasswordSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input
                              type="text"
                              required
                              minLength="6"
                              placeholder="New password (min 6 chars)"
                              value={resetPasswordValue}
                              onChange={(e) => setResetPasswordValue(e.target.value)}
                              className="flex-1 w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                            />
                            <div className="flex justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <button type="submit" disabled={isResetting} className="flex-1 sm:flex-none px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50">
                                {isResetting ? 'Saving...' : 'Save'}
                              </button>
                              <button type="button" onClick={cancelReset} disabled={isResetting} className="flex-1 sm:flex-none px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600">
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 fade-in animate-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="text-red-500 w-5 h-5" />
              Confirm Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Are you sure you want to completely delete user <span className="font-semibold text-gray-900 dark:text-white">{userToDelete.name}</span>? This action cannot be undone.
            </p>
            
            {deleteMessage.text && (
              <div className={`p-3 mb-4 rounded text-sm ${deleteMessage.type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'}`}>
                {deleteMessage.text}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setUserToDelete(null); setDeleteMessage({ text: '', type: '' }); }}
                disabled={isDeletingUser}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded font-medium transition-colors shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}