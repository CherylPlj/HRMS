'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pen, Trash2, X, Check, Save } from 'lucide-react';

interface DocumentType {
  DocumentTypeID: number;
  DocumentTypeName: string;
  AllowedFileTypes: string[] | null;
  Template: string | null;
}

interface ManageDocumentTypesProps {
  documentTypes: DocumentType[];
  onUpdate: () => void; // Callback to refresh document types
}

// Validation function
const validateDocTypeName = (value: string, existingTypes: DocumentType[], excludeId?: number): string | null => {
  if (!value.trim()) {
    return 'Document type name is required.';
  }
  if (value.length < 3) {
    return 'Document type name must be at least 3 characters long.';
  }
  if (value.length > 50) {
    return 'Document type name must not exceed 50 characters.';
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
    return 'Only letters, numbers, spaces, hyphens, and underscores are allowed.';
  }
  if (/(.)\1{3,}/.test(value.replace(/ /g, ''))) {
    return 'No more than three repeated characters or symbols in a row.';
  }
  // Check for uniqueness (excluding the current item if editing)
  const existingNames = existingTypes
    .filter(dt => !excludeId || dt.DocumentTypeID !== excludeId)
    .map(dt => dt.DocumentTypeName.toLowerCase());
  if (existingNames.includes(value.trim().toLowerCase())) {
    return 'Document type name must be unique.';
  }
  return null;
};

