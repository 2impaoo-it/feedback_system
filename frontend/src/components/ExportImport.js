import React, { useState } from 'react';
import { FaDownload, FaFileExcel, FaFilePdf, FaFileCsv, FaEnvelope, FaUpload, FaFileImport } from 'react-icons/fa';
import { exportAPI, categoriesAPI } from '../services/api';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import FileUpload from './FileUpload';

const ExportImport = ({ user }) => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    priority: '',
    sentiment: '',
    dateFrom: '',
    dateTo: ''
  });

  const [emailData, setEmailData] = useState({
    reportType: 'excel',
    emailTo: user?.email || '',
    includeAttachment: true
  });

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      let response;
      
      switch (format) {
        case 'excel':
          response = await exportAPI.exportExcel(filters);
          break;
        case 'pdf':
          response = await exportAPI.exportPDF(filters);
          break;
        case 'csv':
          response = await exportAPI.exportCSV(filters);
          break;
        default:
          throw new Error('Invalid export format');
      }

      if (response.success) {
        // Download the file
        const downloadResponse = await exportAPI.downloadFile(response.data.filename);
        saveAs(downloadResponse, response.data.filename);
        
        toast.success(`Successfully exported ${response.data.recordCount} records to ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export to ${format.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const handleEmailReport = async () => {
    try {
      const response = await exportAPI.emailReport({
        reportType: emailData.reportType,
        filters,
        emailTo: emailData.emailTo
      });

      if (response.success) {
        toast.success(`Report emailed successfully to ${emailData.emailTo}`);
        setEmailModalOpen(false);
      }
    } catch (error) {
      console.error('Email report error:', error);
      toast.error('Failed to email report');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await exportAPI.getImportTemplate();
      saveAs(response, 'feedback_import_template.xlsx');
      toast.success('Import template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (uploadedFiles) => {
    setImporting(true);
    try {
      // Create FormData with the first uploaded file
      const formData = new FormData();
      formData.append('attachments', uploadedFiles[0].file);

      const response = await exportAPI.importFeedback(formData);
      
      if (response.success) {
        const { imported, total, errors, skipped } = response.data;
        
        toast.success(
          `Import completed! Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors.length} out of ${total} records`
        );
        
        if (errors.length > 0) {
          console.warn('Import errors:', errors);
        }
        
        setShowImport(false);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  const canImport = user?.role === 'superAdmin';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Export & Import</h3>
        {canImport && (
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <FaFileImport />
            {showImport ? 'Hide Import' : 'Import Data'}
          </button>
        )}
      </div>

      {/* Export Filters */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Export Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sentiment</label>
            <select
              value={filters.sentiment}
              onChange={(e) => setFilters(prev => ({ ...prev, sentiment: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-3">Export Options</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaFileExcel />
            Export to Excel
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaFilePdf />
            Export to PDF
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaFileCsv />
            Export to CSV
          </button>

          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <FaEnvelope />
            Email Report
          </button>
        </div>
      </div>

      {/* Import Section */}
      {canImport && showImport && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-700">Import Feedback Data</h4>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              <FaDownload size={12} />
              Download Template
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please download the template first and follow the format. 
              Ensure all required fields are filled correctly.
            </p>
          </div>

          <FileUpload
            onFilesUploaded={handleImport}
            maxFiles={1}
            acceptedTypes={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls'],
              'text/csv': ['.csv']
            }}
          />
          
          {importing && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">Importing data, please wait...</p>
            </div>
          )}
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Report</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Format</label>
                <select
                  value={emailData.reportType}
                  onChange={(e) => setEmailData(prev => ({ ...prev, reportType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email To</label>
                <input
                  type="email"
                  value={emailData.emailTo}
                  onChange={(e) => setEmailData(prev => ({ ...prev, emailTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailReport}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {exporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Exporting data, please wait...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportImport;
