const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Supported file types
const ALLOWED_FILE_TYPES = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    archives: ['.zip', '.rar', '.7z'],
    spreadsheets: ['.xls', '.xlsx', '.csv']
};

const ALL_ALLOWED_EXTENSIONS = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.documents,
    ...ALLOWED_FILE_TYPES.archives,
    ...ALLOWED_FILE_TYPES.spreadsheets
];

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    image: 5 * 1024 * 1024,      // 5MB for images
    document: 10 * 1024 * 1024,   // 10MB for documents
    archive: 20 * 1024 * 1024,    // 20MB for archives
    default: 5 * 1024 * 1024      // 5MB default
};

// Configure multer storage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/attachments');
        
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${timestamp}-${uniqueId}${ext}`;
        cb(null, filename);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ALL_ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${ext} is not allowed. Allowed types: ${ALL_ALLOWED_EXTENSIONS.join(', ')}`), false);
    }
};

// Get file size limit based on file type
const getFileSizeLimit = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    
    if (ALLOWED_FILE_TYPES.images.includes(ext)) {
        return FILE_SIZE_LIMITS.image;
    } else if (ALLOWED_FILE_TYPES.documents.includes(ext)) {
        return FILE_SIZE_LIMITS.document;
    } else if (ALLOWED_FILE_TYPES.archives.includes(ext)) {
        return FILE_SIZE_LIMITS.archive;
    }
    
    return FILE_SIZE_LIMITS.default;
};

// Create multer upload middleware
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
        files: 5 // Maximum 5 files per upload
    }
});

// File upload middleware for feedback attachments
const uploadFeedbackAttachments = upload.array('attachments', 5);

// File information processor
const processUploadedFiles = async (files, userId) => {
    if (!files || files.length === 0) {
        return [];
    }

    const processedFiles = [];

    for (const file of files) {
        try {
            const fileInfo = {
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                mimetype: file.mimetype,
                uploadedBy: userId,
                uploadedAt: new Date()
            };

            // Get file type category
            const ext = path.extname(file.originalname).toLowerCase();
            if (ALLOWED_FILE_TYPES.images.includes(ext)) {
                fileInfo.type = 'image';
            } else if (ALLOWED_FILE_TYPES.documents.includes(ext)) {
                fileInfo.type = 'document';
            } else if (ALLOWED_FILE_TYPES.archives.includes(ext)) {
                fileInfo.type = 'archive';
            } else if (ALLOWED_FILE_TYPES.spreadsheets.includes(ext)) {
                fileInfo.type = 'spreadsheet';
            } else {
                fileInfo.type = 'other';
            }

            // Generate secure download URL
            fileInfo.downloadUrl = `/api/attachments/${fileInfo.filename}`;
            
            processedFiles.push(fileInfo);

        } catch (error) {
            console.error('Error processing file:', file.originalname, error);
            // Clean up file if processing failed
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                console.error('Error deleting failed file:', unlinkError);
            }
        }
    }

    return processedFiles;
};

// File validation
const validateFile = (file) => {
    const errors = [];
    
    if (!file) {
        errors.push('No file provided');
        return errors;
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALL_ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`File type ${ext} is not allowed`);
    }

    // Check file size
    const maxSize = getFileSizeLimit(file.originalname);
    if (file.size > maxSize) {
        errors.push(`File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check filename length
    if (file.originalname.length > 255) {
        errors.push('Filename is too long (max 255 characters)');
    }

    return errors;
};

// Clean up old files (for maintenance)
const cleanupOldFiles = async (daysOld = 30) => {
    try {
        const uploadDir = path.join(__dirname, '../uploads/attachments');
        const files = await fs.readdir(uploadDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let deletedCount = 0;

        for (const filename of files) {
            const filePath = path.join(uploadDir, filename);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
                await fs.unlink(filePath);
                deletedCount++;
            }
        }

        console.log(`🧹 Cleaned up ${deletedCount} old files`);
        return deletedCount;
        
    } catch (error) {
        console.error('Error during file cleanup:', error);
        throw error;
    }
};

// File serving middleware
const serveFile = async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, '../uploads/attachments', filename);

        // Security check - ensure filename doesn't contain path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename'
            });
        }

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Get file stats
        const stats = await fs.stat(filePath);
        
        // Set appropriate headers
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream file to response
        const fileStream = require('fs').createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({
            success: false,
            message: 'Error serving file'
        });
    }
};

module.exports = {
    uploadFeedbackAttachments,
    processUploadedFiles,
    validateFile,
    cleanupOldFiles,
    serveFile,
    ALLOWED_FILE_TYPES,
    FILE_SIZE_LIMITS
};
