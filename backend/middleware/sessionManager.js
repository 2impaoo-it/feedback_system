/**
 * Session Manager - Quản lý phiên đăng nhập đồng thời
 * Ngăn chặn một tài khoản đăng nhập từ nhiều thiết bị/tab cùng lúc
 */

class SessionManager {
    constructor() {
        // Map để lưu trữ các phiên đang hoạt động
        // Key: userId, Value: { sessionId, socketId, loginTime, userAgent, ipAddress }
        this.activeSessions = new Map();
        
        // Map để theo dõi socket ID với session
        // Key: socketId, Value: userId
        this.socketToUser = new Map();
        
        // Thời gian timeout để clean up session cũ (30 phút)
        this.sessionTimeout = 30 * 60 * 1000;
        
        // Bắt đầu cleanup tự động
        this.startCleanupTimer();
    }

    /**
     * Tạo phiên đăng nhập mới
     * @param {string} userId - ID người dùng
     * @param {string} sessionId - JWT token hoặc session ID
     * @param {string} socketId - Socket ID (optional)
     * @param {string} userAgent - User agent string
     * @param {string} ipAddress - IP address
     * @returns {Object} Result object
     */
    createSession(userId, sessionId, socketId = null, userAgent = '', ipAddress = '') {
        const existingSession = this.activeSessions.get(userId);
        
        if (existingSession) {
            // Đã có phiên đăng nhập active
            return {
                success: false,
                conflict: true,
                existingSession: {
                    loginTime: existingSession.loginTime,
                    userAgent: existingSession.userAgent,
                    ipAddress: existingSession.ipAddress
                },
                message: 'Tài khoản này đã đăng nhập ở thiết bị khác. Vui lòng đăng xuất phiên cũ hoặc chọn "Đăng xuất tất cả thiết bị".'
            };
        }

        // Tạo phiên mới
        const newSession = {
            sessionId,
            socketId,
            loginTime: new Date(),
            userAgent,
            ipAddress,
            lastActivity: new Date()
        };

        this.activeSessions.set(userId, newSession);
        
        if (socketId) {
            this.socketToUser.set(socketId, userId);
        }

        console.log(`🔐 Session created for user ${userId} from ${ipAddress}`);
        
        return {
            success: true,
            conflict: false,
            message: 'Đăng nhập thành công'
        };
    }

    /**
     * Bắt buộc tạo phiên mới (đăng xuất phiên cũ)
     * @param {string} userId - ID người dùng
     * @param {string} sessionId - JWT token hoặc session ID
     * @param {string} socketId - Socket ID (optional)
     * @param {string} userAgent - User agent string
     * @param {string} ipAddress - IP address
     * @param {Object} io - Socket.io instance để thông báo
     * @returns {Object} Result object
     */
    forceCreateSession(userId, sessionId, socketId = null, userAgent = '', ipAddress = '', io = null) {
        const existingSession = this.activeSessions.get(userId);
        
        if (existingSession && io) {
            // Thông báo đăng xuất cho phiên cũ qua WebSocket
            if (existingSession.socketId) {
                io.to(existingSession.socketId).emit('force_logout', {
                    message: 'Tài khoản của bạn đã được đăng nhập từ thiết bị khác',
                    newLoginInfo: {
                        time: new Date(),
                        userAgent,
                        ipAddress
                    }
                });
            }
            
            // Xóa socket mapping cũ
            if (existingSession.socketId) {
                this.socketToUser.delete(existingSession.socketId);
            }
        }

        // Tạo phiên mới (ghi đè phiên cũ)
        const newSession = {
            sessionId,
            socketId,
            loginTime: new Date(),
            userAgent,
            ipAddress,
            lastActivity: new Date()
        };

        this.activeSessions.set(userId, newSession);
        
        if (socketId) {
            this.socketToUser.set(socketId, userId);
        }

        console.log(`🔐 Session force-created for user ${userId}, old session terminated`);
        
        return {
            success: true,
            conflict: false,
            oldSessionTerminated: !!existingSession,
            message: 'Đăng nhập thành công. Phiên cũ đã được đăng xuất.'
        };
    }

