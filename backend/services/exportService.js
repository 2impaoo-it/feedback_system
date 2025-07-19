const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const { Feedback, Customer, FeedbackCategory, User } = require('../models');

class ExportService {
    constructor() {
        this.exportDir = path.join(__dirname, '../exports');
        this.ensureExportDir();
    }

    async ensureExportDir() {
        try {
            await fs.mkdir(this.exportDir, { recursive: true });
        } catch (error) {
            console.error('Error creating export directory:', error);
        }
    }

    // Export feedback data to Excel
    async exportToExcel(filters = {}, user) {
        try {
            const feedbacks = await this.getFeedbackData(filters);
            
            // Transform data for Excel
            const excelData = feedbacks.map(feedback => ({
                'ID': feedback._id.toString(),
                'Title': feedback.title,
                'Content': feedback.content,
                'Customer Name': `${feedback.customerId.firstName} ${feedback.customerId.lastName}`,
                'Customer Email': feedback.customerId.email,
                'Company': feedback.customerId.company,
                'Category': feedback.categoryId.name,
                'Status': feedback.status,
                'Priority': feedback.priority,
                'Sentiment': feedback.sentiment,
                'Sentiment Score': feedback.sentimentScore,
                'Rating': feedback.rating || 'N/A',
                'Tags': feedback.tags.join(', '),
                'Assigned To': feedback.assignedTo?.email || 'Unassigned',
                'Created Date': moment(feedback.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                'Updated Date': moment(feedback.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                'Response Time (hours)': feedback.responseTime ? Math.round(feedback.responseTime / (1000 * 60 * 60)) : 'N/A'
            }));

            // Create workbook
            const workbook = XLSX.utils.book_new();
            
            // Main data sheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // Auto-adjust column widths
            const colWidths = Object.keys(excelData[0] || {}).map(key => ({
                wch: Math.max(key.length, 15)
            }));
            worksheet['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Feedback Data');

            // Summary sheet
            const summary = await this.generateSummaryData(feedbacks);
            const summarySheet = XLSX.utils.json_to_sheet(summary);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Generate filename
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filename = `feedback_export_${timestamp}.xlsx`;
            const filepath = path.join(this.exportDir, filename);

            // Write file
            XLSX.writeFile(workbook, filepath);

            return {
                success: true,
                filename,
                filepath,
                recordCount: feedbacks.length
            };

        } catch (error) {
            console.error('Excel export error:', error);
            throw new Error('Failed to export to Excel');
        }
    }

    // Export feedback data to PDF
    async exportToPDF(filters = {}, user) {
        try {
            const feedbacks = await this.getFeedbackData(filters);
            
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filename = `feedback_report_${timestamp}.pdf`;
            const filepath = path.join(this.exportDir, filename);

            const doc = new PDFDocument({ margin: 50 });
            const stream = doc.pipe(require('fs').createWriteStream(filepath));

            // Header
            doc.fontSize(20).text('Feedback System Report', { align: 'center' });
            doc.fontSize(12).text(`Generated on: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { align: 'center' });
            doc.text(`Exported by: ${user.email}`, { align: 'center' });
            doc.moveDown(2);

            // Summary section
            const summary = await this.generateSummaryData(feedbacks);
            doc.fontSize(16).text('Summary Statistics', { underline: true });
            doc.moveDown();
            
            summary.forEach(item => {
                doc.fontSize(12).text(`${item.Metric}: ${item.Value}`);
            });
            
            doc.moveDown(2);

            // Feedback details
            doc.fontSize(16).text('Feedback Details', { underline: true });
            doc.moveDown();

            feedbacks.forEach((feedback, index) => {
                if (index > 0) doc.addPage();
                
                doc.fontSize(14).text(`${index + 1}. ${feedback.title}`, { continued: false });
                doc.moveDown();
                
                doc.fontSize(10)
                   .text(`ID: ${feedback._id}`)
                   .text(`Customer: ${feedback.customerId.firstName} ${feedback.customerId.lastName} (${feedback.customerId.email})`)
                   .text(`Category: ${feedback.categoryId.name}`)
                   .text(`Status: ${feedback.status}`)
                   .text(`Priority: ${feedback.priority}`)
                   .text(`Sentiment: ${feedback.sentiment} (${feedback.sentimentScore})`)
                   .text(`Created: ${moment(feedback.createdAt).format('YYYY-MM-DD HH:mm:ss')}`)
                   .moveDown();
                
                doc.fontSize(11).text('Content:', { continued: false });
                doc.text(feedback.content, { align: 'justify' });
                
                if (feedback.tags.length > 0) {
                    doc.moveDown().text(`Tags: ${feedback.tags.join(', ')}`);
                }
            });

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    resolve({
                        success: true,
                        filename,
                        filepath,
                        recordCount: feedbacks.length
                    });
                });
                
                stream.on('error', reject);
            });

        } catch (error) {
            console.error('PDF export error:', error);
            throw new Error('Failed to export to PDF');
        }
    }

    // Export feedback data to CSV
    async exportToCSV(filters = {}, user) {
        try {
            const feedbacks = await this.getFeedbackData(filters);
            
            // CSV headers
            const headers = [
                'ID', 'Title', 'Content', 'Customer Name', 'Customer Email', 'Company',
                'Category', 'Status', 'Priority', 'Sentiment', 'Sentiment Score',
                'Rating', 'Tags', 'Assigned To', 'Created Date', 'Updated Date'
            ];

            // CSV data
            const csvData = feedbacks.map(feedback => [
                feedback._id.toString(),
                `"${feedback.title.replace(/"/g, '""')}"`,
                `"${feedback.content.replace(/"/g, '""')}"`,
                `"${feedback.customerId.firstName} ${feedback.customerId.lastName}"`,
                feedback.customerId.email,
                `"${feedback.customerId.company}"`,
                `"${feedback.categoryId.name}"`,
                feedback.status,
                feedback.priority,
                feedback.sentiment,
                feedback.sentimentScore,
                feedback.rating || '',
                `"${feedback.tags.join(', ')}"`,
                feedback.assignedTo?.email || '',
                moment(feedback.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                moment(feedback.updatedAt).format('YYYY-MM-DD HH:mm:ss')
            ]);

            // Combine headers and data
            const csvContent = [
                headers.join(','),
                ...csvData.map(row => row.join(','))
            ].join('\n');

            // Generate filename and save
            const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
            const filename = `feedback_export_${timestamp}.csv`;
            const filepath = path.join(this.exportDir, filename);

            await fs.writeFile(filepath, csvContent, 'utf8');

            return {
                success: true,
                filename,
                filepath,
                recordCount: feedbacks.length
            };

        } catch (error) {
            console.error('CSV export error:', error);
            throw new Error('Failed to export to CSV');
        }
    }

