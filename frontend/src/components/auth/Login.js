import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import SessionConflictModal from '../SessionConflictModal';
import toast from 'react-hot-toast';

const Login = ({ onLogin }) => {
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
    console.log('Login attempt with:', formData);

    try {
      const response = await authAPI.login(formData);
      console.log('Login response:', response);
      
      // Check for session conflict
      if (response.status === 409 && response.conflict) {
        setExistingSession(response.existingSession);
        setShowSessionConflict(true);
        setLoading(false);
        return;
      }
      
      // Due to api.js interceptor, response is already unwrapped
      if (response.success && response.data) {
        console.log('Login successful, storing token and user data');
        const { data } = response;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Show success message if old session was terminated
        if (response.sessionInfo?.oldSessionTerminated) {
          toast.success('Đăng nhập thành công. Phiên cũ đã được đăng xuất.');
        } else {
          toast.success('Đăng nhập thành công');
        }
        
        console.log('About to redirect to root');
        window.location.href = '/';
        return;
      } else {
        console.log('Login failed - success is false or no data');
        setError(response.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      
      // Check for session conflict in error response
      if (error.response?.status === 409 && error.response?.data?.conflict) {
        setExistingSession(error.response.data.existingSession);
        setShowSessionConflict(true);
        return;
      }
      
      setError(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    setForceLoginLoading(true);
    setError('');

    try {
      const response = await authAPI.forceLogin(formData);
      console.log('Force login response:', response);
      
      if (response.success && response.data) {
        const { data } = response;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success('Đăng nhập thành công. Phiên cũ đã được đăng xuất.');
        setShowSessionConflict(false);
        
        window.location.href = '/';
        return;
      } else {
        setError(response.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Force login error:', error);
      setError(error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setForceLoginLoading(false);
    }
  };

  const handleCloseSessionConflict = () => {
    setShowSessionConflict(false);
    setExistingSession(null);
  };

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Đăng nhập Hệ thống Phản hồi</h2>
            <p>Nhập thông tin đăng nhập để truy cập tài khoản</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Nhập email của bạn"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Chưa có tài khoản? 
              <Link to="/register" className="auth-link">
                Đăng ký tại đây
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Session Conflict Modal */}
      <SessionConflictModal
        isOpen={showSessionConflict}
        onClose={handleCloseSessionConflict}
        onForceLogin={handleForceLogin}
        existingSession={existingSession}
        loading={forceLoginLoading}
      />
    </>
  );
};

export default Login;
