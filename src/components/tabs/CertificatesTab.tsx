import React, { useState, useEffect } from 'react';
import { Plus, Pen, Trash2, Download, X } from 'lucide-react';
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
    <div className="space-y-4 md:space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-3 md:p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center text-sm md:text-base">
            <p>{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-current hover:opacity-70 p-1"
          >
            <X size={16} className="md:w-6 md:h-6" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base md:text-lg font-bold text-gray-900 uppercase tracking-wide">Certificates & Awards</h3>
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
            className="w-full sm:w-auto bg-[#800000] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-800 transition-colors text-sm md:text-base"
          >
            <Plus size={16} /> Add Certificate
          </button>
        )}
      </div>

      {/* List of certificates */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {certificates.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No certificates found.</p>
          </div>
        ) : (
          certificates.map((certificate) => (
            <div key={certificate.id} className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{certificate.title}</h4>
                    <span className="text-[10px] md:text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                      {new Date(certificate.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-700 mt-1 font-medium">{certificate.issuedBy}</p>
                  {certificate.expiryDate && (
                    <p className="text-[10px] md:text-xs text-red-600 mt-1">
                      Expires: {new Date(certificate.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                  {certificate.description && (
                    <p className="text-xs md:text-sm text-gray-500 mt-2 line-clamp-2 italic">{certificate.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {certificate.fileUrl && (
                    <a
                      href={certificate.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Download"
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
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pen size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(certificate.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">
                {currentCertificate.id ? 'Edit Certificate' : 'Add Certificate'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentCertificate(null);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentCertificate.title}
                    onChange={(e) =>
                      setCurrentCertificate({ ...currentCertificate, title: e.target.value })
                    }
                    placeholder="e.g. Certified Public Accountant"
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Issued By <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentCertificate.issuedBy}
                    onChange={(e) =>
                      setCurrentCertificate({
                        ...currentCertificate,
                        issuedBy: e.target.value,
                      })
                    }
                    placeholder="e.g. Professional Regulation Commission"
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Issue Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={new Date(currentCertificate.issueDate).toISOString().split('T')[0]}
                      onChange={(e) =>
                        setCurrentCertificate({
                          ...currentCertificate,
                          issueDate: new Date(e.target.value),
                        })
                      }
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Expiry Date (Optional)</label>
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
                      className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <textarea
                    value={currentCertificate.description || ''}
                    onChange={(e) =>
                      setCurrentCertificate({
                        ...currentCertificate,
                        description: e.target.value,
                      })
                    }
                    placeholder="Briefly describe the significance of this certificate..."
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Upload Certificate (Optional)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#800000] transition-colors bg-gray-50">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-10 w-10 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-[#800000] hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#800000]"
                        >
                          <span>{selectedFile ? selectedFile.name : 'Upload a file'}</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                        </label>
                        {!selectedFile && <p className="pl-1">or drag and drop</p>}
                      </div>
                      <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentCertificate(null);
                      setSelectedFile(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-wide"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm transition-all uppercase tracking-wide flex items-center justify-center gap-2 ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#800000] hover:bg-red-800 hover:shadow-md'
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Certificate'
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