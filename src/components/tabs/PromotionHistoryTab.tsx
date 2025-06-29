'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaCheck } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';

interface PromotionRecord {
  id: number;
  fromPosition: string | null;
  toPosition: string;
  fromSalaryGrade: string | null;
  toSalaryGrade: string | null;
  effectiveDate: string;
  promotionType: string | null;
  remarks: string | null;
  approvedBy: string | null;
  approvedByDisplay?: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface PromotionHistoryTabProps {
  employeeId: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const PromotionHistoryTab: React.FC<PromotionHistoryTabProps> = ({ employeeId }) => {
  const { user } = useUser();
  const [promotionHistory, setPromotionHistory] = useState<PromotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PromotionRecord | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is admin
  const userRole = user?.publicMetadata?.role?.toString().toLowerCase();
  const isAdmin = userRole?.includes('admin') || userRole?.includes('super admin') || userRole?.includes('superadmin');

  const [formData, setFormData] = useState({
    fromPosition: '',
    toPosition: '',
    fromSalaryGrade: '',
    toSalaryGrade: '',
    effectiveDate: '',
    promotionType: '',
    remarks: '',
    approvedBy: ''
  });

  const promotionTypes = [
    'Promotion',
    'Transfer',
    'Salary Adjustment',
    'Position Change',
    'Re-classification',
    'Other'
  ];

  useEffect(() => {
    if (employeeId) {
      fetchPromotionHistory();
    }
  }, [employeeId]);

  const fetchPromotionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/${employeeId}/promotion-history`);
      
      if (response.ok) {
        const data = await response.json();
        // Transform the data to convert Date objects to strings
        const transformedData = (data || []).map((record: any) => ({
          ...record,
          effectiveDate: record.effectiveDate instanceof Date 
            ? record.effectiveDate.toISOString() 
            : typeof record.effectiveDate === 'string' 
              ? record.effectiveDate 
              : new Date(record.effectiveDate).toISOString(),
          createdAt: record.createdAt instanceof Date 
            ? record.createdAt.toISOString() 
            : typeof record.createdAt === 'string' 
              ? record.createdAt 
              : new Date(record.createdAt).toISOString(),
          updatedAt: record.updatedAt instanceof Date 
            ? record.updatedAt.toISOString() 
            : typeof record.updatedAt === 'string' 
              ? record.updatedAt 
              : record.updatedAt ? new Date(record.updatedAt).toISOString() : null
        }));
        
        setPromotionHistory(transformedData);
      } else {
        const errorData = await response.json();
        setNotification({
          type: 'error',
          message: errorData.error || 'Failed to fetch promotion history'
        });
      }
    } catch (error) {
      console.error('Error fetching promotion history:', error);
      setNotification({
        type: 'error',
        message: 'An error occurred while fetching promotion history'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = () => {
    setEditingRecord(null);
    setFormData({
      fromPosition: '',
      toPosition: '',
      fromSalaryGrade: '',
      toSalaryGrade: '',
      effectiveDate: '',
      promotionType: '',
      remarks: '',
      approvedBy: ''
    });
    setIsModalOpen(true);
  };

  const handleEditRecord = (record: PromotionRecord) => {
    setEditingRecord(record);
    setFormData({
      fromPosition: record.fromPosition || '',
      toPosition: record.toPosition || '',
      fromSalaryGrade: record.fromSalaryGrade || '',
      toSalaryGrade: record.toSalaryGrade || '',
      effectiveDate: record.effectiveDate.split('T')[0], // Format date for input
      promotionType: record.promotionType || '',
      remarks: record.remarks || '',
      approvedBy: record.approvedBy || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;
      
      if (editingRecord) {
        response = await fetch(`/api/employees/${employeeId}/promotion-history/${editingRecord.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch(`/api/employees/${employeeId}/promotion-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      if (response.ok) {
        setNotification({
          type: 'success',
          message: editingRecord ? 'Promotion record updated successfully!' : 'Promotion record added successfully!'
        });
        setIsModalOpen(false);
        fetchPromotionHistory(); // Refresh the list
      } else {
        const errorData = await response.json();
        setNotification({
          type: 'error',
          message: errorData.error || 'Failed to save promotion record'
        });
      }
    } catch (error) {
      console.error('Error saving promotion record:', error);
      setNotification({
        type: 'error',
        message: 'An error occurred while saving the promotion record'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Are you sure you want to delete this promotion record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/employees/${employeeId}/promotion-history/${recordId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Promotion record deleted successfully!'
        });
        fetchPromotionHistory(); // Refresh the list
      } else {
        const errorData = await response.json();
        setNotification({
          type: 'error',
          message: errorData.error || 'Failed to delete promotion record'
        });
      }
    } catch (error) {
      console.error('Error deleting promotion record:', error);
      setNotification({
        type: 'error',
        message: 'An error occurred while deleting the promotion record'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Promotion History at SJSFI</h3>
        {isAdmin && (
          <button
            onClick={handleAddRecord}
            className="bg-[#800000] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <FaPlus className="w-4 h-4" />
            Add Promotion Record
          </button>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <FaCheck className="w-5 h-5 mr-2" />
            ) : (
              <FaTimes className="w-5 h-5 mr-2" />
            )}
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Promotion History List */}
      {promotionHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No promotion history records found.</p>
          {isAdmin && (
            <p className="text-sm text-gray-400 mt-2">Click "Add Promotion Record" to create the first record.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {promotionHistory.map((record) => (
            <div key={record.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Position</label>
                  <p className="mt-1 text-sm text-gray-900">{record.fromPosition || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Position</label>
                  <p className="mt-1 text-sm text-gray-900">{record.toPosition}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(record.effectiveDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Salary Grade</label>
                  <p className="mt-1 text-sm text-gray-900">{record.fromSalaryGrade || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Salary Grade</label>
                  <p className="mt-1 text-sm text-gray-900">{record.toSalaryGrade || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Promotion Type</label>
                  <p className="mt-1 text-sm text-gray-900">{record.promotionType || 'N/A'}</p>
                </div>
                {record.remarks && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Remarks</label>
                    <p className="mt-1 text-sm text-gray-900">{record.remarks}</p>
                  </div>
                )}
                {(record.approvedBy || record.approvedByDisplay) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Approved By</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {record.approvedByDisplay || record.approvedBy || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditRecord(record)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <FaEdit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    className="text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <FaTrash className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingRecord ? 'Edit Promotion Record' : 'Add Promotion Record'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Position</label>
                  <input
                    type="text"
                    value={formData.fromPosition}
                    onChange={(e) => setFormData({ ...formData, fromPosition: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Previous position (if applicable)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Position <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.toPosition}
                    onChange={(e) => setFormData({ ...formData, toPosition: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="New position"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">From Salary Grade</label>
                  <input
                    type="text"
                    value={formData.fromSalaryGrade}
                    onChange={(e) => setFormData({ ...formData, fromSalaryGrade: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Previous salary grade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">To Salary Grade</label>
                  <input
                    type="text"
                    value={formData.toSalaryGrade}
                    onChange={(e) => setFormData({ ...formData, toSalaryGrade: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="New salary grade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Promotion Type</label>
                  <select
                    value={formData.promotionType}
                    onChange={(e) => setFormData({ ...formData, promotionType: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  >
                    <option value="">Select type</option>
                    {promotionTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Approved By</label>
                  <input
                    type="text"
                    value={formData.approvedBy}
                    onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    placeholder="Name of approving authority"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  rows={3}
                  placeholder="Additional notes or reasons for the promotion"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-red-800 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? (editingRecord ? 'Updating...' : 'Adding...') 
                    : (editingRecord ? 'Update Record' : 'Add Record')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionHistoryTab; 