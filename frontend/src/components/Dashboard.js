import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { feedbackAPI } from '../services/api';
import socketService from '../services/socket';
import LoadingSpinner from './LoadingSpinner';
import { 
  FiMessageSquare, 
  FiClock, 
  FiCheckCircle, 
  FiAlertTriangle,
  FiTrendingUp,
  FiUsers,
  FiStar
} from 'react-icons/fi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeStats, setRealtimeStats] = useState({
    connectedUsers: 0,
    authenticatedUsers: 0,
    usersByRole: {
      admin: 0,
      moderator: 0,
      customer: 0,
      guest: 0
    },
    onlineUsers: [],
    todayFeedbacks: 0
  });

  useEffect(() => {
    loadDashboardStats();
    setupRealtimeListeners();

    return () => {
      cleanupRealtimeListeners();
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await feedbackAPI.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    socketService.on('newFeedback', handleNewFeedback);
    socketService.on('feedbackUpdated', handleFeedbackUpdate);
    socketService.on('connection_stats', handleConnectionStats);
  };

  const cleanupRealtimeListeners = () => {
    socketService.off('newFeedback', handleNewFeedback);
    socketService.off('feedbackUpdated', handleFeedbackUpdate);
    socketService.off('connection_stats', handleConnectionStats);
  };

  const handleNewFeedback = (data) => {
    // Update stats when new feedback arrives
    setStats(prev => prev ? {
      ...prev,
      totals: {
        ...prev.totals,
        feedbacks: prev.totals.feedbacks + 1,
        open: prev.totals.open + 1
      }
    } : null);
  };

  const handleFeedbackUpdate = (data) => {
    // Refresh stats when feedback is updated
    loadDashboardStats();
  };

  const handleConnectionStats = (data) => {
    setRealtimeStats(prev => ({
      ...prev,
      connectedUsers: data.connectedUsers || 0,
      authenticatedUsers: data.authenticatedUsers || 0,
      usersByRole: data.usersByRole || {
        admin: 0,
        moderator: 0,
        customer: 0,
        guest: 0
      },
      onlineUsers: data.onlineUsers || []
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
        <button 
          onClick={loadDashboardStats}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Feedbacks',
      value: stats.totals.feedbacks,
      icon: FiMessageSquare,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Open',
      value: stats.totals.open,
      icon: FiClock,
      color: 'yellow',
      change: '+5%'
    },
    {
      title: 'In Progress',
      value: stats.totals.inProgress,
      icon: FiTrendingUp,
      color: 'orange',
      change: '+8%'
    },
    {
      title: 'Resolved',
      value: stats.totals.resolved,
      icon: FiCheckCircle,
      color: 'green',
      change: '+15%'
    },
    {
      title: 'Urgent',
      value: stats.totals.urgent,
      icon: FiAlertTriangle,
      color: 'red',
      change: '-3%'
    },
    {
      title: 'Avg Rating',
      value: stats.averageRating.toFixed(1),
      icon: FiStar,
      color: 'purple',
      change: '+0.2'
    }
  ];

  // Chart configurations
  const sentimentChartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: stats.sentimentDistribution.map(item => item.count),
        backgroundColor: [
          '#10B981',
          '#6B7280', 
          '#EF4444'
        ],
        borderColor: [
          '#059669',
          '#4B5563',
          '#DC2626'
        ],
        borderWidth: 2
      }
    ]
  };

  const categoryChartData = {
    labels: stats.categoryDistribution.map(item => item._id),
    datasets: [
      {
        label: 'Feedbacks',
        data: stats.categoryDistribution.map(item => item.count),
        backgroundColor: stats.categoryDistribution.map(item => item.color || '#3B82F6'),
        borderColor: stats.categoryDistribution.map(item => item.color || '#2563EB'),
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600 mt-1">
            Xin chào {user.email}! Đây là tổng quan hệ thống phản hồi của bạn.
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">
                {realtimeStats.authenticatedUsers} người dùng đã đăng nhập
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">
                {realtimeStats.connectedUsers} kết nối tổng
              </span>
            </div>
          </div>
          <button
            onClick={loadDashboardStats}
            className="btn-outline btn-sm"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="card card-body"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className={`text-xs ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change} from last week
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Online Users Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiUsers className="w-5 h-5 mr-2" />
            Thống kê người dùng trực tuyến
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {realtimeStats.authenticatedUsers}
              </div>
              <div className="text-sm text-green-700">Đã đăng nhập</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {realtimeStats.usersByRole.admin}
              </div>
              <div className="text-sm text-blue-700">Quản trị viên</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {realtimeStats.usersByRole.moderator}
              </div>
              <div className="text-sm text-purple-700">Điều hành viên</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {realtimeStats.usersByRole.customer}
              </div>
              <div className="text-sm text-orange-700">Khách hàng</div>
            </div>
          </div>
          
          {realtimeStats.onlineUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Người dùng đang trực tuyến ({realtimeStats.onlineUsers.length})
              </h4>
              <div className="max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {realtimeStats.onlineUsers.map((onlineUser, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {onlineUser.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            Vai trò: {onlineUser.role === 'admin' ? 'Quản trị viên' : 
                                     onlineUser.role === 'moderator' ? 'Điều hành viên' : 
                                     onlineUser.role === 'customer' ? 'Khách hàng' : onlineUser.role}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(onlineUser.connectedAt).toLocaleTimeString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {realtimeStats.onlineUsers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              Hiện tại không có người dùng nào đang trực tuyến
            </div>
          )}
        </div>
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Sentiment Distribution
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Doughnut data={sentimentChartData} options={chartOptions} />
            </div>
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">
              Feedback by Category
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Bar data={categoryChartData} options={chartOptions} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Feedbacks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Feedbacks
          </h3>
        </div>
        <div className="card-body">
          {stats.recentFeedbacks.length > 0 ? (
            <div className="space-y-4">
              {stats.recentFeedbacks.map((feedback, index) => (
                <motion.div
                  key={feedback._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {feedback.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      by {feedback.customerId?.firstName} {feedback.customerId?.lastName}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: feedback.categoryId?.color + '20',
                          color: feedback.categoryId?.color 
                        }}
                      >
                        {feedback.categoryId?.name}
                      </span>
                      <span className={`badge ${
                        feedback.sentiment === 'positive' ? 'badge-success' :
                        feedback.sentiment === 'negative' ? 'badge-danger' :
                        'badge-gray'
                      }`}>
                        {feedback.sentiment}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FiMessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent feedbacks</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card card-body text-center">
          <FiUsers className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Manage Users
          </h3>
          <p className="text-gray-600 mb-4">
            Add or manage system users
          </p>
          <button className="btn-primary">
            Manage Users
          </button>
        </div>

        <div className="card card-body text-center">
          <FiMessageSquare className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            View All Feedbacks
          </h3>
          <p className="text-gray-600 mb-4">
            Browse and manage all feedbacks
          </p>
          <button 
            onClick={() => window.location.href = '/feedback'}
            className="btn-primary"
          >
            View Feedbacks
          </button>
        </div>

        <div className="card card-body text-center">
          <FiTrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analytics
          </h3>
          <p className="text-gray-600 mb-4">
            Detailed reports and analytics
          </p>
          <button className="btn-primary">
            View Analytics
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
