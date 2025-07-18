import io from 'socket.io-client';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize socket connection
   */
  connect(token, userId) {
    if (this.socket) {
      this.disconnect();
    }

    const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      autoConnect: true,
    });

    this.setupEventHandlers();
    
    // Authenticate after connection
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      if (token && userId) {
        this.authenticate(token, userId);
      }
    });

    return this.socket;
  }

  /**
   * Authenticate user with the server
   */
  authenticate(token, userId) {
    if (!this.socket) return;

    this.socket.emit('authenticate', { token, userId });
  }

  /**
   * Setup common event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    // Authentication events
    this.socket.on('authenticated', (data) => {
      console.log('✅ Authentication successful:', data.user);
      toast.success('Connected to real-time updates');
      this.emit('authenticated', data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('❌ Authentication failed:', error);
      toast.error('Failed to connect to real-time updates');
      this.emit('auth_error', error);
    });

    // Rate limiting
    this.socket.on('rate_limit_exceeded', (data) => {
      toast.error(data.message || 'Rate limit exceeded');
      this.emit('rate_limit_exceeded', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('error', error);
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      toast.success('Reconnected to server');
      this.emit('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Failed to reconnect to server');
      }
    });

    // Feedback events
    this.socket.on('newFeedback', (data) => {
      this.emit('newFeedback', data);
      
      // Show notification for admins/moderators
      toast.success(`New feedback: ${data.feedback.title}`, {
        duration: 5000,
      });
    });

    this.socket.on('feedbackUpdated', (data) => {
      this.emit('feedbackUpdated', data);
    });

    this.socket.on('feedbackAssigned', (data) => {
      this.emit('feedbackAssigned', data);
    });

    // Real-time notifications
    this.socket.on('new_feedback_notification', (data) => {
      this.emit('new_feedback_notification', data);
      
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📝</span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New Feedback
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {data.title}
                </p>
                <p className="text-xs text-gray-400">
                  From: {data.submittedBy}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        </div>
      ), { duration: 8000 });
    });

    this.socket.on('feedback_status_updated', (data) => {
      this.emit('feedback_status_updated', data);
    });

    this.socket.on('your_feedback_updated', (data) => {
      this.emit('your_feedback_updated', data);
      
      toast.success(data.message, {
        duration: 5000,
      });
    });

    // Comment events
    this.socket.on('new_comment', (data) => {
      this.emit('new_comment', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.emit('user_stopped_typing', data);
    });

    // User presence
    this.socket.on('user_offline', (data) => {
      this.emit('user_offline', data);
    });

    // Connection statistics
    this.socket.on('connection_stats', (data) => {
      this.emit('connection_stats', data);
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Join a specific room
   */
  joinRoom(roomName) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', roomName);
    }
  }

  /**
   * Leave a specific room
   */
  leaveRoom(roomName) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_room', roomName);
    }
  }

  /**
   * Join feedback-specific room for real-time updates
   */
  joinFeedback(feedbackId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_feedback', feedbackId);
    }
  }

  /**
   * Leave feedback-specific room
   */
  leaveFeedback(feedbackId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_feedback', feedbackId);
    }
  }

  /**
   * Send a comment
   */
  sendComment(feedbackId, comment) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_comment', { feedbackId, comment });
    }
  }

  /**
   * Send typing indicator
   */
  startTyping(feedbackId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { feedbackId });
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(feedbackId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { feedbackId });
    }
  }

  /**
   * Submit feedback via WebSocket
   */
  submitFeedback(feedbackData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('submit_feedback', feedbackData);
    }
  }

  /**
   * Update feedback status via WebSocket
   */
  updateFeedbackStatus(feedbackId, status, customerId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_feedback_status', { 
        feedbackId, 
        status, 
        customerId 
      });
    }
  }

  /**
   * Generic event listener
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);

    // Also add to socket if connected
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }

    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Emit custom event to internal handlers
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socket: this.socket?.connected || false,
      id: this.socket?.id,
    };
  }

  /**
   * Manually reconnect
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
