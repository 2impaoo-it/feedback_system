import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiUser, FiMonitor, FiMapPin, FiClock } from 'react-icons/fi';

const SessionConflictModal = ({ 
    isOpen, 
    onClose, 
    onForceLogin, 
    existingSession,
    loading = false 
}) => {
    if (!isOpen) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN');
    };

    const getBrowserInfo = (userAgent) => {
        if (!userAgent) return 'Không xác định';
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Trình duyệt khác';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <FiAlertTriangle className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Phát hiện phiên đăng nhập khác
                            </h3>
                            <p className="text-sm text-gray-500">
                                Tài khoản này đã được đăng nhập từ thiết bị khác
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-gray-700 mb-4">
                            Hệ thống chỉ cho phép một phiên đăng nhập cùng lúc. Phiên đăng nhập hiện tại:
                        </p>
                        
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2 text-sm">
                                <FiClock className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">Thời gian đăng nhập:</span>
                                <span className="font-medium text-gray-900">
                                    {formatDate(existingSession?.loginTime)}
                                </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm">
                                <FiMonitor className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">Trình duyệt:</span>
                                <span className="font-medium text-gray-900">
                                    {getBrowserInfo(existingSession?.userAgent)}
                                </span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-sm">
                                <FiMapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">Địa chỉ IP:</span>
                                <span className="font-medium text-gray-900">
                                    {existingSession?.ipAddress || 'Không xác định'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <FiUser className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="ml-3">
                                <h4 className="text-sm font-medium text-blue-800">
                                    Tùy chọn của bạn:
                                </h4>
                                <div className="mt-2 text-sm text-blue-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Đăng xuất phiên cũ và đăng nhập ở đây</li>
                                        <li>Hủy và sử dụng phiên đăng nhập hiện tại</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex flex-col sm:flex-row-reverse gap-3">
                    <button
                        onClick={onForceLogin}
                        disabled={loading}
                        className={`inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                            loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý...
                            </>
                        ) : (
                            'Đăng xuất phiên cũ và đăng nhập'
                        )}
                    </button>
                    
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className={`inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                            loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        Hủy
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SessionConflictModal;
