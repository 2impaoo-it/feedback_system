const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { uploadFeedbackAttachments, processUploadedFiles, serveFile, cleanupOldFiles } = require('../services/fileService');

/**
 * @route   POST /api/attachments/upload
 * @desc    Upload file attachments
 * @access  Private
 */
router.post('/upload',
    authenticateToken,
    uploadFeedbackAttachments,
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            const processedFiles = await processUploadedFiles(req.files, req.user._id);

            res.json({
                success: true,
                message: 'Files uploaded successfully',
                data: {
                    files: processedFiles,
                    count: processedFiles.length
                }
            });

        } catch (error) {
            console.error('File upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload files'
            });
        }
    }
);

/**
 * @route   GET /api/attachments/:filename
 * @desc    Serve/download file attachment
 * @access  Private
 */
router.get('/:filename',
    authenticateToken,
    serveFile
);

/**
 * @route   DELETE /api/attachments/cleanup
 * @desc    Cleanup old attachment files
 * @access  Private (Admin only)
 */
router.delete('/cleanup',
    authenticateToken,
    async (req, res) => {
        try {
            if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            const daysOld = parseInt(req.query.days) || 30;
            const deletedCount = await cleanupOldFiles(daysOld);

            res.json({
                success: true,
                message: `Cleanup completed. Deleted ${deletedCount} old files.`,
                data: {
                    deletedCount,
                    daysOld
                }
            });

        } catch (error) {
            console.error('Cleanup error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup files'
            });
        }
    }
);

module.exports = router;