    // Import feedback data from CSV/Excel
    async importFromFile(filepath, user) {
        try {
            const ext = path.extname(filepath).toLowerCase();
            let data;

            if (ext === '.csv') {
                data = await this.parseCSV(filepath);
            } else if (ext === '.xlsx' || ext === '.xls') {
                data = await this.parseExcel(filepath);
            } else {
                throw new Error('Unsupported file format. Use CSV or Excel files.');
            }

            const results = {
                total: data.length,
                imported: 0,
                errors: [],
                skipped: 0
            };

            for (let i = 0; i < data.length; i++) {
                try {
                    await this.importFeedbackRecord(data[i], user);
                    results.imported++;
                } catch (error) {
                    results.errors.push({
                        row: i + 2, // +2 for header and 0-based index
                        error: error.message,
                        data: data[i]
                    });
                }
            }

            results.skipped = results.total - results.imported - results.errors.length;

            return results;

        } catch (error) {
            console.error('Import error:', error);
            throw error;
        }
    }

    // Helper methods
    async getFeedbackData(filters) {
        const query = {};
        
        // Apply filters
        if (filters.category) query.categoryId = filters.category;
        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.sentiment) query.sentiment = filters.sentiment;
        if (filters.dateFrom || filters.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
            if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
        }

        return await Feedback.find(query)
            .populate('customerId', 'firstName lastName email company')
            .populate('categoryId', 'name')
            .populate('assignedTo', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .lean();
    }

