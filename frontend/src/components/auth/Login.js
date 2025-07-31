import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import SessionConflictModal from '../SessionConflictModal';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [existingSession, setExistingSession] = useState(null);
  const [forceLoginLoading, setForceLoginLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use AuthContext login directly
      const result = await login(formData);
      
      if (result.success) {
        toast.success('Đăng nhập thành công!');
        
        // Navigate based on user role
        const userRole = result.user.role;
        if (userRole === 'customer') {
          navigate('/feedback');
        } else {
          navigate('/');
        }
      } else {
        console.log('🔍 Login failed:', result);
        setError(result.message || 'Đăng nhập thất bại');
        toast.error(result.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Check for session conflict in error response
      if (error.response?.status === 409 && error.response?.data?.conflict) {
        setExistingSession(error.response.data.existingSession);
        setShowSessionConflict(true);
        setLoading(false);
        return;
      }
      
      setError(error.response?.data?.message || 'Có lỗi xảy ra khi đăng nhập');
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setForceLoginLoading(true);
    setError('');

    try {
      const response = await authAPI.forceLogin(formData);
      
      if (response.success && response.data) {
        const { data } = response;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success('Đăng nhập thành công. Phiên cũ đã được đăng xuất.');
        setShowSessionConflict(false);
        
        // Force page reload to update authentication state
        window.location.href = data.user.role === 'customer' ? '/feedback' : '/dashboard';
      } else {
        setError(response.message || 'Force login thất bại');
      }
    } catch (error) {
      console.error('Force login error:', error);
      setError(error.response?.data?.message || 'Force login thất bại');
    } finally {
      setForceLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập tài khoản
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link
              to="/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              tạo tài khoản mới
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nhập email của bạn"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/create-super-admin"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Tạo tài khoản Super Admin
            </Link>
          </div>
        </form>
      </div>

      {/* Session Conflict Modal */}
      <SessionConflictModal
        isOpen={showSessionConflict}
        onClose={() => setShowSessionConflict(false)}
        onForceLogin={handleForceLogin}
        existingSession={existingSession}
        loading={forceLoginLoading}
      />
    </div>
  );
};

export default Login;
