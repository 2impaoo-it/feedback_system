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
      toast.error('Không thể tải danh mục');
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
    { value: 'low', label: 'Thấp', color: 'text-green-600' },
    { value: 'medium', label: 'Trung bình', color: 'text-yellow-600' },
    { value: 'high', label: 'Cao', color: 'text-orange-600' },
    { value: 'urgent', label: 'Khẩn cấp', color: 'text-red-600' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <LoadingSpinner size="large" text="Đang tải danh mục..." />
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
            {editMode ? 'Chỉnh sửa phản hồi' : 'Gửi phản hồi mới'}
          </h1>
          <p className="text-primary-100 mt-1">
            {editMode 
              ? 'Cập nhật thông tin phản hồi bên dưới'
              : 'Giúp chúng tôi cải thiện bằng cách chia sẻ phản hồi của bạn'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="form-label">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', {
                required: 'Tiêu đề là bắt buộc',
                minLength: { value: 5, message: 'Tiêu đề phải có ít nhất 5 ký tự' },
                maxLength: { value: 200, message: 'Tiêu đề không được vượt quá 200 ký tự' }
              })}
              type="text"
              className="form-input"
              placeholder="Mô tả ngắn gọn về phản hồi của bạn"
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
                Danh mục <span className="text-red-500">*</span>
              </label>
              <select
                {...register('categoryId', { required: 'Danh mục là bắt buộc' })}
                className="form-select"
              >
                <option value="">Chọn danh mục</option>
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
              <label className="form-label">Mức độ ưu tiên</label>
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
              Nội dung phản hồi <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('content', {
                required: 'Nội dung là bắt buộc',
                minLength: { value: 10, message: 'Nội dung phải có ít nhất 10 ký tự' },
                maxLength: { value: 5000, message: 'Nội dung không được vượt quá 5000 ký tự' }
              })}
              className="form-textarea h-32"
              placeholder="Vui lòng cung cấp phản hồi chi tiết..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content && (
                <p className="form-error">{errors.content.message}</p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {watchedContent?.length || 0}/5000 ký tự
              </p>
            </div>
          </div>

          {/* Rating and Public Toggle Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating */}
            <div>
              <label className="form-label">Đánh giá (Tùy chọn)</label>
              <select
                {...register('rating')}
                className="form-select"
              >
                <option value="">Không đánh giá</option>
                <option value="1">⭐ 1 - Kém</option>
                <option value="2">⭐⭐ 2 - Tạm được</option>
                <option value="3">⭐⭐⭐ 3 - Tốt</option>
                <option value="4">⭐⭐⭐⭐ 4 - Rất tốt</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 - Xuất sắc</option>
              </select>
            </div>

            {/* Public Toggle */}
            <div>
              <label className="form-label">Hiển thị</label>
              <div className="flex items-center space-x-3 mt-2">
                <label className="flex items-center">
                  <input
                    {...register('isPublic')}
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Hiển thị công khai phản hồi này
                  </span>
                </label>
              </div>
              <p className="form-help">
                Phản hồi công khai có thể được hiển thị trên website
              </p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">Thẻ (Tùy chọn)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập thẻ và nhấn Enter hoặc dấu phẩy để thêm"
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
              Thêm thẻ liên quan để giúp phân loại phản hồi của bạn
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
                  {editMode ? 'Đang cập nhật...' : 'Đang gửi...'}
                </div>
              ) : (
                editMode ? 'Cập nhật phản hồi' : 'Gửi phản hồi'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/feedback')}
              className="btn-outline px-8 py-3"
            >
              Hủy
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
          💡 Mẹo cho phản hồi tốt hơn
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Mô tả cụ thể về vấn đề hoặc đề xuất
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Bao gồm các bước tái tạo nếu báo cáo lỗi
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Đề cập thiết bị/trình duyệt nếu có liên quan
          </li>
          <li className="flex items-start">
            <span className="text-blue-600 mr-2">•</span>
            Sử dụng thẻ để giúp chúng tôi phân loại phản hồi
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
};

export default FeedbackForm;
