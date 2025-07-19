const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadFeedbackAttachments, processUploadedFiles, serveFile } = require('../services/fileService');
// const exportService = require('../services/exportService');
// const emailService = require('../services/emailService');

/**
 * @route   GET /api/export/feedback/excel
 * @desc    Export feedback to Excel
 * @access  Private (Admin/Moderator only)
 */
router.get('/feedback/excel',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const filters = {
                category: req.query.category,
                status: req.query.status,
                priority: req.query.priority,
                sentiment: req.query.sentiment,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
                assignedTo: req.query.assignedTo
            };

            // Remove empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });

            const result = await exportService.exportToExcel(filters, req.user);

            res.json({
                success: true,
                message: 'Excel export completed',
                data: {
                    filename: result.filename,
                    recordCount: result.recordCount,
                    downloadUrl: `/api/export/download/${result.filename}`
                }
            });

        } catch (error) {
            console.error('Excel export error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export to Excel'
            });
        }
    }
);

/**
 * @route   GET /api/export/feedback/pdf
 * @desc    Export feedback to PDF
 * @access  Private (Admin/Moderator only)
 */
router.get('/feedback/pdf',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const filters = {
                category: req.query.category,
                status: req.query.status,
                priority: req.query.priority,
                sentiment: req.query.sentiment,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            // Remove empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });

            const result = await exportService.exportToPDF(filters, req.user);

            res.json({
                success: true,
                message: 'PDF export completed',
                data: {
                    filename: result.filename,
                    recordCount: result.recordCount,
                    downloadUrl: `/api/export/download/${result.filename}`
                }
            });

        } catch (error) {
            console.error('PDF export error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export to PDF'
            });
        }
    }
);

/**
 * @route   GET /api/export/feedback/csv
 * @desc    Export feedback to CSV
 * @access  Private (Admin/Moderator only)
 */
router.get('/feedback/csv',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const filters = {
                category: req.query.category,
                status: req.query.status,
                priority: req.query.priority,
                sentiment: req.query.sentiment,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            // Remove empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });

            const result = await exportService.exportToCSV(filters, req.user);

            res.json({
                success: true,
                message: 'CSV export completed',
                data: {
                    filename: result.filename,
                    recordCount: result.recordCount,
                    downloadUrl: `/api/export/download/${result.filename}`
                }
            });

        } catch (error) {
            console.error('CSV export error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export to CSV'
            });
        }
    }
);

/**
 * @route   POST /api/export/import/feedback
 * @desc    Import feedback from file
 * @access  Private (SuperAdmin only)
 */
router.post('/import/feedback',
    authenticateToken,
    authorizeRoles('superAdmin'),
    uploadFeedbackAttachments,
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const file = req.files[0];
            const allowedTypes = ['.csv', '.xlsx', '.xls'];
            const fileExt = path.extname(file.originalname).toLowerCase();

            if (!allowedTypes.includes(fileExt)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid file type. Only CSV and Excel files are allowed.'
                });
            }

            const result = await exportService.importFromFile(file.path, req.user);

            res.json({
                success: true,
                message: 'Import completed',
                data: result
            });

        } catch (error) {
            console.error('Import error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to import file'
            });
        }
    }
);

/**
 * @route   GET /api/export/download/:filename
 * @desc    Download exported file
 * @access  Private (Admin/Moderator only)
 */
router.get('/download/:filename',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const { filename } = req.params;
            
            // Security check
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid filename'
                });
            }

            const exportDir = path.join(__dirname, '../exports');
            const filepath = path.join(exportDir, filename);

            // Check if file exists
            const fs = require('fs').promises;
            try {
                await fs.access(filepath);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found'
                });
            }

            // Set appropriate headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            // Determine content type based on file extension
            const ext = path.extname(filename).toLowerCase();
            if (ext === '.xlsx') {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            } else if (ext === '.csv') {
                res.setHeader('Content-Type', 'text/csv');
            } else if (ext === '.pdf') {
                res.setHeader('Content-Type', 'application/pdf');
            }

            // Stream file to response
            const fileStream = require('fs').createReadStream(filepath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to download file'
            });
        }
    }
);

/**
 * @route   GET /api/export/templates/import
 * @desc    Download import template
 * @access  Private (Admin/Moderator only)
 */
router.get('/templates/import',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const XLSX = require('xlsx');
            
            // Create template data
            const templateData = [
                {
                    'Title': 'Sample Feedback Title',
                    'Content': 'Sample feedback content describing the issue or suggestion',
                    'Customer Name': 'John Doe',
                    'Customer Email': 'john.doe@example.com',
                    'Company': 'Example Company',
                    'Category': 'General',
                    'Status': 'open',
                    'Priority': 'medium',
                    'Sentiment': 'neutral',
                    'Sentiment Score': '0.5',
                    'Rating': '4',
                    'Tags': 'sample, template'
                }
            ];

            // Create workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            
            // Add instructions sheet
            const instructions = [
                { Field: 'Title', Description: 'Feedback title (required)', Example: 'Website loading issue' },
                { Field: 'Content', Description: 'Feedback content (required)', Example: 'The website takes too long to load...' },
                { Field: 'Customer Name', Description: 'Customer full name', Example: 'John Doe' },
                { Field: 'Customer Email', Description: 'Customer email (required)', Example: 'john@example.com' },
                { Field: 'Company', Description: 'Customer company', Example: 'ABC Corp' },
                { Field: 'Category', Description: 'Feedback category', Example: 'Technical Issue, Bug Report, etc.' },
                { Field: 'Status', Description: 'Feedback status', Example: 'open, in_progress, resolved, closed' },
                { Field: 'Priority', Description: 'Priority level', Example: 'low, medium, high, urgent' },
                { Field: 'Sentiment', Description: 'Sentiment analysis', Example: 'positive, neutral, negative' },
                { Field: 'Sentiment Score', Description: 'Sentiment score (0-1)', Example: '0.7' },
                { Field: 'Rating', Description: 'Customer rating (1-5)', Example: '4' },
                { Field: 'Tags', Description: 'Comma-separated tags', Example: 'bug, urgent, website' }
            ];
            
            const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
            XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

            // Generate buffer
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="feedback_import_template.xlsx"');
            res.send(buffer);

        } catch (error) {
            console.error('Template download error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate template'
            });
        }
    }
);

/**
 * @route   POST /api/export/email/report
 * @desc    Email report to user
 * @access  Private (Admin/Moderator only)
 */
router.post('/email/report',
    authenticateToken,
    authorizeRoles('admin', 'moderator', 'superAdmin'),
    async (req, res) => {
        try {
            const { reportType, filters, emailTo } = req.body;
            
            let result;
            switch (reportType) {
                case 'excel':
                    result = await exportService.exportToExcel(filters, req.user);
                    break;
                case 'pdf':
                    result = await exportService.exportToPDF(filters, req.user);
                    break;
                case 'csv':
                    result = await exportService.exportToCSV(filters, req.user);
                    break;
                default:
                    throw new Error('Invalid report type');
            }

            // Send email with attachment
            await emailService.sendEmail(emailTo || req.user.email, 'feedbackReport', {
                userName: req.user.firstName || req.user.email,
                reportType: reportType.toUpperCase(),
                recordCount: result.recordCount,
                attachmentPath: result.filepath
            });

            res.json({
                success: true,
                message: 'Report emailed successfully',
                data: {
                    filename: result.filename,
                    recordCount: result.recordCount,
                    emailedTo: emailTo || req.user.email
                }
            });

        } catch (error) {
            console.error('Email report error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to email report'
            });
        }
    }
);

module.exports = router;
