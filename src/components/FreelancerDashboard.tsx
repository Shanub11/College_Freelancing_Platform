import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VerificationUpload } from "./VerificationUpload";

interface FreelancerDashboardProps {
  profile: any;
  activeTab: string;
}

export function FreelancerDashboard({ profile, activeTab }: FreelancerDashboardProps) {
  const myGigs = useQuery(api.gigs.getMyGigs) || [];
  const [showCreateGig, setShowCreateGig] = useState(false);

  if (activeTab === "gigs") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Gigs</h1>
            <p className="text-gray-600">Manage your service offerings</p>
          </div>
          {profile.isVerified && (
            <button
              onClick={() => setShowCreateGig(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create New Gig
            </button>
          )}
        </div>

        {/* Verification Status */}
        <VerificationUpload profile={profile} />

        {showCreateGig && <CreateGigForm onClose={() => setShowCreateGig(false)} />}

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
                    <span className="font-medium">${gig.basePrice}</span>
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
                  <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
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
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600">Orders will appear here when clients hire you</p>
        </div>
      </div>
    );
  }

  if (activeTab === "earnings") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600">Track your income and payouts</p>
        </div>

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
      </div>
    );
  }

  return null;
}

function CreateGigForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    tags: [] as string[],
    basePrice: 25,
    deliveryTime: 3,
  });

  const categories = useQuery(api.categories.getCategories) || [];
  const createGig = useMutation(api.gigs.createGig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
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
      onClose();
    } catch (error) {
      toast.error("Failed to create gig");
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
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create New Gig</h2>
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
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
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
                {formData.tags.map((tag) => (
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
                Create Gig
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
