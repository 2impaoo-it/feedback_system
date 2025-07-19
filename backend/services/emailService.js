const nodemailer = require('nodemailer');
const redis = require('../config/redis');
const { Notification } = require('../models');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        this.emailQueue = 'email:queue';
        this.emailTemplates = this.initializeTemplates();
    }

    initializeTemplates() {
        return {
            welcome: {
                subject: 'Welcome to HUTECH Feedback System',
                template: (data) => `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #3B82F6;">Welcome to HUTECH Feedback System!</h2>
                        <p>Dear ${data.firstName},</p>
                        <p>Thank you for joining our feedback management system. You can now:</p>
                        <ul>
                            <li>Submit feedback and suggestions</li>
                            <li>Track your feedback status</li>
                            <li>Receive real-time updates</li>
                        </ul>
                        <p>Get started by visiting: <a href="${data.loginUrl}">Login to your account</a></p>
                        <p>Best regards,<br>HUTECH Support Team</p>
                    </div>
                `
            },
            feedbackReceived: {
                subject: 'New Feedback Received',
                template: (data) => `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #10B981;">New Feedback Received</h2>
                        <p>A new feedback has been submitted:</p>
                        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3>${data.title}</h3>
                            <p><strong>From:</strong> ${data.customerName}</p>
                            <p><strong>Category:</strong> ${data.category}</p>
                            <p><strong>Priority:</strong> ${data.priority}</p>
                            <p><strong>Sentiment:</strong> ${data.sentiment}</p>
                        </div>
                        <p><a href="${data.feedbackUrl}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Feedback</a></p>
                    </div>
                `
            },
            feedbackStatusUpdate: {
                subject: 'Your Feedback Status Updated',
                template: (data) => `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #F59E0B;">Feedback Status Update</h2>
                        <p>Dear ${data.customerName},</p>
                        <p>Your feedback status has been updated:</p>
                        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3>${data.title}</h3>
                            <p><strong>Previous Status:</strong> ${data.oldStatus}</p>
                            <p><strong>New Status:</strong> <span style="color: #10B981; font-weight: bold;">${data.newStatus}</span></p>
                            ${data.comment ? `<p><strong>Comment:</strong> ${data.comment}</p>` : ''}
                        </div>
                        <p><a href="${data.feedbackUrl}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
                    </div>
                `
            },
            feedbackAssigned: {
                subject: 'Feedback Assigned to You',
                template: (data) => `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #8B5CF6;">Feedback Assigned</h2>
                        <p>Dear ${data.assigneeName},</p>
                        <p>A feedback has been assigned to you:</p>
                        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3>${data.title}</h3>
                            <p><strong>Customer:</strong> ${data.customerName}</p>
                            <p><strong>Priority:</strong> ${data.priority}</p>
                            <p><strong>Assigned by:</strong> ${data.assignedBy}</p>
                        </div>
                        <p><a href="${data.feedbackUrl}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View & Respond</a></p>
                    </div>
                `
            },
            weeklyDigest: {
                subject: 'Weekly Feedback Digest',
                template: (data) => `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #3B82F6;">Weekly Feedback Digest</h2>
                        <p>Dear ${data.userName},</p>
                        <p>Here's your weekly feedback summary:</p>
                        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3>Statistics</h3>
                            <ul>
                                <li>Total Feedbacks: ${data.totalFeedbacks}</li>
                                <li>New This Week: ${data.newFeedbacks}</li>
                                <li>Resolved: ${data.resolvedFeedbacks}</li>
                                <li>Pending: ${data.pendingFeedbacks}</li>
                            </ul>
                        </div>
                        <p><a href="${data.dashboardUrl}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
                    </div>
                `
            }
        };
    }

    async sendEmail(to, templateName, data) {
        try {
            if (!this.emailTemplates[templateName]) {
                throw new Error(`Email template '${templateName}' not found`);
            }

            const template = this.emailTemplates[templateName];
            const mailOptions = {
                from: `"HUTECH Feedback System" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to,
                subject: template.subject,
                html: template.template(data)
            };

            // Add to queue for background processing
            await this.queueEmail(mailOptions);
            
            return { success: true, message: 'Email queued successfully' };
        } catch (error) {
            console.error('Email service error:', error);
            throw error;
        }
    }

    async queueEmail(mailOptions) {
        try {
            const emailData = {
                ...mailOptions,
                timestamp: new Date(),
                attempts: 0,
                maxAttempts: 3
            };

            await redis.lpush(this.emailQueue, JSON.stringify(emailData));
        } catch (error) {
            console.error('Failed to queue email:', error);
            throw error;
        }
    }

    async processEmailQueue() {
        try {
            const emailData = await redis.brpop(this.emailQueue, 5);
            
            if (emailData && emailData[1]) {
                const email = JSON.parse(emailData[1]);
                
                try {
                    await this.transporter.sendMail({
                        from: email.from,
                        to: email.to,
                        subject: email.subject,
                        html: email.html
                    });
                    
                    console.log(`✅ Email sent successfully to: ${email.to}`);
                } catch (sendError) {
                    console.error('Failed to send email:', sendError);
                    
                    // Retry logic
                    if (email.attempts < email.maxAttempts) {
                        email.attempts++;
                        await redis.lpush(this.emailQueue, JSON.stringify(email));
                    } else {
                        console.error('Max email attempts reached for:', email.to);
                    }
                }
            }
        } catch (error) {
            console.error('Email queue processing error:', error);
        }
    }

    startEmailWorker() {
        setInterval(() => {
            this.processEmailQueue();
        }, 2000); // Process every 2 seconds
        
        console.log('📧 Email worker started');
    }

    async sendWelcomeEmail(user, customer) {
        return this.sendEmail(user.email, 'welcome', {
            firstName: customer.firstName,
            loginUrl: `${process.env.FRONTEND_URL}/login`
        });
    }

    async sendFeedbackNotification(feedback, customer, category) {
        const adminUsers = await require('../models').User.find({ 
            role: { $in: ['admin', 'moderator'] },
            isActive: true 
        });

        for (const admin of adminUsers) {
            await this.sendEmail(admin.email, 'feedbackReceived', {
                title: feedback.title,
                customerName: `${customer.firstName} ${customer.lastName}`,
                category: category.name,
                priority: feedback.priority,
                sentiment: feedback.sentiment,
                feedbackUrl: `${process.env.FRONTEND_URL}/feedback/${feedback._id}`
            });
        }
    }

    async sendStatusUpdateEmail(feedback, customer, oldStatus, newStatus, comment = '') {
        return this.sendEmail(customer.email, 'feedbackStatusUpdate', {
            customerName: `${customer.firstName} ${customer.lastName}`,
            title: feedback.title,
            oldStatus,
            newStatus,
            comment,
            feedbackUrl: `${process.env.FRONTEND_URL}/feedback/${feedback._id}`
        });
    }

    async sendAssignmentEmail(feedback, assignee, customer, assignedBy) {
        return this.sendEmail(assignee.email, 'feedbackAssigned', {
            assigneeName: assignee.firstName || assignee.email,
            title: feedback.title,
            customerName: `${customer.firstName} ${customer.lastName}`,
            priority: feedback.priority,
            assignedBy: assignedBy.email,
            feedbackUrl: `${process.env.FRONTEND_URL}/feedback/${feedback._id}`
        });
    }

    async sendWeeklyDigest(user, stats) {
        return this.sendEmail(user.email, 'weeklyDigest', {
            userName: user.firstName || user.email,
            totalFeedbacks: stats.total,
            newFeedbacks: stats.new,
            resolvedFeedbacks: stats.resolved,
            pendingFeedbacks: stats.pending,
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        });
    }
}

module.exports = new EmailService();
