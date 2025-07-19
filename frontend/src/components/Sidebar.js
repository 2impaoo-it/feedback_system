import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiMessageSquare, 
  FiPlus, 
  FiUsers, 
  FiSettings,
  FiX,
  FiBarChart2,
  FiList
} from 'react-icons/fi';

const Sidebar = ({ user, isOpen, onClose }) => {
  const navigation = [
    {
      name: 'Bảng điều khiển',
      href: '/',
      icon: FiHome,
      roles: ['admin', 'superAdmin']
    },
    {
      name: 'Phản hồi của tôi',
      href: '/feedback',
      icon: FiMessageSquare,
      roles: ['customer', 'admin', 'superAdmin']
    },
    {
      name: 'Tạo phản hồi',
      href: '/feedback/new',
      icon: FiPlus,
      roles: ['customer', 'admin', 'superAdmin']
    },
    {
      name: 'Tất cả phản hồi',
      href: '/feedback/all',
      icon: FiList,
      roles: ['admin', 'superAdmin']
    },
    {
      name: 'Phân tích',
      href: '/analytics',
      icon: FiBarChart2,
      roles: ['admin', 'superAdmin']
    },
    {
      name: 'Danh mục',
      href: '/categories',
      icon: FiSettings,
      roles: ['admin', 'superAdmin']
    },
    {
      name: 'Quản lý người dùng',
      href: '/users',
      icon: FiUsers,
      roles: ['superAdmin']
    }
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            Hệ thống Phản hồi
          </h1>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {filteredNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
