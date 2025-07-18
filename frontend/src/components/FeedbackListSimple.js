import React, { useState, useEffect } from 'react';
import { feedbackAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const FeedbackListSimple = ({ user }) => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      console.log('Fetching feedback for user:', user);
      
      const response = await feedbackAPI.getAll({});
      console.log('Feedback API response:', response);
      
      if (response && response.success) {
        const data = response.data || [];
        console.log('Setting feedback data:', data);
        setFeedback(Array.isArray(data) ? data : []);
      } else {
        console.log('API call failed:', response);
        setError('Failed to fetch feedback');
        setFeedback([]);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setError('Failed to fetch feedback');
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Feedback List (Debug Version)
        </h3>
        
        <div className="mb-4 text-sm text-gray-600">
          <p>User: {user?.email || 'Not logged in'}</p>
          <p>Role: {user?.role || 'No role'}</p>
          <p>Feedback count: {feedback?.length || 0}</p>
          <p>Feedback is array: {Array.isArray(feedback).toString()}</p>
        </div>

        {Array.isArray(feedback) && feedback.length > 0 ? (
          <div className="space-y-4">
            {feedback.map((item, index) => (
              <div key={item._id || index} className="border rounded p-4">
                <h4 className="font-medium">{item.title || 'No title'}</h4>
                <p className="text-sm text-gray-600">{item.content || 'No content'}</p>
                <div className="mt-2 text-xs text-gray-500">
                  Status: {item.status || 'No status'} | 
                  Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No date'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No feedback found
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackListSimple;
