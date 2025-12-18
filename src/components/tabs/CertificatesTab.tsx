import React, { useState, useEffect } from 'react';
import { Plus, Pen, Trash2, Download } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { isAdmin } from '@/utils/roleUtils';

interface Certificate {
  id: number;
  employeeId: string;
  title: string;
  issuedBy: string;
  issueDate: Date;
  expiryDate?: Date | null;
  description?: string;
  fileUrl?: string;
}

interface CertificatesTabProps {
  employeeId: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const CertificatesTab: React.FC<CertificatesTabProps> = ({ employeeId }) => {
  const { user } = useUser();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCertificate, setCurrentCertificate] = useState<Certificate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setIsUserAdmin(isAdmin(user));
    }
  }, [user]);

  useEffect(() => {
    fetchCertificates();
  }, [employeeId]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchCertificates = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/certificates`);
      if (response.ok) {
        const data = await response.json();
        setCertificates(data);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load certificates. Please try again.'
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCertificate) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('data', JSON.stringify(currentCertificate));

      const url = `/api/employees/${employeeId}/certificates${currentCertificate.id ? `/${currentCertificate.id}` : ''}`;
      const method = currentCertificate.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (response.ok) {
        await fetchCertificates();
        setShowForm(false);
        setCurrentCertificate(null);
        setSelectedFile(null);
        
        // Show success message
        setNotification({
          type: 'success',
          message: currentCertificate.id 
            ? 'Certificate updated successfully!' 
            : 'Certificate added successfully!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save certificate');
      }
    } catch (error) {
      console.error('Error saving certificate:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save certificate. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/certificates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCertificates();
        setNotification({
          type: 'success',
          message: 'Certificate deleted successfully!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete certificate');
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete certificate. Please try again.'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Certificates</h3>
        {!isUserAdmin && (
          <button
            onClick={() => {
              setCurrentCertificate({
                id: 0,
                employeeId,
                title: '',
                issuedBy: '',
                issueDate: new Date(),
                expiryDate: null,
                description: '',
                fileUrl: '',
              });
              setShowForm(true);
            }}
            className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <Plus size={16} /> Add Certificate
          </button>
        )}
      </div>

      {/* List of certificates */}
      <div className="grid grid-cols-1 gap-4">
        {certificates.map((certificate) => (
          <div key={certificate.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{certificate.title}</h4>
                <p className="text-sm text-gray-600">
                  Issued by: {certificate.issuedBy}
                </p>
                <p className="text-sm text-gray-600">
                  Issue Date: {new Date(certificate.issueDate).toLocaleDateString()}
                </p>
                {certificate.expiryDate && (
                  <p className="text-sm text-gray-600">
                    Expiry Date: {new Date(certificate.expiryDate).toLocaleDateString()}
                  </p>
                )}
                {certificate.description && (
                  <p className="text-sm text-gray-600 mt-1">{certificate.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {certificate.fileUrl && (
                  <a
                    href={certificate.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Download size={16} />
                  </a>
                )}
                {!isUserAdmin && (
                  <>
                    <button
                      onClick={() => {
                        setCurrentCertificate(certificate);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pen size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(certificate.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {currentCertificate.id ? 'Edit Certificate' : 'Add Certificate'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentCertificate(null);
                  setSelectedFile(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentCertificate.title}
                    onChange={(e) =>
                      setCurrentCertificate({ ...currentCertificate, title: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issued By <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentCertificate.issuedBy}
                    onChange={(e) =>
                      setCurrentCertificate({
                        ...currentCertificate,
                        issuedBy: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issue Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={new Date(currentCertificate.issueDate).toISOString().split('T')[0]}
                    onChange={(e) =>
                      setCurrentCertificate({
                        ...currentCertificate,
                        issueDate: new Date(e.target.value),
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={currentCertificate.expiryDate
                      ? new Date(currentCertificate.expiryDate).toISOString().split('T')[0]
                      : ''}
                    onChange={(e) =>
                      setCurrentCertificate({
                        ...currentCertificate,
                        expiryDate: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    value={currentCertificate.description || ''}
                    onChange={(e) =>
                      setCurrentCertificate({
                        ...currentCertificate,
                        description: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload Certificate (Optional)</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="mt-1 w-full"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentCertificate(null);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesTab; 