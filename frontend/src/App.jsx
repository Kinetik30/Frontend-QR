import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LogOut, Sun, Moon } from 'lucide-react';

// Pages
import Login from './pages/Login';
import ScanPage from './pages/ScanPage';
import SupervisorScanner from './pages/SupervisorScanner';
import Dashboard from './pages/Dashboard';
import Tags from './pages/Tags';
import Users from './pages/Users';
import SessionManager from './pages/SessionManager';
import QRHistory from './pages/QRHistory';
import Profile from './pages/Profile';
import Departments from './pages/Departments';

// Role Enum matching backend logic
const ROLES = {
  operator: 1,
  supervisor: 2,
  admin: 3
};

const getRoleLevel = (roleStr) => {
  return ROLES[roleStr] || 0;
};

function ProtectedRoute({ children, minimumRole }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (getRoleLevel(user.role) < minimumRole) {
    // If not enough permissions, send to reasonable default
    return <Navigate to={user.role === 'operator' ? "/scan" : "/dashboard"} />;
  }
  
  return children;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navItemClass = (path) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive(path) ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
  }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-indigo-50/40 via-purple-50/40 to-emerald-50/40 dark:from-gray-900 dark:via-indigo-900/10 dark:to-gray-900 flex flex-col transition-colors duration-200">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow dark:border-b dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">QR Tracker</h1>
            <nav className="flex space-x-2">
              {getRoleLevel(user?.role) >= ROLES.supervisor && (
                <Link to="/dashboard" className={navItemClass('/dashboard')}>Dashboard</Link>
              )}
              {getRoleLevel(user?.role) >= ROLES.supervisor && (
                <Link to="/supervisor-scan" className={navItemClass('/supervisor-scan')}>Supervisor Scan</Link>
              )}
              {getRoleLevel(user?.role) >= ROLES.operator && (
                <Link to="/scan" className={navItemClass('/scan')}>Operator Scan</Link>
              )}
              {getRoleLevel(user?.role) >= ROLES.supervisor && (
                <Link to="/tags" className={navItemClass('/tags')}>QR Tags</Link>
              )}
              {getRoleLevel(user?.role) >= ROLES.supervisor && (
                <Link to="/departments" className={navItemClass('/departments')}>Department</Link>
              )}
              {getRoleLevel(user?.role) >= ROLES.admin && (
                <Link to="/users" className={navItemClass('/users')}>Users</Link>
              )}
              {user && (
                <Link to="/profile" className={navItemClass('/profile')}>Profile</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:block">
              {user?.name} ({user?.role === 'admin' ? 'Admin' : user?.role === 'supervisor' ? 'Supervisor' : 'Operator'})
            </span>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'operator' ? "/scan" : "/dashboard"} />} />
      
      {/* Root redirect maps logic so landing is always Dashboard for supervisors+ */}
      <Route path="/" element={<Navigate to={user ? (user.role === 'operator' ? "/scan" : "/dashboard") : "/login"} />} />

      {/* Operator + Routes */}
      <Route path="/profile" element={
        <ProtectedRoute minimumRole={ROLES.operator}>
          <Layout><Profile /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/scan" element={
        <ProtectedRoute minimumRole={ROLES.operator}>
          <Layout><ScanPage /></Layout>
        </ProtectedRoute>
      } />

      {/* Supervisor + Routes */}
      <Route path="/supervisor-scan" element={
        <ProtectedRoute minimumRole={ROLES.supervisor}>
          <Layout><SupervisorScanner /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute minimumRole={ROLES.supervisor}>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/tags" element={
        <ProtectedRoute minimumRole={ROLES.supervisor}>
          <Layout><Tags /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/departments" element={
        <ProtectedRoute minimumRole={ROLES.supervisor}>
          <Layout><Departments /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/qr/:qrId" element={
        <ProtectedRoute minimumRole={ROLES.supervisor}>
          <Layout><SessionManager /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/qr/:qrId/history" element={
        <ProtectedRoute minimumRole={ROLES.supervisor}>
          <Layout><QRHistory /></Layout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/users" element={
        <ProtectedRoute minimumRole={ROLES.admin}>
          <Layout><Users /></Layout>
        </ProtectedRoute>
      } />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
