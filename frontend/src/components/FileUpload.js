import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaFile, FaTimes, FaImage, FaFilePdf, FaFileArchive, FaFileExcel } from 'react-icons/fa';
import { attachmentsAPI } from '../services/api';
import toast from 'react-hot-toast';

const FileUpload = ({ onFilesUploaded, maxFiles = 5, acceptedTypes = null }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const defaultAcceptedTypes = {
    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv']
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-too-large') {
            toast.error(`File ${file.name} is too large. Max size is 20MB.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`File ${file.name} has invalid type.`);
          } else {
            toast.error(`Error with file ${file.name}: ${error.message}`);
          }
        });
      });
    }

    // Check if adding files would exceed max limit
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`Cannot upload more than ${maxFiles} files.`);
      return;
    }

    // Add accepted files to state
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploading: false,
      uploaded: false,
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes || defaultAcceptedTypes,
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: maxFiles > 1
  });

  const removeFile = (fileId) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    files.forEach(({ file }) => {
      formData.append('attachments', file);
    });

    try {
      const response = await attachmentsAPI.upload(formData);
      
      if (response.success) {
        // Update file states to uploaded
        setFiles(prev => prev.map(f => ({ ...f, uploaded: true, uploading: false })));
        
        toast.success(`Successfully uploaded ${response.data.count} file(s)`);
        
        // Call parent callback with uploaded file information
        if (onFilesUploaded) {
          onFilesUploaded(response.data.files);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      
      // Mark files as error
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        uploading: false, 
        error: error.response?.data?.message || 'Upload failed' 
      })));
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    const type = file.type;
    
    if (type.startsWith('image/')) {
      return <FaImage className="text-blue-500" />;
    } else if (type === 'application/pdf') {
      return <FaFilePdf className="text-red-500" />;
    } else if (type.includes('zip') || type.includes('rar')) {
      return <FaFileArchive className="text-yellow-500" />;
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return <FaFileExcel className="text-green-500" />;
    } else {
      return <FaFile className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Supports images, documents, archives (max {maxFiles} files, 20MB each)
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Selected Files ({files.length}/{maxFiles})
            </h4>
            
            {files.some(f => !f.uploaded) && (
              <button
                onClick={uploadFiles}
                disabled={uploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {uploading ? 'Uploading...' : 'Upload All'}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {fileItem.preview ? (
                    <img
                      src={fileItem.preview}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getFileIcon(fileItem.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileItem.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileItem.file.size)}
                  </p>
                  
                  {/* Status */}
                  {fileItem.uploaded && (
                    <p className="text-xs text-green-600">✓ Uploaded</p>
                  )}
                  {fileItem.uploading && (
                    <p className="text-xs text-blue-600">⏳ Uploading...</p>
                  )}
                  {fileItem.error && (
                    <p className="text-xs text-red-600">✗ {fileItem.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFile(fileItem.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  disabled={fileItem.uploading}
                >
                  <FaTimes size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