const ManageDocumentTypes: React.FC<ManageDocumentTypesProps> = ({ documentTypes, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  
  // Add state
  const [newTypes, setNewTypes] = useState<string[]>(['']);
  const [addErrors, setAddErrors] = useState<{ [key: number]: string | null }>({});
  const [isAdding, setIsAdding] = useState(false);
  
  // Edit state
  const [editingTypes, setEditingTypes] = useState<{ [key: number]: string }>({});
  const [editErrors, setEditErrors] = useState<{ [key: number]: string | null }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  
  // Delete state
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [typesToDelete, setTypesToDelete] = useState<DocumentType[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isModalOpen) {
      setMode('view');
      setNewTypes(['']);
      setAddErrors({});
      setEditingTypes({});
      setEditErrors({});
      setSelectedTypes([]);
      setHasEdits(false);
    }
  }, [isModalOpen]);

  // Initialize editing types when entering edit mode
  useEffect(() => {
    if (mode === 'edit') {
      const initialEdits: { [key: number]: string } = {};
      documentTypes.forEach(dt => {
        initialEdits[dt.DocumentTypeID] = dt.DocumentTypeName;
      });
      setEditingTypes(initialEdits);
      setEditErrors({});
      setHasEdits(false);
    }
  }, [mode, documentTypes]);

  // Check if there are edits
  useEffect(() => {
    if (mode === 'edit') {
      const hasChanges = documentTypes.some(dt => {
        const editedValue = editingTypes[dt.DocumentTypeID];
        return editedValue !== undefined && editedValue !== dt.DocumentTypeName;
      });
      setHasEdits(hasChanges);
    }
  }, [editingTypes, documentTypes, mode]);

  // Handle Add Mode
  const handleAddNewInput = () => {
    setNewTypes([...newTypes, '']);
  };

  const handleRemoveAddInput = (index: number) => {
    if (newTypes.length > 1) {
      const updated = newTypes.filter((_, i) => i !== index);
      setNewTypes(updated);
      const updatedErrors = { ...addErrors };
      delete updatedErrors[index];
      setAddErrors(updatedErrors);
    }
  };

  const handleNewTypeChange = (index: number, value: string) => {
    const updated = [...newTypes];
    updated[index] = value;
    setNewTypes(updated);
    
    // Validate - check against existing types and other new types
    let error = validateDocTypeName(value, documentTypes);
    
    // Check for duplicates within new types
    if (!error && value.trim()) {
      const duplicateIndex = updated.findIndex((v, i) => i !== index && v.trim().toLowerCase() === value.trim().toLowerCase());
      if (duplicateIndex !== -1) {
        error = 'This name is already in the list above.';
      }
    }
    
    setAddErrors(prev => ({ ...prev, [index]: error }));
  };

  const handleAddTypes = async () => {
    // Validate all inputs
    const errors: { [key: number]: string | null } = {};
    let hasError = false;
    
    newTypes.forEach((value, index) => {
      if (value.trim()) {
        const error = validateDocTypeName(value, documentTypes);
        errors[index] = error;
        if (error) hasError = true;
      }
    });

    if (hasError) {
      setAddErrors(errors);
      return;
    }

    // Filter out empty inputs
    const typesToAdd = newTypes.filter(v => v.trim());
    if (typesToAdd.length === 0) {
      return;
    }

    setIsAdding(true);
    try {
      const promises = typesToAdd.map(typeName =>
        fetch('/api/document-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ DocumentTypeName: typeName.trim() }),
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        throw new Error(`Failed to add ${failed.length} document type(s)`);
      }

      // Reset and refresh
      setNewTypes(['']);
      setAddErrors({});
      setMode('view');
      onUpdate();
    } catch (error) {
      console.error('Error adding document types:', error);
      alert(error instanceof Error ? error.message : 'Failed to add document types');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Edit Mode
  const handleEditTypeChange = (id: number, value: string) => {
    setEditingTypes(prev => {
      const updated = { ...prev, [id]: value };
      
      // Validate - check against existing types (excluding current) and other edited values
      let error = validateDocTypeName(value, documentTypes, id);
      
      // Check for duplicates within edited types
      if (!error && value.trim()) {
        const duplicateId = Object.entries(updated).find(
          ([otherId, otherValue]) => Number(otherId) !== id && otherValue.trim().toLowerCase() === value.trim().toLowerCase()
        );
        if (duplicateId) {
          error = 'This name is already used by another document type.';
        }
      }
      
      setEditErrors(prevErrors => ({ ...prevErrors, [id]: error }));
      return updated;
    });
  };

  const handleSaveEdits = async () => {
    // Validate all edits
    const errors: { [key: number]: string | null } = {};
    let hasError = false;

    Object.entries(editingTypes).forEach(([id, value]) => {
      const error = validateDocTypeName(value, documentTypes, Number(id));
      if (error) {
        errors[Number(id)] = error;
        hasError = true;
      }
    });

    if (hasError) {
      setEditErrors(errors);
      return;
    }

    // Find only the types that were actually changed
    const typesToUpdate = documentTypes.filter(dt => {
      const editedValue = editingTypes[dt.DocumentTypeID];
      return editedValue !== undefined && editedValue !== dt.DocumentTypeName;
    });

    if (typesToUpdate.length === 0) {
      setMode('view');
      return;
    }

    setIsSaving(true);
    try {
      const promises = typesToUpdate.map(dt =>
        fetch(`/api/document-types/${dt.DocumentTypeID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ DocumentTypeName: editingTypes[dt.DocumentTypeID] }),
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} document type(s)`);
      }

      // Reset and refresh
      setMode('view');
      setEditingTypes({});
      setEditErrors({});
      setHasEdits(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating document types:', error);
      alert(error instanceof Error ? error.message : 'Failed to update document types');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setMode('view');
    setEditingTypes({});
    setEditErrors({});
    setHasEdits(false);
  };

  // Handle Delete
  const handleSelectType = (id: number) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === documentTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(documentTypes.map(dt => dt.DocumentTypeID));
    }
  };

  const handleDeleteClick = () => {
    if (selectedTypes.length === 0) return;
    
    const toDelete = documentTypes.filter(dt => selectedTypes.includes(dt.DocumentTypeID));
    setTypesToDelete(toDelete);
    setDeleteConfirmation('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedTypes.length === 0) return;

    setIsDeleting(true);
    try {
      // Check if any document types are referenced
      const checkPromises = typesToDelete.map(dt =>
        fetch(`/api/faculty-documents?documentTypeId=${dt.DocumentTypeID}`)
      );
      const checkResults = await Promise.all(checkPromises);
      const checkData = await Promise.all(checkResults.map(r => r.json()));
      
      const referenced = typesToDelete.filter((dt, idx) => 
        Array.isArray(checkData[idx]) && checkData[idx].length > 0
      );

      if (referenced.length > 0) {
        alert(`Cannot delete: ${referenced.map(dt => dt.DocumentTypeName).join(', ')} - these types are in use.`);
        setIsDeleting(false);
        setShowDeleteModal(false);
        return;
      }

      // Delete all selected types
      const deletePromises = selectedTypes.map(id =>
        fetch(`/api/document-types/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} document type(s)`);
      }

      // Reset and refresh
      setSelectedTypes([]);
      setShowDeleteModal(false);
      setTypesToDelete([]);
      setDeleteConfirmation('');
      onUpdate();
    } catch (error) {
      console.error('Error deleting document types:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete document types');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-300 border border-gray-300"
        title="Manage Document Types"
        type="button"
      >
        <Settings size={16} /> Manage Document Types
      </button>

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Manage Document Types</h2>
              <div className="flex items-center gap-2">
                {/* Mode Buttons */}
                {mode === 'view' && (
                  <>
                    <button
                      onClick={() => setMode('add')}
                      className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
                      title="Add Document Types"
                    >
                      <Plus size={16} /> Add
                    </button>
                    <button
                      onClick={() => setMode('edit')}
                      className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                      title="Edit Document Types"
                    >
                      <Pen size={16} /> Edit
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      disabled={selectedTypes.length === 0}
                      className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Selected Document Types"
                    >
                      <Trash2 size={16} /> Delete ({selectedTypes.length})
                    </button>
                  </>
                )}
                {mode === 'add' && (
                  <>
                    <button
                      onClick={handleAddTypes}
                      disabled={isAdding || newTypes.every(v => !v.trim())}
                      className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check size={16} /> Save
                    </button>
                    <button
                      onClick={() => {
                        setMode('view');
                        setNewTypes(['']);
                        setAddErrors({});
                      }}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {mode === 'edit' && (
                  <>
                    <button
                      onClick={handleSaveEdits}
                      disabled={isSaving || !hasEdits}
                      className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save size={16} /> Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setMode('view');
                  }}
                  className="text-gray-400 hover:text-gray-700 focus:outline-none"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Add Mode */}
              {mode === 'add' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Add New Document Types</h3>
                    <p className="text-sm text-gray-600">You can add multiple document types at once.</p>
                  </div>
                  {newTypes.map((value, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleNewTypeChange(index, e.target.value)}
                          placeholder={`Document Type ${index + 1}`}
                          className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base ${
                            addErrors[index] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          maxLength={50}
                        />
                        {addErrors[index] && (
                          <div className="text-red-600 text-xs mt-1">{addErrors[index]}</div>
                        )}
                      </div>
                      {newTypes.length > 1 && (
                        <button
                          onClick={() => handleRemoveAddInput(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Remove"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddNewInput}
                    className="text-[#800000] hover:text-red-800 flex items-center gap-2 text-sm font-medium"
                  >
                    <Plus size={16} /> Add Another
                  </button>
                </div>
              )}

              {/* Edit Mode */}
              {mode === 'edit' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Edit Document Types</h3>
                    <p className="text-sm text-gray-600">Edit the document types below. Only changed items will be saved.</p>
                  </div>
                  {documentTypes.map((dt) => (
                    <div key={dt.DocumentTypeID} className="flex items-start gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editingTypes[dt.DocumentTypeID] || dt.DocumentTypeName}
                          onChange={(e) => handleEditTypeChange(dt.DocumentTypeID, e.target.value)}
                          className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base ${
                            editErrors[dt.DocumentTypeID] ? 'border-red-500' : 'border-gray-300'
                          } ${
                            editingTypes[dt.DocumentTypeID] !== dt.DocumentTypeName ? 'bg-blue-50' : ''
                          }`}
                          maxLength={50}
                        />
                        {editErrors[dt.DocumentTypeID] && (
                          <div className="text-red-600 text-xs mt-1">{editErrors[dt.DocumentTypeID]}</div>
                        )}
                      </div>
                      {editingTypes[dt.DocumentTypeID] !== dt.DocumentTypeName && (
                        <span className="text-blue-600 text-sm mt-2">Modified</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* View Mode */}
              {mode === 'view' && (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Select document types to delete, or use Add/Edit buttons to manage them.</p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedTypes.length === documentTypes.length && documentTypes.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Document Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {documentTypes.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                              No document types found.
                            </td>
                          </tr>
                        ) : (
                          documentTypes.map((dt) => (
                            <tr
                              key={dt.DocumentTypeID}
                              className={`hover:bg-gray-50 ${selectedTypes.includes(dt.DocumentTypeID) ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTypes.includes(dt.DocumentTypeID)}
                                  onChange={() => handleSelectType(dt.DocumentTypeID)}
                                  className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800">{dt.DocumentTypeName}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Confirm Delete</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800 mb-2">
                  Are you sure you want to delete {typesToDelete.length} document type(s)?
                </p>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {typesToDelete.map(dt => (
                    <li key={dt.DocumentTypeID}>{dt.DocumentTypeName}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageDocumentTypes;

