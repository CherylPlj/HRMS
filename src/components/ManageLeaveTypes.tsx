'use client';

import React, { useState, useEffect } from 'react';
import { FaCog, FaPlus, FaPen, FaTrash, FaTimes, FaCheck, FaSave } from 'react-icons/fa';

interface LeaveType {
  LeaveTypeID: number;
  LeaveTypeName: string;
  NumberOfDays?: number | null;
  IsActive?: boolean;
}

interface ManageLeaveTypesProps {
  leaveTypes: LeaveType[];
  onUpdate: () => void; // Callback to refresh leave types
}

// Validation function
const validateLeaveTypeName = (value: string, existingTypes: LeaveType[], excludeId?: number): string | null => {
  if (!value.trim()) {
    return 'Leave type name is required.';
  }
  if (value.length < 3) {
    return 'Leave type name must be at least 3 characters long.';
  }
  if (value.length > 50) {
    return 'Leave type name must not exceed 50 characters.';
  }
  if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
    return 'Only letters, numbers, and spaces are allowed.';
  }
  // Check for uniqueness (excluding the current item if editing)
  const existingNames = existingTypes
    .filter(lt => !excludeId || lt.LeaveTypeID !== excludeId)
    .map(lt => lt.LeaveTypeName.toLowerCase());
  if (existingNames.includes(value.trim().toLowerCase())) {
    return 'Leave type name must be unique.';
  }
  return null;
};

