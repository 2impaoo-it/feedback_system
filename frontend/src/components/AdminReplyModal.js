import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCornerUpLeft, FiX } from 'react-icons/fi';
import { feedbackAPI } from '../services/api';
import toast from 'react-hot-toast';

const AdminReplyModal = ({ 
  isOpen, 
  onClose, 
  feedback,
  onReplySuccess 
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [newStatus, setNewStatus] = useState(feedback?.status || 'received');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !feedback) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    setLoading(true);
    try {
      const response = await feedbackAPI.reply(feedback._id, {
        content: replyContent.trim(),
        status: newStatus
      });

      if (response.success) {
        toast.success('Phản hồi thành công');
        onReplySuccess?.(response.data);
        onClose();
        setReplyContent('');
      } else {
        toast.error(response.message || 'Lỗi khi gửi phản hồi');
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi gửi phản hồi');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return 'text-blue-600 bg-blue-50';
      case 'received':
        return 'text-yellow-600 bg-yellow-50';
      case 'resolved':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Phản hồi Feedback
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Gửi phản hồi cho khách hàng
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Feedback Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Thông tin Feedback
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 mb-1">
                    {feedback.title}
                  </h5>
                  <p className="text-sm text-gray-600">
                    Từ: {feedback.customerId?.firstName} {feedback.customerId?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(feedback.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                  {getStatusText(feedback.status)}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                {feedback.content}
              </div>
            </div>
          </div>

          {/* Existing Reply */}
          {feedback.adminReply?.content && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Phản hồi hiện tại
              </h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-gray-700 mb-2">
                  {feedback.adminReply.content}
                </div>
                <div className="text-xs text-gray-500">
                  Phản hồi bởi: {feedback.adminReply.repliedBy?.email} • {' '}
                  {new Date(feedback.adminReply.repliedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reply Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung phản hồi *
            </label>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Nhập nội dung phản hồi cho khách hàng..."
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {replyContent.length}/2000 ký tự
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cập nhật trạng thái
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="submitted">Đã gửi</option>
              <option value="received">Đã tiếp nhận</option>
              <option value="resolved">Đã xử lý</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !replyContent.trim()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang gửi...
                </>
              ) : (
                <>
                  <FiCornerUpLeft className="mr-2 h-4 w-4" />
                  Gửi phản hồi
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminReplyModal;
