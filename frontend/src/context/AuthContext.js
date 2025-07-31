import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 AuthContext - Checking auth status, token:', token ? 'exists' : 'none');
      
      if (token) {
        console.log('🔍 AuthContext - Calling getProfile()');
        const response = await authAPI.getProfile();
        console.log('🔍 AuthContext - getProfile response:', response);
        
        if (response.success) {
          setUser(response.data.user);
          setCustomer(response.data.customer);
          setIsAuthenticated(true);
          console.log('🔍 AuthContext - User authenticated:', response.data.user);
          console.log('🔍 AuthContext - Customer data:', response.data.customer);
          // Connect to socket with authentication
          socketService.connect(token);
        } else {
          console.log('🔍 AuthContext - getProfile failed, logging out');
          logout();
        }
      } else {
        console.log('🔍 AuthContext - No token found');
      }
    } catch (error) {
      console.error('🔍 AuthContext - Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      if (response.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem('token', token);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Connect to socket with authentication
        socketService.connect(token);
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng nhập thất bại' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.success) {
        return { success: true, message: 'Đăng ký thành công' };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng ký thất bại' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCustomer(null);
    setIsAuthenticated(false);
    socketService.disconnect();
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    customer,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