    async generateSummaryData(feedbacks) {
        const total = feedbacks.length;
        const statusCounts = {};
        const priorityCounts = {};
        const sentimentCounts = {};
        const categoryCounts = {};

        feedbacks.forEach(feedback => {
            // Status distribution
            statusCounts[feedback.status] = (statusCounts[feedback.status] || 0) + 1;
            
            // Priority distribution
            priorityCounts[feedback.priority] = (priorityCounts[feedback.priority] || 0) + 1;
            
            // Sentiment distribution
            sentimentCounts[feedback.sentiment] = (sentimentCounts[feedback.sentiment] || 0) + 1;
            
            // Category distribution
            const categoryName = feedback.categoryId.name;
            categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
        });

        const summary = [
            { Metric: 'Total Feedback', Value: total },
            { Metric: 'Open', Value: statusCounts.open || 0 },
            { Metric: 'In Progress', Value: statusCounts.in_progress || 0 },
            { Metric: 'Resolved', Value: statusCounts.resolved || 0 },
            { Metric: 'Closed', Value: statusCounts.closed || 0 },
            { Metric: 'High Priority', Value: priorityCounts.high || 0 },
            { Metric: 'Urgent Priority', Value: priorityCounts.urgent || 0 },
            { Metric: 'Positive Sentiment', Value: sentimentCounts.positive || 0 },
            { Metric: 'Negative Sentiment', Value: sentimentCounts.negative || 0 },
            { Metric: 'Neutral Sentiment', Value: sentimentCounts.neutral || 0 }
        ];

        return summary;
    }

    async parseCSV(filepath) {
        const content = await fs.readFile(filepath, 'utf8');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        return lines.slice(1).filter(line => line.trim()).map(line => {
            const values = this.parseCSVLine(line);
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });
            return record;
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    async parseExcel(filepath) {
        const workbook = XLSX.readFile(filepath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        return XLSX.utils.sheet_to_json(worksheet);
    }

    async importFeedbackRecord(record, user) {
        // Validate required fields
        if (!record.Title || !record.Content || !record['Customer Email']) {
            throw new Error('Missing required fields: Title, Content, Customer Email');
        }

        // Find or create customer
        let customer = await Customer.findOne({ email: record['Customer Email'] });
        if (!customer) {
            // Create new customer and user
            const [firstName, ...lastNameParts] = (record['Customer Name'] || '').split(' ');
            const lastName = lastNameParts.join(' ');
            
            const newUser = new User({
                email: record['Customer Email'],
                password: 'defaultPassword123', // Should be changed by user
                role: 'customer',
                isActive: true
            });
            await newUser.save();

            customer = new Customer({
                userId: newUser._id,
                firstName: firstName || 'Unknown',
                lastName: lastName || 'User',
                email: record['Customer Email'],
                company: record.Company || 'Unknown'
            });
            await customer.save();
        }

        // Find category
        let category = await FeedbackCategory.findOne({ name: record.Category });
        if (!category) {
            // Create default category
            category = await FeedbackCategory.findOne({ name: 'General' });
        }

        // Create feedback
        const feedback = new Feedback({
            customerId: customer._id,
            title: record.Title,
            content: record.Content,
            categoryId: category._id,
            status: record.Status || 'open',
            priority: record.Priority || 'medium',
            sentiment: record.Sentiment || 'neutral',
            sentimentScore: parseFloat(record['Sentiment Score']) || 0,
            rating: parseInt(record.Rating) || undefined,
            tags: record.Tags ? record.Tags.split(',').map(t => t.trim()) : [],
            isPublic: true
        });

        await feedback.save();
        return feedback;
    }

    // Clean up old export files
    async cleanupOldExports(daysOld = 7) {
        try {
            const files = await fs.readdir(this.exportDir);
            const cutoffDate = moment().subtract(daysOld, 'days').toDate();
            let deletedCount = 0;

            for (const filename of files) {
                const filepath = path.join(this.exportDir, filename);
                const stats = await fs.stat(filepath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filepath);
                    deletedCount++;
                }
            }

            console.log(`🧹 Cleaned up ${deletedCount} old export files`);
            return deletedCount;
            
        } catch (error) {
            console.error('Error during export cleanup:', error);
            throw error;
        }
    }
}

module.exports = new ExportService();
