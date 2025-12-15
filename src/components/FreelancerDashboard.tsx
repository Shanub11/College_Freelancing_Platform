import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VerificationUpload } from "./VerificationUpload";
import { ChatInterface } from "./Chat";

interface FreelancerDashboardProps {
  profile: any;
  activeTab: string;
}

export function FreelancerDashboard({ profile, activeTab }: FreelancerDashboardProps) {
  const myGigs = useQuery(api.gigs.getMyGigs) || [];
  const [showCreateGig, setShowCreateGig] = useState(false);
  const [editingGig, setEditingGig] = useState<any | null>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitData, setChatInitData] = useState<any>(null);
  const conversations = useQuery(api.chat.getConversations) || [];
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const recommendedProjects = useQuery(api.recommendations.getRecommendedProjects) || [];
  const categories = useQuery(api.categories.getCategories) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const filteredProjects = recommendedProjects.filter((project) => {
    // Filter by category first
    if (selectedCategory && project.category !== selectedCategory) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    if (!term) return true;

    return (
      (project.title || "").toLowerCase().includes(term) ||
      (project.description || "").toLowerCase().includes(term) ||
      (project.category || "").toLowerCase().includes(term) ||
      (project.skills || []).some((skill: string) => skill.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === "gigs" && "My Gigs"}
            {activeTab === "orders" && "Orders"}
            {activeTab === "find-work" && "Find Work"}
            {activeTab === "earnings" && "Earnings"}
          </h1>
          <p className="text-gray-600">
            {activeTab === "gigs" && "Manage your service offerings"}
            {activeTab === "orders" && "Track your active and completed orders"}
            {activeTab === "find-work" && "Projects recommended for you based on your skills"}
            {activeTab === "earnings" && "Track your income and payouts"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => { setChatInitData(null); setIsChatOpen(true); }} className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {totalUnread > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {totalUnread}
              </span>
            )}
          </button>

          {activeTab === "gigs" && profile.isVerified && (
            <button
              onClick={() => setShowCreateGig(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create New Gig
            </button>
          )}
        </div>
      </div>

      {activeTab === "gigs" && (
        <>
          {/* Verification Status */}
          <VerificationUpload profile={profile} />

          {(showCreateGig || editingGig) && (
            <CreateGigForm
              gigToEdit={editingGig}
              onClose={() => { setShowCreateGig(false); setEditingGig(null); }}
            />
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myGigs.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">💼</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No gigs yet</h3>
                <p className="text-gray-600">
                  {profile.isVerified 
                    ? "Create your first gig to start earning"
                    : "Complete verification to start creating gigs"
                  }
                </p>
              </div>
            ) : (
              myGigs.map((gig) => (
                <div key={gig._id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{gig.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      gig.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {gig.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{gig.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium">₹{gig.basePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Orders:</span>
                      <span className="font-medium">{gig.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery:</span>
                      <span className="font-medium">{gig.deliveryTime} days</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => setEditingGig(gig)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      {gig.isActive ? "Pause" : "Activate"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "orders" && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600">Orders will appear here when clients hire you</p>
        </div>
      )}

      {activeTab === "find-work" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search projects by keywords or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[200px]"
            >
              <option value="">All Categories</option>
              {categories.map((category: any) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found yet</h3>
              <p className="text-gray-600">Try adjusting your search or add more skills to your profile.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredProjects.map((project) => (
                <div key={project._id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                          {Math.round(project.score)}% Match
                        </span>
                        <span>• Posted {new Date(project._creationTime).toLocaleDateString()}</span>
                        <span>• Budget: ₹{project.budget.min} - ₹{project.budget.max}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.location.href = `/projects/${project._id}/submit`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Apply Now
                    </button>
                  </div>
                  <p className="mt-3 text-gray-600 line-clamp-2">{project.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.skills.map((skill: string) => (
                      <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "earnings" && (
        <>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Earnings</h3>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">This Month</h3>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Available for Withdrawal</h3>
              <p className="text-2xl font-bold text-gray-900">$0.00</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No earnings yet</h3>
            <p className="text-gray-600">Complete orders to start earning money</p>
          </div>
        </>
      )}

      <ChatInterface 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        initialConversation={chatInitData}
        currentUserId={profile.userId}
      />
    </div>
  );
}

function CreateGigForm({ onClose, gigToEdit }: { onClose: () => void, gigToEdit?: any | null }) {
  const isEditMode = !!gigToEdit;
  const [formData, setFormData] = useState({
    title: gigToEdit?.title || "",
    description: gigToEdit?.description || "",
    category: gigToEdit?.category || "",
    tags: gigToEdit?.tags || [] as string[],
    basePrice: gigToEdit?.basePrice || 25,
    deliveryTime: gigToEdit?.deliveryTime || 3,
  });

  const categories = useQuery(api.categories.getCategories) || [];
  const createGig = useMutation(api.gigs.createGig);
  const updateGig = useMutation(api.gigs.updateGig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode) {
        await updateGig({
          gigId: gigToEdit._id,
          // Only send fields the validator expects
          title: formData.title,
          description: formData.description,
          basePrice: formData.basePrice,
          deliveryTime: formData.deliveryTime,
          // The backend validator is missing `category` and `tags`
        });
        toast.success("Gig updated successfully!");
      } else {
        await createGig({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          basePrice: formData.basePrice,
          deliveryTime: formData.deliveryTime,
          images: [], // TODO: Add image upload
        });
        toast.success("Gig created successfully!");
      }
      onClose();
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} gig`);
      console.error(error);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((t: string) => t !== tag)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? "Edit Gig" : "Create New Gig"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gig Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="I will create a responsive website for your business"
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
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Describe what you'll deliver, your process, and what makes your service unique..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    type="number"
                    required
                    min="5"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time (days) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="30"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add a tag and press Enter"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {isEditMode ? "Save Changes" : "Create Gig"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
