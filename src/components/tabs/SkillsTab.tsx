import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

interface Skill {
  id: number;
  employeeId: string;
  name: string;
  proficiencyLevel: string;
  yearsOfExperience: number;
  description?: string;
}

interface SkillsTabProps {
  employeeId: string;
}

const SkillsTab: React.FC<SkillsTabProps> = ({ employeeId }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSkill, setCurrentSkill] = useState<Skill | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, [employeeId]);

  const fetchSkills = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/skills`);
      if (response.ok) {
        const data = await response.json();
        setSkills(data);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSkill) return;

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
      }
    } catch (error) {
      console.error('Error saving skill:', error);
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
      }
    } catch (error) {
      console.error('Error deleting skill:', error);
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Skills</h3>
        <button
          onClick={() => {
            setCurrentSkill({
              id: 0,
              employeeId,
              name: '',
              proficiencyLevel: 'Beginner',
              yearsOfExperience: 0,
              description: '',
            });
            setShowForm(true);
          }}
          className="bg-[#800000] text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800 transition-colors"
        >
          <FaPlus /> Add Skill
        </button>
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
                <p className="text-sm text-gray-600">
                  Years of Experience: {skill.yearsOfExperience}
                </p>
                {skill.description && (
                  <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                )}
              </div>
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
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && currentSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">
              {currentSkill.id ? 'Edit Skill' : 'Add Skill'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Skill Name</label>
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
                <label className="block text-sm font-medium text-gray-700">Proficiency Level</label>
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
                <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                <input
                  type="number"
                  value={currentSkill.yearsOfExperience}
                  onChange={(e) =>
                    setCurrentSkill({
                      ...currentSkill,
                      yearsOfExperience: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full bg-gray-50 text-black p-2 rounded border border-gray-300"
                  required
                  min="0"
                />
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-red-800"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsTab; 