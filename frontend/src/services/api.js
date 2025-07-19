import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Direct backend connection
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token management
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('📡 API Response:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data
    });
    return response.data;
  },
  (error) => {
    console.error('📡 API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Unauthorized - remove token and redirect to login
          removeToken();
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
          break;
          
        case 403:
          toast.error('Access denied. Insufficient permissions.');
          break;
          
        case 404:
          toast.error('Resource not found.');
          break;
          
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          toast.error(data?.message || 'An error occurred');
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  refreshToken: () => api.post('/auth/refresh-token'),
  
  // Notifications
  getNotifications: (params) => api.get('/auth/notifications', { params }),
  markNotificationRead: (id) => api.put(`/auth/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/auth/notifications/read-all'),
};

// Export/Import API
export const exportAPI = {
  exportExcel: (filters) => api.get('/export/feedback/excel', { params: filters }),
  exportPDF: (filters) => api.get('/export/feedback/pdf', { params: filters }),
  exportCSV: (filters) => api.get('/export/feedback/csv', { params: filters }),
  importFeedback: (formData) => api.post('/export/import/feedback', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadFile: (filename) => api.get(`/export/download/${filename}`, { responseType: 'blob' }),
  getImportTemplate: () => api.get('/export/templates/import', { responseType: 'blob' }),
  emailReport: (data) => api.post('/export/email/report', data)
};

// Attachments API
export const attachmentsAPI = {
  upload: (formData) => api.post('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  download: (filename) => api.get(`/attachments/${filename}`, { responseType: 'blob' }),
  cleanup: (days) => api.delete(`/attachments/cleanup?days=${days}`)
};

// Feedback API
export const feedbackAPI = {
  create: (data) => api.post('/feedback', data),
  getAll: (params) => api.get('/feedback', { params }),
  getById: (id) => api.get(`/feedback/${id}`),
  update: (id, data) => api.put(`/feedback/${id}`, data),
  delete: (id) => api.delete(`/feedback/${id}`),
  assign: (id, assignedTo) => api.post(`/feedback/${id}/assign`, { assignedTo }),
  
  // Dashboard and statistics
  getDashboardStats: () => api.get('/feedback/stats/dashboard'),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getAllAdmin: () => api.get('/categories/admin'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  restore: (id) => api.post(`/categories/${id}/restore`),
  reorder: (categoryOrders) => api.put('/categories/reorder', { categoryOrders }),
  getFeedbacks: (id, params) => api.get(`/categories/${id}/feedbacks`, { params }),
};

// User Management API (SuperAdmin only)
export const userAPI = {
  getAllUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  toggleUserActive: (id, isActive) => api.put(`/users/${id}/active`, { isActive }),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Utility functions
export const apiUtils = {
  setToken,
  getToken,
  removeToken,
  
  // File upload helper
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
  
  // Download helper
  download: async (url, filename) => {
    try {
      const response = await api.get(url, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response], { type: response.type });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error('Download failed');
      throw error;
    }
  },
  
  // Query string helpers
  buildQueryString: (params) => {
    const filtered = Object.entries(params).filter(([key, value]) => 
      value !== null && value !== undefined && value !== ''
    );
    return new URLSearchParams(filtered).toString();
  },
};

// Export default api instance for custom requests
export default api;
