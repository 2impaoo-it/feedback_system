import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ 
  children, 
  user, 
  allowedRoles = null, 
  fallback = '/login' 
}) => {
  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export default ProtectedRoute;
