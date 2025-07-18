import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { feedbackAPI, categoriesAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const FeedbackForm = ({ user, editMode = false, feedbackData = null }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm({
    defaultValues: feedbackData || {
      title: '',
      content: '',
      categoryId: '',
      priority: 'medium',
      rating: '',
      tags: [],
      isPublic: true
    },
    mode: 'onChange'
  });

  const watchedContent = watch('content');
  const watchedTags = watch('tags');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await categoriesAPI.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      // Process tags
      const processedTags = typeof data.tags === 'string' 
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : data.tags;

      const feedbackData = {
        ...data,
        tags: processedTags,
        rating: data.rating ? parseInt(data.rating) : null
      };

      let response;
      if (editMode && feedbackData.id) {
        response = await feedbackAPI.update(feedbackData.id, feedbackData);
      } else {
        response = await feedbackAPI.create(feedbackData);
      }

      if (response.success) {
        toast.success(
          editMode ? 'Feedback updated successfully!' : 'Feedback submitted successfully!'
        );
        navigate('/feedback');
      }
    } catch (error) {
      toast.error(
        editMode ? 'Failed to update feedback' : 'Failed to submit feedback'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tagValue = e.target.value.trim();
      if (tagValue) {
        const currentTags = watchedTags || [];
        if (!currentTags.includes(tagValue)) {
          setValue('tags', [...currentTags, tagValue]);
        }
        e.target.value = '';
      }
    }
  };

  const removeTag = (tagToRemove) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading categories..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">
            {editMode ? 'Edit Feedback' : 'Submit New Feedback'}
          </h1>
          <p className="text-primary-100 mt-1">
            {editMode 
              ? 'Update your feedback details below'
              : 'Help us improve by sharing your feedback'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="form-label">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 5, message: 'Title must be at least 5 characters' },
                maxLength: { value: 200, message: 'Title cannot exceed 200 characters' }
              })}
              type="text"
              className="form-input"
              placeholder="Brief description of your feedback"
            />
            {errors.title && (
              <p className="form-error">{errors.title.message}</p>
            )}
          </div>

          {/* Category and Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="form-label">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="form-select"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="form-error">{errors.categoryId.message}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="form-label">Priority</label>
              <select
                {...register('priority')}
                className="form-select"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="form-label">
              Feedback Content <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('content', {
                required: 'Content is required',
                minLength: { value: 10, message: 'Content must be at least 10 characters' },
                maxLength: { value: 5000, message: 'Content cannot exceed 5000 characters' }
              })}
              className="form-textarea h-32"
              placeholder="Please provide detailed feedback..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content && (
                <p className="form-error">{errors.content.message}</p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {watchedContent?.length || 0}/5000 characters
              </p>
            </div>
          </div>

          {/* Rating and Public Toggle Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating */}
            <div>
              <label className="form-label">Rating (Optional)</label>
              <select
                {...register('rating')}
                className="form-select"
              >
                <option value="">No rating</option>
                <option value="1">⭐ 1 - Poor</option>
                <option value="2">⭐⭐ 2 - Fair</option>
                <option value="3">⭐⭐⭐ 3 - Good</option>
                <option value="4">⭐⭐⭐⭐ 4 - Very Good</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
              </select>
            </div>

            {/* Public Toggle */}
            <div>
              <label className="form-label">Visibility</label>
              <div className="flex items-center space-x-3 mt-2">
                <label className="flex items-center">
                  <input
                    {...register('isPublic')}
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Make this feedback public
                  </span>
                </label>
              </div>
              <p className="form-help">
                Public feedback may be displayed on our website
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">Tags (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Type tags and press Enter or comma to add"
              onKeyDown={handleTagInput}
            />
            {watchedTags && watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {watchedTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="form-help">
              Add relevant tags to help categorize your feedback
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="btn-primary flex-1 sm:flex-none px-8 py-3"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <LoadingSpinner size="small" color="white" className="mr-2" />
                  {editMode ? 'Updating...' : 'Submitting...'}
                </div>
              ) : (
                editMode ? 'Update Feedback' : 'Submit Feedback'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/feedback')}
              className="btn-outline px-8 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          💡 Tips for Better Feedback
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Be specific about the issue or suggestion
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Include steps to reproduce if reporting a bug
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Mention your device/browser if relevant
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Use tags to help us categorize your feedback
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackForm;
