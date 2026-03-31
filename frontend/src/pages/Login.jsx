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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <LogIn size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900">QR Tracker</h2>
          <p className="text-sm text-gray-500">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        <div className="bg-gray-100 p-3 rounded-md text-xs text-center border border-gray-200">
          <p className="font-semibold text-gray-600 mb-2">Demo Credentials (click to fill)</p>
          <div className="flex justify-center space-x-2">
            <button type="button" onClick={() => {setEmail('supervisor@demo.com'); setPassword('demo123');}} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">Supervisor</button>
            <button type="button" onClick={() => {setEmail('admin@demo.com'); setPassword('demo123');}} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">Admin</button>
            <button type="button" onClick={() => {setEmail('operator@demo.com'); setPassword('demo123');}} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50">Operator</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded focus:ring-blue-500 focus:border-blue-500 border-gray-300 text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border rounded focus:ring-blue-500 focus:border-blue-500 border-gray-300 text-gray-900 bg-white"
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
