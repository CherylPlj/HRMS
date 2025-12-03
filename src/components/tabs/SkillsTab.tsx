import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { useUser } from '@clerk/nextjs';
import { isAdmin } from '@/utils/roleUtils';

interface Skill {
  id: number;
  employeeId: string;
  name: string;
  proficiencyLevel: string;
  description?: string;
}

interface SkillsTabProps {
  employeeId: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const SkillsTab: React.FC<SkillsTabProps> = ({ employeeId }) => {
  const { user } = useUser();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      setIsUserAdmin(isAdmin(user));
    }
  }, [user]);

  useEffect(() => {
    fetchSkills();
  }, [employeeId]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchSkills = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to fetch skills'
        });
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch skills'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSkill) return;

    // Check for duplicate skill name (case-insensitive)
    const duplicateSkill = skills.find(
      skill => 
        skill.name.toLowerCase() === currentSkill.name.toLowerCase() &&
        skill.id !== currentSkill.id // Exclude current skill when editing
    );
    if (duplicateSkill) {
      setNotification({
        type: 'error',
        message: 'A skill with this name already exists. Please choose a different name.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = `/api/employees/${employeeId}/skills${currentSkill.id ? `/${currentSkill.id}` : ''}`;
      const method = currentSkill.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentSkill),
      });

      if (response.ok) {
        await fetchSkills();
        setShowForm(false);
        setCurrentSkill(null);
        setNotification({
          type: 'success',
          message: currentSkill.id ? 'Skill updated successfully!' : 'Skill added successfully!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save skill');
      }
    } catch (error) {
      console.error('Error saving skill:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save skill'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    try {
      const response = await fetch(`/api/employees/${employeeId}/skills/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSkills();
        setNotification({
          type: 'success',
          message: 'Skill deleted successfully!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete skill');
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete skill'
      });
    }
  };

  const proficiencyLevels = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Expert'
  ];

  return (
    <div className="space-y-6">
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

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Skills</h3>
        {!isUserAdmin && (
          <button
            onClick={() => {
              setCurrentSkill({
                id: 0,
                employeeId,
                name: '',
                proficiencyLevel: 'Beginner',
                description: '',
              });
              setShowForm(true);
            }}
            className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
          >
            <FaPlus /> Add Skill
          </button>
        )}
      </div>

      {/* List of skills */}
      <div className="grid grid-cols-1 gap-4">
        {skills.map((skill) => (
          <div key={skill.id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{skill.name}</h4>
                  <span className="text-sm text-gray-500">
                    ({skill.proficiencyLevel})
                  </span>
                </div>
                {skill.description && (
                  <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                )}
              </div>
              {!isUserAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCurrentSkill(skill);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FaTrash />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {currentSkill.id ? 'Edit Skill' : 'Add Skill'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentSkill(null);
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
                  <label className="block text-sm font-medium text-gray-700">Skill Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentSkill.name}
                    onChange={(e) =>
                      setCurrentSkill({ ...currentSkill, name: e.target.value })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Proficiency Level <span className="text-red-500">*</span></label>
                  <select
                    value={currentSkill.proficiencyLevel}
                    onChange={(e) =>
                      setCurrentSkill({
                        ...currentSkill,
                        proficiencyLevel: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    required
                  >
                    {proficiencyLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    value={currentSkill.description}
                    onChange={(e) =>
                      setCurrentSkill({
                        ...currentSkill,
                        description: e.target.value,
                      })
                    }
                    className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentSkill(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
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

export default SkillsTab; 