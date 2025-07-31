import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiUser, 
  FiCalendar, 
  FiMail,
  FiMessageSquare,
  FiCornerUpLeft,
  FiEdit3,
  FiClock,
  FiCheckCircle
} from 'react-icons/fi';
import { feedbackAPI } from '../services/api';
import AdminReplyModal from './AdminReplyModal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const FeedbackDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReplyModal, setShowReplyModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFeedback();
    }
  }, [id]);

  const fetchFeedback = async () => {
    try {
      const response = await feedbackAPI.getById(id);
      if (response.success) {
        setFeedback(response.data);
      } else {
        toast.error(response.message || 'Không thể tải feedback');
        navigate('/feedback');
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Lỗi khi tải feedback');
      navigate('/feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleReplySuccess = (updatedFeedback) => {
    setFeedback(updatedFeedback);
    toast.success('Đã gửi phản hồi thành công');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'received':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'resolved':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'submitted':
        return 'Đã gửi';
      case 'received':
        return 'Đã tiếp nhận';
      case 'resolved':
        return 'Đã xử lý';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <FiMail className="w-4 h-4" />;
      case 'received':
        return <FiClock className="w-4 h-4" />;
      case 'resolved':
        return <FiCheckCircle className="w-4 h-4" />;
      default:
        return <FiMessageSquare className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'general': 'bg-gray-100 text-gray-800',
      'complaint': 'bg-red-100 text-red-800',
      'suggestion': 'bg-green-100 text-green-800',
      'question': 'bg-blue-100 text-blue-800',
      'compliment': 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="page-container">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Không tìm thấy feedback</h2>
          <p className="text-gray-600 mt-2">Feedback không tồn tại hoặc đã bị xóa</p>
          <button
            onClick={() => navigate('/feedback')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/feedback')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <FiArrowLeft className="mr-1 h-4 w-4" />
            Quay lại danh sách feedback
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {feedback.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <FiCalendar className="mr-1 h-4 w-4" />
                  {new Date(feedback.createdAt).toLocaleString('vi-VN')}
                </div>
                <div className="flex items-center">
                  <FiUser className="mr-1 h-4 w-4" />
                  {feedback.customerId?.firstName} {feedback.customerId?.lastName}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(feedback.status)}`}>
                {getStatusIcon(feedback.status)}
                <span className="ml-2">{getStatusText(feedback.status)}</span>
              </span>
              
              {isAdmin && (
                <button
                  onClick={() => setShowReplyModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FiCornerUpLeft className="mr-2 h-4 w-4" />
                  {feedback.adminReply?.content ? 'Cập nhật phản hồi' : 'Phản hồi'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feedback Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feedback Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Nội dung Feedback
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {feedback.content}
                </p>
              </div>
            </div>

            {/* Admin Reply */}
            {feedback.adminReply?.content && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FiMessageSquare className="mr-2 h-5 w-5 text-indigo-600" />
                  Phản hồi từ Admin
                </h3>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="text-gray-700 leading-relaxed mb-3">
                    {feedback.adminReply.content}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <FiUser className="mr-1 h-4 w-4" />
                      {feedback.adminReply.repliedBy?.firstName} {feedback.adminReply.repliedBy?.lastName}
                    </div>
                    <div className="flex items-center">
                      <FiCalendar className="mr-1 h-4 w-4" />
                      {new Date(feedback.adminReply.repliedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status History */}
            {feedback.statusHistory && feedback.statusHistory.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Lịch sử trạng thái
                </h3>
                <div className="space-y-3">
                  {feedback.statusHistory.map((history, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 p-2 rounded-full ${getStatusColor(history.status).replace('border-', 'border ')}`}>
                        {getStatusIcon(history.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {getStatusText(history.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(history.changedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        {history.changedBy && (
                          <p className="text-xs text-gray-500">
                            Bởi: {history.changedBy.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Thông tin khách hàng
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <FiUser className="mr-3 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {feedback.customerId?.firstName} {feedback.customerId?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">Khách hàng</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiMail className="mr-3 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-900">
                      {feedback.customerId?.email}
                    </p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Chi tiết Feedback
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Danh mục
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(feedback.categoryId?.name)}`}>
                      {feedback.categoryId?.name || 'Chưa phân loại'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Ngày tạo
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(feedback.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                {feedback.updatedAt !== feedback.createdAt && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Cập nhật lần cuối
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(feedback.updatedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Admin Reply Modal */}
      {isAdmin && (
        <AdminReplyModal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          feedback={feedback}
          onReplySuccess={handleReplySuccess}
        />
      )}
    </div>
  );
};

export default FeedbackDetail;
