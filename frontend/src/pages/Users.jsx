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
  const [role, setRole] = useState(1);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await apiClient.get('/users');
      setUsers(res.data || []);
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
    try {
      await apiClient.post('/users', {
        email, name, password, role: Number(role)
      });
      setEmail(''); setPassword(''); setName(''); setRole(1);
      fetchUsers();
      alert('User created successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (roleLevel) => {
    switch (roleLevel) {
      case 3: return <span className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-full">Admin</span>;
      case 2: return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">Supervisor</span>;
      case 1: return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">Operator</span>;
      default: return null;
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Level</label>
                <select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-purple-500 focus:border-purple-500">
                  <option value={1}>1 - Operator</option>
                  <option value={2}>2 - Supervisor</option>
                  <option value={3}>3 - Admin</option>
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
                    <li key={u.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                      <div>
                        {getRoleBadge(u.role)}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