    /**
     * Kiểm tra tính hợp lệ của phiên
     * @param {string} userId - ID người dùng
     * @param {string} sessionId - Session ID cần kiểm tra
     * @returns {boolean} True nếu phiên hợp lệ
     */
    validateSession(userId, sessionId) {
        const session = this.activeSessions.get(userId);
        
        if (!session) {
            return false;
        }

        // Kiểm tra session ID khớp
        if (session.sessionId !== sessionId) {
            return false;
        }

        // Kiểm tra timeout
        const now = new Date();
        if (now - session.lastActivity > this.sessionTimeout) {
            this.removeSession(userId);
            return false;
        }

        // Cập nhật last activity
        session.lastActivity = now;
        return true;
    }

    /**
     * Cập nhật socket ID cho phiên
     * @param {string} userId - ID người dùng
     * @param {string} socketId - Socket ID mới
     */
    updateSocketId(userId, socketId) {
        const session = this.activeSessions.get(userId);
        if (session) {
            // Xóa mapping cũ nếu có
            if (session.socketId) {
                this.socketToUser.delete(session.socketId);
            }
            
            // Cập nhật socket mới
            session.socketId = socketId;
            this.socketToUser.set(socketId, userId);
            session.lastActivity = new Date();
        }
    }

    /**
     * Xóa phiên đăng nhập
     * @param {string} userId - ID người dùng
     */
    removeSession(userId) {
        const session = this.activeSessions.get(userId);
        if (session) {
            // Xóa socket mapping
            if (session.socketId) {
                this.socketToUser.delete(session.socketId);
            }
            
            // Xóa session
            this.activeSessions.delete(userId);
            console.log(`🔐 Session removed for user ${userId}`);
        }
    }

    /**
     * Xóa phiên theo socket ID (khi socket disconnect)
     * @param {string} socketId - Socket ID
     */
    removeSessionBySocket(socketId) {
        const userId = this.socketToUser.get(socketId);
        if (userId) {
            const session = this.activeSessions.get(userId);
            if (session && session.socketId === socketId) {
                // Chỉ xóa session nếu socket ID khớp
                session.socketId = null; // Giữ session nhưng xóa socket
                this.socketToUser.delete(socketId);
                console.log(`🔐 Socket removed for user ${userId}, session maintained`);
            }
        }
    }

    /**
     * Lấy thông tin phiên
     * @param {string} userId - ID người dùng
     * @returns {Object|null} Thông tin phiên
     */
    getSession(userId) {
        return this.activeSessions.get(userId) || null;
    }

    /**
     * Lấy danh sách tất cả phiên đang hoạt động
     * @returns {Array} Danh sách phiên
     */
    getAllActiveSessions() {
        const sessions = [];
        for (const [userId, session] of this.activeSessions.entries()) {
            sessions.push({
                userId,
                ...session
            });
        }
        return sessions;
    }

    /**
     * Đếm số phiên đang hoạt động
     * @returns {number} Số phiên
     */
    getActiveSessionCount() {
        return this.activeSessions.size;
    }

    /**
     * Cleanup tự động các phiên hết hạn
     */
    cleanup() {
        const now = new Date();
        const expiredSessions = [];

        for (const [userId, session] of this.activeSessions.entries()) {
            if (now - session.lastActivity > this.sessionTimeout) {
                expiredSessions.push(userId);
            }
        }

        expiredSessions.forEach(userId => {
            this.removeSession(userId);
        });

        if (expiredSessions.length > 0) {
            console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }

    /**
     * Bắt đầu timer cleanup tự động
     */
    startCleanupTimer() {
        // Cleanup mỗi 5 phút
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * Đăng xuất tất cả phiên (admin function)
     * @param {Object} io - Socket.io instance
     */
    logoutAllSessions(io) {
        const count = this.activeSessions.size;
        
        // Thông báo đăng xuất cho tất cả socket
        for (const [userId, session] of this.activeSessions.entries()) {
            if (session.socketId && io) {
                io.to(session.socketId).emit('force_logout', {
                    message: 'Hệ thống yêu cầu đăng nhập lại',
                    reason: 'admin_logout_all'
                });
            }
        }

        // Xóa tất cả session
        this.activeSessions.clear();
        this.socketToUser.clear();
        
        console.log(`🔐 All ${count} sessions logged out by admin`);
        return count;
    }
}

// Export singleton instance
const sessionManager = new SessionManager();
module.exports = sessionManager;
