import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add JWT header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: Global error interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==========================================
// MOCK BACKEND DATA FOR UI DESIGN REVIEW
// ==========================================
const IS_DEMO_MODE = true; // Set to false when you connect a real backend

if (IS_DEMO_MODE) {
  let mockUserEmail = localStorage.getItem('mockEmail') || 'admin@demo.com';

  apiClient.post = async (url, data) => {
    console.log(`[MOCK POST] ${url}`);
    if (url === '/auth/login') {
      const email = data?.get ? data.get('username') : (data?.username || data?.email || 'admin@demo.com');
      localStorage.setItem('mockEmail', email);
      mockUserEmail = email;
      return { data: { access_token: `mock-jwt-${mockUserEmail}` } };
    }
    if (url === '/qr') return { data: { id: data?.id || `new-qr-${Date.now()}`, notes: data?.notes } };
    if (url === '/users') return { data: { email: data?.email } };
    return { data: { success: true } };
  };

  apiClient.get = async (url) => {
    console.log(`[MOCK GET] ${url}`);
    if (url === '/users/me') {
      if (mockUserEmail.includes('supervisor')) return { data: { id: '2', name: 'John Supervisor', role: 2, email: 'supervisor@demo.com' } };
      if (mockUserEmail.includes('operator')) return { data: { id: '3', name: 'Alice Operator', role: 1, email: 'operator@demo.com' } };
      // Default to Admin
      return { data: { id: '1', name: 'Demo Design Admin', role: 3, email: 'admin@demo.com' } };
    }
    
    if (url === '/qr') return { data: [
      { id: '123e4567-e89b-12d3-a456-426614174000', notes: 'Assembly Line A - Station 1', status: 'active' },
      { id: '987e6543-e21b-34d3-b456-426614174999', notes: 'Packaging Area - Station 3', status: 'inactive' },
      { id: '555e4567-e89b-12d3-a456-426614174555', notes: 'Defect Review - Station 2', status: 'inactive' }
    ] };

    if (url === '/users') {
      if (mockUserEmail.includes('admin')) {
        return { data: [
          { id: '1', name: 'Demo Design Admin', role: 3, email: 'admin@demo.com' },
          { id: '2', name: 'John Supervisor', role: 2, email: 'supervisor@demo.com' },
          { id: '3', name: 'Alice Operator', role: 1, email: 'operator@demo.com' }
        ] };
      } else {
        return { data: [] }; // Prevent supervisors from seeing users
      }
    }

    if (url === '/sessions') return { data: [
      { id: 'sess-active-99', qr_id: '123e4567-e89b-12d3-a456-426614174000', batch_number: 'BATCH-NOW-01', product_name: 'Widget Current', status: 'active', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 'sess-active-100', qr_id: '987e6543-e21b-34d3-b456-426614174999', batch_number: 'BATCH-NOW-02', product_name: 'Widget Alpha', status: 'active', created_at: new Date(Date.now() - 7200000).toISOString() }
    ] };

    if (url.includes('/history')) return { data: [
      { 
        id: 'sess-001', 
        status: 'closed', 
        batch_number: 'BATCH-2026-X', 
        product_name: 'Widget Alpha', 
        created_at: new Date(Date.now() - 86400000).toISOString(), 
        scans: [ 
          { id: 'scan-1', department: 'Assembly', notes: 'Initial assembly started', scanned_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'scan-2', department: 'QC', notes: 'Passed all checks', scanned_at: new Date(Date.now() - 82400000).toISOString() }
        ] 
      }
    ] };

    if (url.includes('/qr/')) return { data: { 
      qr: { id: '123e4567-e89b-12d3-a456-426614174000', status: 'active', notes: 'Assembly Line A - Station 1' }, 
      active_session: { id: 'sess-active-99', batch_number: 'BATCH-NOW-01', product_name: 'Widget Current' } 
    } };

    return { data: {} };
  };

  apiClient.patch = async (url) => {
    console.log(`[MOCK PATCH] ${url}`);
    return { data: { success: true } };
  };
}

export default apiClient;
