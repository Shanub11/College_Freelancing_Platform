import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface ClientDashboardProps {
  profile: any;
  activeTab: string;
}

export function ClientDashboard({ profile, activeTab }: ClientDashboardProps) {
  const myProjects = useQuery(api.projects.getMyProjects) || [];

  if (activeTab === "projects") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-600">Manage your posted project requests</p>
        </div>

        <div className="space-y-4">
          {myProjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600">Post your first project to start receiving proposals</p>
            </div>
          ) : (
            myProjects.map((project) => (
              <div key={project._id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
                    <p className="text-gray-600 mb-3">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    project.status === "open" 
                      ? "bg-green-100 text-green-800"
                      : project.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {project.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Budget:</span>
                    <p className="font-medium">${project.budget.min} - ${project.budget.max}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <p className="font-medium">{project.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Deadline:</span>
                    <p className="font-medium">{new Date(project.deadline).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Proposals:</span>
                    <p className="font-medium">{project.proposalCount}</p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    View Proposals
                  </button>
                  <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Edit Project
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (activeTab === "orders") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Track your active and completed orders</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">💼</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600">Orders will appear here when freelancers accept your projects</p>
        </div>
      </div>
    );
  }

  if (activeTab === "post-project") {
    return <PostProjectForm />;
  }

  return null;
}

function PostProjectForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    skills: [] as string[],
    budgetMin: 50,
    budgetMax: 500,
    deadline: "",
  });

  const categories = useQuery(api.categories.getCategories) || [];
  const createProject = useMutation(api.projects.createProject);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.deadline) {
      toast.error("Please select a deadline");
      return;
    }

    try {
      await createProject({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget: {
          min: formData.budgetMin,
          max: formData.budgetMax,
        },
        deadline: new Date(formData.deadline).getTime(),
        skills: formData.skills,
      });

      toast.success("Project posted successfully!");
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        skills: [],
        budgetMin: 50,
        budgetMax: 500,
        deadline: "",
      });
    } catch (error) {
      toast.error("Failed to post project");
      console.error(error);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Post a Project</h1>
        <p className="text-gray-600">Describe your project and receive proposals from talented students</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Build a responsive website for my startup"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
              placeholder="Describe your project in detail. Include requirements, deliverables, and any specific preferences..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Budget ($) *
              </label>
              <input
                type="number"
                required
                min="5"
                value={formData.budgetMin}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Budget ($) *
              </label>
              <input
                type="number"
                required
                min={formData.budgetMin}
                value={formData.budgetMax}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Deadline *
            </label>
            <input
              type="date"
              required
              min={today}
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skills
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add a skill and press Enter"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Tips for a successful project:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Be specific about your requirements and deliverables</li>
              <li>• Set a realistic budget and timeline</li>
              <li>• Include examples or references if possible</li>
              <li>• Respond promptly to freelancer questions</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Post Project
          </button>
        </form>
      </div>
    </div>
  );
}
