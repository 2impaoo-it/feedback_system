import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiCornerUpLeft, FiEye, FiUser, FiCalendar, FiMessageSquare } from 'react-icons/fi';
import { feedbackAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import AdminReplyModal from './AdminReplyModal';

const FeedbackList = ({ user }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get('view');
  
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });

  useEffect(() => {
    fetchFeedback();
  }, [filters, user, view]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      let params = { ...filters };
      
      console.log('Current user:', user);
      console.log('Current view:', view);
      
      // Determine what feedback to show based on user role and view parameter
      if (view === 'all' && (user.role === 'admin' || user.role === 'superAdmin')) {
        // Show all feedback for admin/superAdmin when view=all
        console.log('Fetching all feedback for admin');
        // Don't add userId filter
      } else if (user.role === 'customer') {
        // Customer always sees only their feedback
        const userId = user._id || user.id;
        params.userId = userId;
        console.log('Fetching customer feedback for userId:', userId);
      } else if (user.role === 'admin' || user.role === 'superAdmin') {
        // Admin/SuperAdmin without view=all param - show their own feedback
        const userId = user._id || user.id;
        params.userId = userId;
        console.log('Fetching admin own feedback for userId:', userId);
      }

      console.log('API params:', params);
      const response = await feedbackAPI.getAll(params);
      console.log('Feedback API response:', response);
      if (response.success) {
        console.log('Feedback data:', response.data);
        console.log('Feedbacks array:', response.data.feedbacks);
        setFeedback(response.data.feedbacks || []);
      } else {
        console.log('API error:', response.message);
        setError('Không thể tải phản hồi');
        setFeedback([]);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setError('Không thể tải phản hồi');
      setFeedback([]); // Ensure feedback is always an array
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const handleReplyClick = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setShowReplyModal(true);
  };

  const handleReplySuccess = (updatedFeedback) => {
    // Update the feedback in the list
    setFeedback(prev => 
      prev.map(item => 
        item._id === updatedFeedback._id ? updatedFeedback : item
      )
    );
    setShowReplyModal(false);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return priority;
    }
  };

  const getPageTitle = () => {
    if (user.role === 'customer') {
      return 'Phản hồi của tôi';
    } else if (view === 'all' && (user.role === 'admin' || user.role === 'superAdmin')) {
      return 'Tất cả phản hồi';
    } else {
      return 'Phản hồi của tôi';
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {getPageTitle()}
        </h1>
        {user.role === 'customer' && (
          <Link
            to="/feedback/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Phản hồi mới
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Tìm kiếm phản hồi..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="submitted">Đã gửi</option>
              <option value="received">Đã tiếp nhận</option>
              <option value="resolved">Đã xử lý</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức độ ưu tiên
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tất cả mức độ</option>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Tất cả danh mục</option>
              {/* Categories will be populated dynamically */}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {feedback.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {user.role === 'customer' 
              ? "You haven't submitted any feedback yet."
              : "No feedback found."
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mức độ ưu tiên
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Khách hàng
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(feedback) && feedback.length > 0 ? feedback.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.categoryId?.name || 'Chưa phân loại'}
                          </div>
                          {item.adminReply?.content && (
                            <div className="flex items-center mt-1">
                              <FiMessageSquare className="w-3 h-3 text-indigo-500 mr-1" />
                              <span className="text-xs text-indigo-600">Đã phản hồi</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(item.priority)}`}>
                        {getPriorityText(item.priority)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FiUser className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {item.customerId ? 
                              `${item.customerId.firstName} ${item.customerId.lastName}` : 
                              'Không xác định'
                            }
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <FiCalendar className="w-4 h-4 mr-2" />
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/feedback/${item._id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <FiEye className="w-4 h-4 mr-1" />
                          Xem
                        </Link>
                        
                        {isAdmin && (
                          <button
                            onClick={() => handleReplyClick(item)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <FiCornerUpLeft className="w-4 h-4 mr-1" />
                            {item.adminReply?.content ? 'Cập nhật' : 'Phản hồi'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isAdmin ? "6" : "5"} className="px-6 py-4 text-center text-gray-500">
                      {Array.isArray(feedback) ? 
                        (user.role === 'customer' 
                          ? "Bạn chưa gửi feedback nào."
                          : "Không tìm thấy feedback nào."
                        ) : 'Đang tải feedback...'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Reply Modal */}
      {isAdmin && selectedFeedback && (
        <AdminReplyModal
          isOpen={showReplyModal}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedFeedback(null);
          }}
          feedback={selectedFeedback}
          onReplySuccess={handleReplySuccess}
        />
      )}
    </div>
  );
};

export default FeedbackList;
