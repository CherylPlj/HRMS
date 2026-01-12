import React, { useState, useEffect } from 'react';
import { Plus, Pen, Trash2, Check, X } from 'lucide-react';
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
    <div className="space-y-4 md:space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-3 md:p-4 rounded-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center text-sm md:text-base">
            {notification.type === 'success' ? (
              <Check className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            ) : (
              <X className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            )}
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base md:text-lg font-bold text-gray-900 uppercase tracking-wide">Skills & Expertise</h3>
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
            className="w-full sm:w-auto bg-[#800000] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-800 transition-colors text-sm md:text-base"
          >
            <Plus size={16} /> Add Skill
          </button>
        )}
      </div>

      {/* List of skills */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {skills.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No skills listed yet.</p>
          </div>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm md:text-base">{skill.name}</h4>
                    <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium ${
                      skill.proficiencyLevel === 'Expert' 
                        ? 'bg-purple-100 text-purple-700'
                        : skill.proficiencyLevel === 'Advanced'
                        ? 'bg-blue-100 text-blue-700'
                        : skill.proficiencyLevel === 'Intermediate'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {skill.proficiencyLevel}
                    </span>
                  </div>
                  {skill.description && (
                    <p className="text-xs md:text-sm text-gray-600 mt-1.5 line-clamp-2 italic">{skill.description}</p>
                  )}
                </div>
                {!isUserAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setCurrentSkill(skill);
                        setShowForm(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Pen size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(skill.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-full sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b">
              <h3 className="text-lg md:text-xl font-bold text-gray-800">
                {currentSkill.id ? 'Edit Skill' : 'Add New Skill'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCurrentSkill(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Skill Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={currentSkill.name}
                    onChange={(e) => setCurrentSkill({ ...currentSkill, name: e.target.value })}
                    placeholder="e.g. Project Management, Java, UI Design"
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Proficiency Level <span className="text-red-500">*</span></label>
                  <select
                    value={currentSkill.proficiencyLevel}
                    onChange={(e) => setCurrentSkill({ ...currentSkill, proficiencyLevel: e.target.value })}
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    required
                  >
                    {proficiencyLevels.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <textarea
                    value={currentSkill.description || ''}
                    onChange={(e) => setCurrentSkill({ ...currentSkill, description: e.target.value })}
                    placeholder="Briefly describe your experience with this skill..."
                    className="w-full bg-gray-50 text-gray-900 p-2 md:p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] transition-all text-sm md:text-base"
                    rows={4}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCurrentSkill(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-wide"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white rounded-lg shadow-sm transition-all uppercase tracking-wide ${
                      isSubmitting 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-[#800000] hover:bg-red-800 hover:shadow-md'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : (currentSkill.id ? 'Update Skill' : 'Add Skill')}
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