const ManageLeaveTypes: React.FC<ManageLeaveTypesProps> = ({ leaveTypes, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  
  // Add state
  const [newTypes, setNewTypes] = useState<Array<{ name: string; days: string }>>([{ name: '', days: '' }]);
  const [addErrors, setAddErrors] = useState<{ [key: number]: string | null }>({});
  const [isAdding, setIsAdding] = useState(false);
  
  // Edit state
  const [editingTypes, setEditingTypes] = useState<{ [key: number]: { name: string; days: string } }>({});
  const [editErrors, setEditErrors] = useState<{ [key: number]: string | null }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  
  // Delete state
  const [selectedTypes, setSelectedTypes] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [typesToDelete, setTypesToDelete] = useState<LeaveType[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isModalOpen) {
      setMode('view');
      setNewTypes([{ name: '', days: '' }]);
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
      const initialEdits: { [key: number]: { name: string; days: string } } = {};
      leaveTypes.forEach(lt => {
        initialEdits[lt.LeaveTypeID] = {
          name: lt.LeaveTypeName,
          days: lt.NumberOfDays?.toString() || ''
        };
      });
      setEditingTypes(initialEdits);
      setEditErrors({});
      setHasEdits(false);
    }
  }, [mode, leaveTypes]);

  // Check if there are edits
  useEffect(() => {
    if (mode === 'edit') {
      const hasChanges = leaveTypes.some(lt => {
        const edited = editingTypes[lt.LeaveTypeID];
        if (!edited) return false;
        const daysChanged = edited.days !== (lt.NumberOfDays?.toString() || '');
        const nameChanged = edited.name !== lt.LeaveTypeName;
        return nameChanged || daysChanged;
      });
      setHasEdits(hasChanges);
    }
  }, [editingTypes, leaveTypes, mode]);

  // Handle Add Mode
  const handleAddNewInput = () => {
    setNewTypes([...newTypes, { name: '', days: '' }]);
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

  const handleNewTypeChange = (index: number, field: 'name' | 'days', value: string) => {
    const updated = [...newTypes];
    updated[index] = { ...updated[index], [field]: value };
    setNewTypes(updated);
    
    // Validate name field
    if (field === 'name') {
      let error = validateLeaveTypeName(value, leaveTypes);
      
      // Check for duplicates within new types
      if (!error && value.trim()) {
        const duplicateIndex = updated.findIndex((v, i) => i !== index && v.name.trim().toLowerCase() === value.trim().toLowerCase());
        if (duplicateIndex !== -1) {
          error = 'This name is already in the list above.';
        }
      }
      
      setAddErrors(prev => ({ ...prev, [index]: error }));
    }
  };

  const handleAddTypes = async () => {
    // Validate all inputs
    const errors: { [key: number]: string | null } = {};
    let hasError = false;
    
    newTypes.forEach((item, index) => {
      if (item.name.trim()) {
        const error = validateLeaveTypeName(item.name, leaveTypes);
        errors[index] = error;
        if (error) hasError = true;
      }
    });

    if (hasError) {
      setAddErrors(errors);
      return;
    }

    // Filter out empty inputs
    const typesToAdd = newTypes.filter(v => v.name.trim());
    if (typesToAdd.length === 0) {
      return;
    }

    setIsAdding(true);
    try {
      const promises = typesToAdd.map(item =>
        fetch('/api/leave-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            LeaveTypeName: item.name.trim(),
            NumberOfDays: item.days.trim() === '' ? null : Number(item.days)
          }),
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorMessages = await Promise.all(failed.map(r => r.text()));
        throw new Error(`Failed to add ${failed.length} leave type(s): ${errorMessages.join(', ')}`);
      }

      // Reset and refresh
      setNewTypes([{ name: '', days: '' }]);
      setAddErrors({});
      setMode('view');
      onUpdate();
    } catch (error) {
      console.error('Error adding leave types:', error);
      alert(error instanceof Error ? error.message : 'Failed to add leave types');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Edit Mode
  const handleEditTypeChange = (id: number, field: 'name' | 'days', value: string) => {
    setEditingTypes(prev => {
      const updated = { ...prev, [id]: { ...prev[id], [field]: value } };
      
      // Validate name field
      if (field === 'name') {
        let error = validateLeaveTypeName(value, leaveTypes, id);
        
        // Check for duplicates within edited types
        if (!error && value.trim()) {
          const duplicateId = Object.entries(updated).find(
            ([otherId, otherValue]) => Number(otherId) !== id && otherValue.name.trim().toLowerCase() === value.trim().toLowerCase()
          );
          if (duplicateId) {
            error = 'This name is already used by another leave type.';
          }
        }
        
        setEditErrors(prevErrors => ({ ...prevErrors, [id]: error }));
      }
      
      return updated;
    });
  };

  const handleSaveEdits = async () => {
    // Validate all edits
    const errors: { [key: number]: string | null } = {};
    let hasError = false;

    Object.entries(editingTypes).forEach(([id, edited]) => {
      const error = validateLeaveTypeName(edited.name, leaveTypes, Number(id));
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
    const typesToUpdate = leaveTypes.filter(lt => {
      const edited = editingTypes[lt.LeaveTypeID];
      if (!edited) return false;
      const nameChanged = edited.name !== lt.LeaveTypeName;
      const daysChanged = edited.days !== (lt.NumberOfDays?.toString() || '');
      return nameChanged || daysChanged;
    });

    if (typesToUpdate.length === 0) {
      setMode('view');
      return;
    }

    setIsSaving(true);
    try {
      const promises = typesToUpdate.map(lt => {
        const edited = editingTypes[lt.LeaveTypeID];
        return fetch(`/api/leave-types/${lt.LeaveTypeID}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            LeaveTypeName: edited.name.trim(),
            NumberOfDays: edited.days.trim() === '' ? null : Number(edited.days)
          }),
        });
      });

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorMessages = await Promise.all(failed.map(r => r.text()));
        throw new Error(`Failed to update ${failed.length} leave type(s): ${errorMessages.join(', ')}`);
      }

      // Reset and refresh
      setMode('view');
      setEditingTypes({});
      setEditErrors({});
      setHasEdits(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating leave types:', error);
      alert(error instanceof Error ? error.message : 'Failed to update leave types');
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
    if (selectedTypes.length === leaveTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(leaveTypes.map(lt => lt.LeaveTypeID));
    }
  };

  const handleDeleteClick = () => {
    if (selectedTypes.length === 0) return;
    
    const toDelete = leaveTypes.filter(lt => selectedTypes.includes(lt.LeaveTypeID));
    setTypesToDelete(toDelete);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedTypes.length === 0) return;

    setIsDeleting(true);
    try {
      // Check if any leave types are referenced
      const checkPromises = typesToDelete.map(lt =>
        fetch(`/api/leaves?leaveTypeId=${lt.LeaveTypeID}`)
      );
      const checkResults = await Promise.all(checkPromises);
      const checkData = await Promise.all(checkResults.map(r => r.json()));
      
      const referenced = typesToDelete.filter((lt, idx) => 
        Array.isArray(checkData[idx]) && checkData[idx].length > 0
      );

      if (referenced.length > 0) {
        alert(`Cannot delete: ${referenced.map(lt => lt.LeaveTypeName).join(', ')} - these types are in use.`);
        setIsDeleting(false);
        setShowDeleteModal(false);
        return;
      }

      // Delete all selected types
      const deletePromises = selectedTypes.map(id =>
        fetch(`/api/leave-types/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorMessages = await Promise.all(failed.map(r => r.text()));
        throw new Error(`Failed to delete ${failed.length} leave type(s): ${errorMessages.join(', ')}`);
      }

      // Reset and refresh
      setSelectedTypes([]);
      setShowDeleteModal(false);
      setTypesToDelete([]);
      onUpdate();
    } catch (error) {
      console.error('Error deleting leave types:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete leave types');
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
        title="Manage Leave Types"
        type="button"
      >
        <FaCog /> Manage Leave Types
      </button>

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Manage Leave Types</h2>
              <div className="flex items-center gap-2">
                {/* Mode Buttons */}
                {mode === 'view' && (
                  <>
                    <button
                      onClick={() => setMode('add')}
                      className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
                      title="Add Leave Types"
                    >
                      <FaPlus /> Add
                    </button>
                    <button
                      onClick={() => setMode('edit')}
                      className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                      title="Edit Leave Types"
                    >
                      <FaPen /> Edit
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      disabled={selectedTypes.length === 0}
                      className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Selected Leave Types"
                    >
                      <FaTrash /> Delete ({selectedTypes.length})
                    </button>
                  </>
                )}
                {mode === 'add' && (
                  <>
                    <button
                      onClick={handleAddTypes}
                      disabled={isAdding || newTypes.every(v => !v.name.trim())}
                      className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <FaCheck /> Save
                    </button>
                    <button
                      onClick={() => {
                        setMode('view');
                        setNewTypes([{ name: '', days: '' }]);
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
                      <FaSave /> Save Changes
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
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Add Mode */}
              {mode === 'add' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Add New Leave Types</h3>
                    <p className="text-sm text-gray-600">You can add multiple leave types at once.</p>
                  </div>
                  {newTypes.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 p-4 border rounded-lg">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Leave Type Name <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleNewTypeChange(index, 'name', e.target.value)}
                            placeholder={`Leave Type ${index + 1}`}
                            className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base ${
                              addErrors[index] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            maxLength={50}
                          />
                          {addErrors[index] && (
                            <div className="text-red-600 text-xs mt-1">{addErrors[index]}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Days (Optional)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.days}
                            onChange={(e) => handleNewTypeChange(index, 'days', e.target.value)}
                            placeholder="e.g. 10 (leave empty for unlimited)"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base"
                          />
                          <div className="text-gray-400 text-xs mt-1">
                            Enter the number of allowed paid leave days. Leave empty if unlimited.
                          </div>
                        </div>
                      </div>
                      {newTypes.length > 1 && (
                        <button
                          onClick={() => handleRemoveAddInput(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Remove"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddNewInput}
                    className="text-[#800000] hover:text-red-800 flex items-center gap-2 text-sm font-medium"
                  >
                    <FaPlus /> Add Another
                  </button>
                </div>
              )}

              {/* Edit Mode */}
              {mode === 'edit' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Edit Leave Types</h3>
                    <p className="text-sm text-gray-600">Edit the leave types below. Only changed items will be saved.</p>
                  </div>
                  {leaveTypes.map((lt) => {
                    const edited = editingTypes[lt.LeaveTypeID] || { name: lt.LeaveTypeName, days: lt.NumberOfDays?.toString() || '' };
                    const nameChanged = edited.name !== lt.LeaveTypeName;
                    const daysChanged = edited.days !== (lt.NumberOfDays?.toString() || '');
                    const isModified = nameChanged || daysChanged;
                    
                    return (
                      <div key={lt.LeaveTypeID} className={`flex items-start gap-2 p-4 border rounded-lg ${isModified ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Leave Type Name
                            </label>
                            <input
                              type="text"
                              value={edited.name}
                              onChange={(e) => handleEditTypeChange(lt.LeaveTypeID, 'name', e.target.value)}
                              className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base ${
                                editErrors[lt.LeaveTypeID] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              maxLength={50}
                            />
                            {editErrors[lt.LeaveTypeID] && (
                              <div className="text-red-600 text-xs mt-1">{editErrors[lt.LeaveTypeID]}</div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Number of Days
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={edited.days}
                              onChange={(e) => handleEditTypeChange(lt.LeaveTypeID, 'days', e.target.value)}
                              placeholder="Leave empty for unlimited"
                              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base"
                            />
                          </div>
                        </div>
                        {isModified && (
                          <span className="text-blue-600 text-sm mt-2">Modified</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View Mode */}
              {mode === 'view' && (
                <div>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Select leave types to delete, or use Add/Edit buttons to manage them.</p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedTypes.length === leaveTypes.length && leaveTypes.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Leave Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Number of Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {leaveTypes.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                              No leave types found.
                            </td>
                          </tr>
                        ) : (
                          leaveTypes.map((lt) => (
                            <tr
                              key={lt.LeaveTypeID}
                              className={`hover:bg-gray-50 ${selectedTypes.includes(lt.LeaveTypeID) ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedTypes.includes(lt.LeaveTypeID)}
                                  onChange={() => handleSelectType(lt.LeaveTypeID)}
                                  className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800">{lt.LeaveTypeName}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {lt.NumberOfDays !== null && lt.NumberOfDays !== undefined ? lt.NumberOfDays : 'Unlimited'}
                              </td>
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
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800 mb-2">
                  Are you sure you want to delete {typesToDelete.length} leave type(s)?
                </p>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {typesToDelete.map(lt => (
                    <li key={lt.LeaveTypeID}>{lt.LeaveTypeName}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
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

export default ManageLeaveTypes;

