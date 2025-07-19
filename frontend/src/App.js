import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import FeedbackForm from './components/FeedbackForm';
import FeedbackListSimple from './components/FeedbackListSimple';
import FeedbackList from './components/FeedbackList';
import FeedbackDetail from './components/FeedbackDetail';
import Dashboard from './components/Dashboard';
import Categories from './components/Categories';
import Profile from './components/Profile';
import UserManagement from './components/UserManagement';
import CreateSuperAdmin from './components/CreateSuperAdmin';
import ExportImport from './components/ExportImport';
import NotFound from './components/NotFound';

// Services
import { authAPI } from './services/api';
import socketService from './services/socket';

// Styles
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Setup socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      if (token) {
        socketService.connect(token, user.id);
        
        // Listen for connection status changes
        socketService.on('connection_status', setConnectionStatus);
        
        // Cleanup on unmount
        return () => {
          socketService.off('connection_status', setConnectionStatus);
        };
      }
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, user]);

  const initializeApp = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        const response = await authAPI.getProfile();
        if (response.success) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    console.log('handleLogin called with:', userData, token);
    console.log('userData.user:', userData.user);
    localStorage.setItem('token', token);
    setUser(userData.user);
    setIsAuthenticated(true);
    console.log('User state set to:', userData.user);
    
    // Force reload to ensure authentication state is updated
    setTimeout(() => {
      const userRole = userData.user.role;
      console.log('Navigating based on role:', userRole);
      if (userRole === 'customer') {
        console.log('Redirecting to /feedback');
        window.location.replace('/feedback');
      } else {
        console.log('Redirecting to /');
        window.location.replace('/');
      }
    }, 200);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      socketService.disconnect();
    }
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10B981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />

          {isAuthenticated ? (
            <>
              {/* Navigation */}
              <Navbar 
                user={user}
                onLogout={handleLogout}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                connectionStatus={connectionStatus}
              />

              <div className="flex">
                {/* Sidebar */}
                <Sidebar
                  user={user}
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                />

                {/* Main content */}
                <main className={`flex-1 transition-all duration-300 ${
                  sidebarOpen ? 'lg:ml-64' : ''
                }`}>
                  <div className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <Routes>
                        {/* Dashboard - Only for admin and superAdmin */}
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute 
                              user={user} 
                              allowedRoles={['admin', 'superAdmin']}
                              fallback="/feedback"
                            >
                              <Dashboard user={user} />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* User Management - Only for superAdmin */}
                        <Route
                          path="/users"
                          element={
                            <ProtectedRoute 
                              user={user} 
                              allowedRoles={['superAdmin']}
                              fallback="/"
                            >
                              <UserManagement user={user} />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Feedback routes */}
                        <Route
                          path="/feedback"
                          element={<FeedbackList user={user} />}
                        />
                        <Route
                          path="/feedback/new"
                          element={
                            <ProtectedRoute user={user}>
                              <FeedbackForm user={user} />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/feedback/:id"
                          element={
                            <ProtectedRoute user={user}>
                              <FeedbackDetail user={user} />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Categories - Only for admin and superAdmin */}
                        <Route
                          path="/categories"
                          element={
                            <ProtectedRoute 
                              user={user} 
                              allowedRoles={['admin', 'superAdmin']}
                            >
                              <Categories user={user} />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Profile */}
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute user={user}>
                              <Profile user={user} onUpdateUser={updateUser} />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Export/Import - Only for admin and superAdmin */}
                        <Route
                          path="/export"
                          element={
                            <ProtectedRoute 
                              user={user} 
                              allowedRoles={['admin', 'moderator', 'superAdmin']}
                            >
                              <ExportImport user={user} />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Redirect root based on role */}
                        <Route
                          path="/dashboard"
                          element={
                            user?.role === 'customer' ? 
                              <Navigate to="/feedback" /> : 
                              <Navigate to="/" />
                          }
                        />
                        
                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </div>
                  </div>
                </main>
              </div>
            </>
          ) : (
            /* Authentication routes */
            <Routes>
              <Route
                path="/login"
                element={<Login onLogin={handleLogin} />}
              />
              <Route
                path="/register"
                element={<Register onRegister={handleLogin} />}
              />
              <Route
                path="/create-super-admin"
                element={<CreateSuperAdmin />}
              />
              <Route
                path="*"
                element={<Navigate to="/login" />}
              />
            </Routes>
          )}
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
