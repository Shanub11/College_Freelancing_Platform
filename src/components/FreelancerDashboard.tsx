import { useState, useRef, Suspense, lazy } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VerificationUpload } from "./VerificationUpload";
import { useNavigate } from "react-router-dom";
import { compressImage } from "../../convex/image";

const ChatInterface = lazy(() => import("./Chat").then(m => ({ default: m.ChatInterface })));

function useStorage(fileRef: any): string | null {
  if (!fileRef) return null;
  if (typeof fileRef === "string") return fileRef;
  if (typeof fileRef === "object") {
    if (typeof fileRef.url === "string") return fileRef.url;
    if (typeof fileRef.path === "string") return fileRef.path;
    if (typeof (fileRef as any).filename === "string") return (fileRef as any).filename;
  }
  return null;
}

interface FreelancerDashboardProps {
  profile: any;
  activeTab: string;
}

export function FreelancerDashboard({ profile, activeTab }: FreelancerDashboardProps) {
  const navigate = useNavigate();
  const myGigs = useQuery(api.gigs.getMyGigs) || [];
  const myOrders = useQuery((api as any).projects?.getMyFreelancerOrders) || [];
  const [showCreateGig, setShowCreateGig] = useState(false);
  const [editingGig, setEditingGig] = useState<any | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  
  // Notifications
  const notifications = useQuery(api.proposals.getNotifications, {}) || [];
  const markAsRead = useMutation(api.proposals.markAsRead);
  const markAllAsRead = useMutation(api.proposals.markAllAsRead);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitData, setChatInitData] = useState<any>(null);
  const { results: conversations } = usePaginatedQuery(api.chat.getConversations, {}, { initialNumItems: 20 });
  const totalUnread = (conversations || []).reduce((acc, c) => acc + c.unreadCount, 0);
  const recommendedProjects = useQuery(api.recommendations.getRecommendedProjects) || [];
  const categories = useQuery(api.categories.getCategories) || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  // Profile Picture Upload
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openDispute = useMutation((api as any).disputes?.openDispute);

  const handleDispute = async (projectId: string) => {
    const reason = window.prompt("Why are you disputing this project?");
    if (!reason) return;
    try {
      await openDispute({ projectId, reason });
      toast.success("Dispute opened. An admin will review it soon.");
    } catch (e: any) {
      toast.error(e.message || "Failed to open dispute");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file, 800, 800, 0.8);
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });
      const { storageId } = await result.json();
      await updateProfile({ profilePicture: storageId });
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    }
  };

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
          
          <div className="relative">
            <button className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors" onClick={() => {
              if (!showNotifications && unreadCount > 0) {
                markAllAsRead();
              }
              setShowNotifications(!showNotifications);
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a3 3 0 00-6 0v.083A6 6 0 002 11v3.159c0 .538-.214 1.055-.595 1.436L0 17h5m10 0v1a3 3 0 01-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n._id} className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`} onClick={() => { if (!n.isRead) markAsRead({ notificationId: n._id }); }}>
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <span className="text-xs text-gray-500 mt-1 block">{new Date(n._creationTime).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
        myOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600">Orders will appear here when clients hire you</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myOrders.map((order: any) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{order.title}</h3>
                    {order.client && (
                      <p className="text-sm text-gray-600">Client: {order.client.firstName} {order.client.lastName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'disputed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span>
                    <p className="text-sm text-gray-500 mt-1">Budget: ₹{order.budget.min} - ₹{order.budget.max}</p>
                  </div>
                </div>
                {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'disputed' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={() => handleDispute(order._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                      Open Dispute
                    </button>
                  </div>
                )}
                {order.status === 'completed' && !order.hasReviewed && order.orderId && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <button 
                      onClick={() => setReviewOrderId(order.orderId)}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Leave Review
                    </button>
                  </div>
                )}
                {order.status === 'completed' && order.hasReviewed && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Review Submitted
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
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
                      onClick={() => navigate(`/projects/${project._id}/propose`)}
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

      <Suspense fallback={null}>
        <ChatInterface 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          initialConversation={chatInitData}
          currentUserId={profile.userId}
        />
      </Suspense>

      {/* Profile Photo Modal */}
      {showProfilePhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setShowProfilePhotoModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowProfilePhotoModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4">Profile Photo</h3>
            <div className="mb-6 flex justify-center">
              <img 
                src={profile.profilePictureUrl || useStorage(profile.profilePicture) || '/default-avatar.png'} 
                alt="Profile" 
                className="w-48 h-48 rounded-full object-cover border-4 border-gray-100"
              />
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowProfilePhotoModal(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Change Photo
              </button>
              <button
                onClick={() => setShowProfilePhotoModal(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewOrderId && (
        <ReviewModal orderId={reviewOrderId} onClose={() => setReviewOrderId(null)} />
      )}
    </div>
  );
}

function ReviewModal({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitReview = useMutation((api as any).reviews?.submitReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitReview({ orderId, rating, comment });
      toast.success("Review submitted! It stays hidden until both parties review.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Leave a Review</h2>
        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-6">
          <strong>Double-Blind Review:</strong> Your review will remain hidden until both you and the other party have submitted feedback. This ensures honest ratings!
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button type="button" key={star} onClick={() => setRating(star)} className={`text-3xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} focus:outline-none`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
            <textarea required value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" rows={4} placeholder="Share your experience..." />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
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
