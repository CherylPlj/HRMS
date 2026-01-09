'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pen, Trash2, X, Check, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Role {
  id: number;
  name: string;
}

interface ManageUserRolesProps {
  roles: Role[];
  onUpdate: () => void; // Callback to refresh roles
}

// Validation function
const validateRoleName = (value: string, existingRoles: Role[], excludeId?: number): string | null => {
  if (!value.trim()) {
    return 'Role name is required.';
  }
  if (value.length < 2) {
    return 'Role name must be at least 2 characters long.';
  }
  if (value.length > 50) {
    return 'Role name must not exceed 50 characters.';
  }
  if (!/^[a-zA-Z0-9\s]+$/.test(value)) {
    return 'Only letters, numbers, and spaces are allowed.';
  }
  // Check for uniqueness (excluding the current item if editing)
  const existingNames = existingRoles
    .filter(r => !excludeId || r.id !== excludeId)
    .map(r => r.name.toLowerCase());
  if (existingNames.includes(value.trim().toLowerCase())) {
    return 'Role name must be unique.';
  }
  return null;
};

const ManageUserRoles: React.FC<ManageUserRolesProps> = ({ roles, onUpdate }) => {
  // Filter out "student" role (case-insensitive)
  const filteredRoles = roles.filter(r => r.name.toLowerCase() !== 'student');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  
  // Add state
  const [newRoles, setNewRoles] = useState<Array<{ name: string }>>([{ name: '' }]);
  const [addErrors, setAddErrors] = useState<{ [key: number]: string | null }>({});
  const [isAdding, setIsAdding] = useState(false);
  
  // Edit state
  const [editingRoles, setEditingRoles] = useState<{ [key: number]: { name: string } }>({});
  const [editErrors, setEditErrors] = useState<{ [key: number]: string | null }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasEdits, setHasEdits] = useState(false);
  
  // Delete state
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rolesToDelete, setRolesToDelete] = useState<Role[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isModalOpen) {
      setMode('view');
      setNewRoles([{ name: '' }]);
      setAddErrors({});
      setEditingRoles({});
      setEditErrors({});
      setSelectedRoles([]);
      setHasEdits(false);
    }
  }, [isModalOpen]);

  // Initialize editing roles when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && !isSaving) {
      const initialEdits: { [key: number]: { name: string } } = {};
      filteredRoles.forEach(r => {
        initialEdits[r.id] = {
          name: r.name
        };
      });
      setEditingRoles(initialEdits);
      setEditErrors({});
      setHasEdits(false);
    }
  }, [mode, filteredRoles, isSaving]);

  // Check if there are edits
  useEffect(() => {
    if (mode === 'edit') {
      const hasChanges = filteredRoles.some(r => {
        const edited = editingRoles[r.id];
        if (!edited) return false;
        const nameChanged = edited.name !== r.name;
        return nameChanged;
      });
      setHasEdits(hasChanges);
    }
  }, [editingRoles, filteredRoles, mode]);

  // Handle Add Mode
  const handleAddNewInput = () => {
    setNewRoles([...newRoles, { name: '' }]);
  };

  const handleRemoveAddInput = (index: number) => {
    if (newRoles.length > 1) {
      const updated = newRoles.filter((_, i) => i !== index);
      setNewRoles(updated);
      const updatedErrors = { ...addErrors };
      delete updatedErrors[index];
      setAddErrors(updatedErrors);
    }
  };

  const handleNewRoleChange = (index: number, value: string) => {
    const updated = [...newRoles];
    updated[index] = { ...updated[index], name: value };
    setNewRoles(updated);
    
    // Validate name field - check against all roles (including hidden ones) to prevent duplicates
    let error = validateRoleName(value, roles);
    
    // Also prevent creating "student" role
    if (!error && value.trim().toLowerCase() === 'student') {
      error = 'This role cannot be created.';
    }
    
    // Check for duplicates within new roles
    if (!error && value.trim()) {
      const duplicateIndex = updated.findIndex((v, i) => i !== index && v.name.trim().toLowerCase() === value.trim().toLowerCase());
      if (duplicateIndex !== -1) {
        error = 'This name is already in the list above.';
      }
    }
    
    setAddErrors(prev => ({ ...prev, [index]: error }));
  };

  const handleAddRoles = async () => {
    // Validate all inputs
    const errors: { [key: number]: string | null } = {};
    let hasError = false;
    
    newRoles.forEach((item, index) => {
      if (item.name.trim()) {
        const error = validateRoleName(item.name, roles);
        errors[index] = error;
        if (error) hasError = true;
      }
    });

    if (hasError) {
      setAddErrors(errors);
      return;
    }

    // Filter out empty inputs
    const rolesToAdd = newRoles.filter(v => v.name.trim());
    if (rolesToAdd.length === 0) {
      return;
    }

    setIsAdding(true);
    try {
      const promises = rolesToAdd.map(item =>
        fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name.trim()
          }),
        })
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorMessages = await Promise.all(failed.map(r => r.json().then(data => data.error || r.statusText).catch(() => r.statusText)));
        throw new Error(`Failed to add ${failed.length} role(s): ${errorMessages.join(', ')}`);
      }

      // Reset and refresh
      setNewRoles([{ name: '' }]);
      setAddErrors({});
      setMode('view');
      onUpdate();
      
      // Show success notification
      const count = rolesToAdd.length;
      toast.success(
        count === 1 
          ? `Role "${rolesToAdd[0].name.trim()}" added successfully!`
          : `${count} roles added successfully!`
      );
    } catch (error) {
      console.error('Error adding roles:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add roles');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Edit Mode
  const handleEditRoleChange = (id: number, value: string) => {
    setEditingRoles(prev => {
      const updated = { ...prev, [id]: { ...prev[id], name: value } };
      
      // Validate name field - check against all roles (including hidden ones) to prevent duplicates
      let error = validateRoleName(value, roles, id);
      
      // Also prevent editing to "student" role
      if (!error && value.trim().toLowerCase() === 'student') {
        error = 'This role name cannot be used.';
      }
      
      // Check for duplicates within edited roles
      if (!error && value.trim()) {
        const duplicateId = Object.entries(updated).find(
          ([otherId, otherValue]) => Number(otherId) !== id && otherValue.name.trim().toLowerCase() === value.trim().toLowerCase()
        );
        if (duplicateId) {
          error = 'This name is already used by another role.';
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

    Object.entries(editingRoles).forEach(([id, edited]) => {
      const error = validateRoleName(edited.name, roles, Number(id));
      if (error) {
        errors[Number(id)] = error;
        hasError = true;
      }
    });

    if (hasError) {
      setEditErrors(errors);
      return;
    }

    // Find only the roles that were actually changed
    const rolesToUpdate = filteredRoles.filter(r => {
      const edited = editingRoles[r.id];
      if (!edited) return false;
      const nameChanged = edited.name !== r.name;
      return nameChanged;
    });

    if (rolesToUpdate.length === 0) {
      setMode('view');
      return;
    }

    setIsSaving(true);
    try {
      const promises = rolesToUpdate.map(async r => {
        const edited = editingRoles[r.id];
        const response = await fetch(`/api/roles/${r.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: edited.name.trim()
          }),
        });
        
        // Verify the response
        if (response.ok) {
          const data = await response.json();
          console.log('Role updated successfully:', data);
          return { ok: true, data };
        } else {
          const errorData = await response.json().catch(() => ({}));
          return { ok: false, error: errorData.error || errorData.details || response.statusText, response };
        }
      });

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorMessages = failed.map(r => r.error || 'Unknown error');
        const errorMessage = `Failed to update ${failed.length} role(s): ${errorMessages.join(', ')}`;
        console.error('Error updating roles:', errorMessages);
        throw new Error(errorMessage);
      }

      // Get the updated role names before resetting state
      const updatedRoleNames = rolesToUpdate.map(r => editingRoles[r.id]?.name || r.name);
      
      // Verify all updates succeeded
      const successfulUpdates = results.filter(r => r.ok);
      console.log('Successfully updated roles:', successfulUpdates.map(r => r.data));
      
      // Reset state first
      setMode('view');
      setEditingRoles({});
      setEditErrors({});
      setHasEdits(false);
      
      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Wait for the refresh to complete before showing success
      await onUpdate();
      
      // Show success notification
      const count = rolesToUpdate.length;
      const updatedRoleName = updatedRoleNames[0];
      toast.success(
        count === 1 
          ? `Role "${updatedRoleName}" updated successfully!`
          : `${count} roles updated successfully!`
      );
    } catch (error) {
      console.error('Error updating roles:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update roles');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setMode('view');
    setEditingRoles({});
    setEditErrors({});
    setHasEdits(false);
  };

  // Handle Delete
  const handleSelectRole = (id: number) => {
    setSelectedRoles(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRoles.length === filteredRoles.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(filteredRoles.map(r => r.id));
    }
  };

  const handleDeleteClick = () => {
    if (selectedRoles.length === 0) return;
    
    const toDelete = filteredRoles.filter(r => selectedRoles.includes(r.id));
    setRolesToDelete(toDelete);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedRoles.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete all selected roles
      const deletePromises = selectedRoles.map(id =>
        fetch(`/api/roles/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        const errorMessages = await Promise.all(
          failed.map(r => r.json().then(data => data.error || r.statusText).catch(() => r.statusText))
        );
        throw new Error(`Failed to delete ${failed.length} role(s): ${errorMessages.join(', ')}`);
      }

      // Reset and refresh
      setSelectedRoles([]);
      setShowDeleteModal(false);
      setRolesToDelete([]);
      onUpdate();
      
      // Show success notification
      const count = selectedRoles.length;
      const deletedRoleNames = rolesToDelete.map(r => r.name).join(', ');
      toast.success(
        count === 1 
          ? `Role "${deletedRoleNames}" deleted successfully!`
          : `${count} roles deleted successfully!`
      );
    } catch (error) {
      console.error('Error deleting roles:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete roles');
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
        title="Manage User Roles"
        type="button"
      >
        <Settings size={16} /> Manage User Roles
      </button>

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Manage User Roles</h2>
              <div className="flex items-center gap-2">
                {/* Mode Buttons */}
                {mode === 'view' && (
                  <>
                    <button
                      onClick={() => setMode('add')}
                      className="bg-[#800000] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-800"
                      title="Add Roles"
                    >
                      <Plus size={16} /> Add
                    </button>
                    <button
                      onClick={() => setMode('edit')}
                      className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                      title="Edit Roles"
                    >
                      <Pen size={16} /> Edit
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      disabled={selectedRoles.length === 0}
                      className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Selected Roles"
                    >
                      <Trash2 size={16} /> Delete ({selectedRoles.length})
                    </button>
                  </>
                )}
                {mode === 'add' && (
                  <>
                    <button
                      onClick={handleAddRoles}
                      disabled={isAdding || newRoles.every(v => !v.name.trim())}
                      className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check size={16} /> Save
                    </button>
                    <button
                      onClick={() => {
                        setMode('view');
                        setNewRoles([{ name: '' }]);
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Add New Roles</h3>
                    <p className="text-sm text-gray-600">You can add multiple roles at once.</p>
                  </div>
                  {newRoles.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role Name <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleNewRoleChange(index, e.target.value)}
                            placeholder={`Role ${index + 1}`}
                            className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#800000] focus:border-[#800000] transition-all text-base ${
                              addErrors[index] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            maxLength={50}
                          />
                          {addErrors[index] && (
                            <div className="text-red-600 text-xs mt-1">{addErrors[index]}</div>
                          )}
                        </div>
                      </div>
                      {newRoles.length > 1 && (
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Edit Roles</h3>
                    <p className="text-sm text-gray-600">Edit the roles below. Only changed items will be saved.</p>
                  </div>
                  {filteredRoles.map((r) => {
                    const edited = editingRoles[r.id] || { name: r.name };
                    const nameChanged = edited.name !== r.name;
                    const isModified = nameChanged;
                    
                    return (
                      <div key={r.id} className={`flex items-start gap-2 p-4 border rounded-lg ${isModified ? 'bg-blue-50 border-blue-200' : ''}`}>
                        <div className="flex-1">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Role Name
                            </label>
                            <input
                              type="text"
                              value={edited.name}
                              onChange={(e) => handleEditRoleChange(r.id, e.target.value)}
                              className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base ${
                                editErrors[r.id] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              maxLength={50}
                            />
                            {editErrors[r.id] && (
                              <div className="text-red-600 text-xs mt-1">{editErrors[r.id]}</div>
                            )}
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
                    <p className="text-sm text-gray-600">Select roles to delete, or use Add/Edit buttons to manage them.</p>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedRoles.length === filteredRoles.length && filteredRoles.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredRoles.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                              No roles found.
                            </td>
                          </tr>
                        ) : (
                          filteredRoles.map((r) => (
                            <tr
                              key={r.id}
                              className={`hover:bg-gray-50 ${selectedRoles.includes(r.id) ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedRoles.includes(r.id)}
                                  onChange={() => handleSelectRole(r.id)}
                                  className="rounded border-gray-300 text-[#800000] focus:ring-[#800000]"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800">{r.name}</td>
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
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800 mb-2">
                  Are you sure you want to delete {rolesToDelete.length} role(s)?
                </p>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {rolesToDelete.map(r => (
                    <li key={r.id}>{r.name}</li>
                  ))}
                </ul>
                <p className="text-red-700 text-xs mt-2">
                  Note: Roles that are assigned to users cannot be deleted.
                </p>
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

export default ManageUserRoles;

