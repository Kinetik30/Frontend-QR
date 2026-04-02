import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure role is a string
  const normalizeData = (data) => {
    if (!data) return data;
    let normalizedRole = data.role_level ?? data.role ?? 'operator';
    if (typeof normalizedRole === 'number') {
      if (normalizedRole === 3) normalizedRole = 'admin';
      else if (normalizedRole === 2) normalizedRole = 'supervisor';
      else normalizedRole = 'operator';
    } else {
      normalizedRole = String(normalizedRole).toLowerCase();
    }
    return { ...data, role: normalizedRole, role_level: normalizedRole };
  };

  // Load state from localStorage on init
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(normalizeData(JSON.parse(savedUser)));
    }
    setLoading(false);
  }, []);

  // Simulate or actual login
  const login = async (email, password) => {
    try {
      // The backend expects a UserLoginRequest JSON object
      const payload = {
        email: email,
        password: password
      };

      // Changed to the expected /users/login path as defined by backend
      const response = await apiClient.post('/users/login', payload);

      const { access_token, user: userData } = response.data;
      
      // Store token
      setToken(access_token);
      if (access_token) {
        localStorage.setItem('token', access_token);
      }

      // Backend returns the user object directly in the login response
      if (userData) {
          const normalizedUser = normalizeData(userData);
          setUser(normalizedUser);
          localStorage.setItem('user', JSON.stringify(normalizedUser));
      }
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Login failed. Please check credentials.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
