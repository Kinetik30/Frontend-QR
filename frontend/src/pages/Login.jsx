import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      // Refresh to let App.jsx routing handle role-based redirect, or manually handle here
      window.location.href = '/'; 
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-indigo-50/40 via-purple-50/40 to-emerald-50/40 dark:from-gray-900 dark:via-indigo-900/10 dark:to-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl rounded-2xl border border-white/50 dark:border-gray-700/50">
        <div className="flex flex-col items-center justify-center space-y-2">   
          <div className="p-3 bg-blue-100/50 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-300">
            <LogIn size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">QR Tracker</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded focus:ring-blue-500 focus:border-blue-500 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
