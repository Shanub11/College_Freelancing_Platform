import { useState, useRef, Suspense, lazy } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { VerificationUpload } from "./VerificationUpload";
import { useNavigate } from "react-router-dom";
import { compressImage } from "@/lib/imageUtils";
import LoadingState from "./LoadingState";

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
  onOpenSupport?: (orderId?: string, projectId?: string) => void;
}

export function FreelancerDashboard({ profile, activeTab, onOpenSupport }: FreelancerDashboardProps) {
  const navigate = useNavigate();
  const myGigs = useQuery(api.gigs.getMyGigs);
  const { 
    results: myOrdersResults, 
    status: ordersStatus, 
    loadMore: loadMoreOrders 
  } = usePaginatedQuery(
    (api as any).projects.getMyFreelancerOrders, 
    {}, 
    { initialNumItems: 20 }
  );
  const myOrders = myOrdersResults;
  const [showCreateGig, setShowCreateGig] = useState(false);
  const [editingGig, setEditingGig] = useState<any | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  
  const recommendedProjects = useQuery(api.recommendations.getRecommendedProjects);
  const categories = useQuery(api.categories.getCategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  // Profile Picture Upload
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const validateUpload = useMutation(api.storage.validateUpload);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDispute = (orderId: string, projectId?: string) => {
    if (onOpenSupport) {
      onOpenSupport(orderId, projectId);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB for profile pictures)
    const MAX_PROFILE_PIC_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_PROFILE_PIC_SIZE) {
      toast.error("Profile picture must be smaller than 5MB.");
      e.target.value = "";
      return;
    }

    try {
      const compressedFile = await compressImage(file, 800, 800, 0.8);
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });
      const { storageId } = await result.json();
      const validatedId = await validateUpload({
        storageId,
        category: "profile_image",
      });
      await updateProfile({ profilePicture: validatedId });
      toast.success("Profile picture updated!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload image. Please try again.");
    }
  };

  const filteredProjects = (recommendedProjects || []).filter((project) => {
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

  const completedOrders = myOrders ? myOrders.filter((o: any) => o.status === 'completed') : [];
  const totalEarnings = completedOrders.reduce((sum: number, o: any) => sum + (o.freelancerPayout || Math.round(o.price * 0.9)), 0);
  const thisMonthEarnings = completedOrders.filter((o: any) => {
    const completedAt = o.completedAt || o._creationTime;
    return new Date(completedAt).getMonth() === new Date().getMonth() &&
           new Date(completedAt).getFullYear() === new Date().getFullYear();
  }).reduce((sum: number, o: any) => sum + (o.freelancerPayout || Math.round(o.price * 0.9)), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeTab === "gigs" && "My Gigs"}
            {activeTab === "orders" && "Orders"}
            {activeTab === "find-work" && "Find Work"}
            {activeTab === "earnings" && "Earnings"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">
            {activeTab === "gigs" && "Manage your service offerings"}
            {activeTab === "orders" && "Track your active and completed orders"}
            {activeTab === "find-work" && "Projects recommended for you based on your skills"}
            {activeTab === "earnings" && "Track your income and payouts"}
          </p>
        </div>

        <div className="flex items-center gap-4">

          {activeTab === "gigs" && profile.isVerified && (
            <button
              onClick={() => setShowCreateGig(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Create New Gig
            </button>
          )}

          
        </div>
      </div>

      {activeTab === "gigs" && (
        <>
          {/* Verification Status */}
          {!profile.isVerified && <VerificationUpload profile={profile} />}

          {(showCreateGig || editingGig) && (
            <CreateGigForm
              gigToEdit={editingGig}
              onClose={() => { setShowCreateGig(false); setEditingGig(null); }}
            />
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myGigs === undefined ? (
              <div className="col-span-full">
                <LoadingState message="Loading your gigs..." />
              </div>
            ) : myGigs.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">💼</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No gigs yet</h3>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">
                  {profile.isVerified 
                    ? "Create your first gig to start earning"
                    : "Complete verification to start creating gigs"
                  }
                </p>
              </div>
            ) : (
              myGigs.map((gig) => (
                <div key={gig._id} className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
                  {/* Gig image or placeholder */}
                  {gig.images && gig.images.length > 0 ? (
                    <div className="w-full h-36 bg-gray-100 dark:bg-dark-surface-2 flex items-center justify-center">
                      <span className="text-gray-400 dark:text-gray-500 text-sm">Image</span>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-blue-50 to-indigo-100 
                                    flex flex-col items-center justify-center">
                      <span className="text-3xl mb-1">💼</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">No image added</span>
                    </div>
                  )}
                  <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{gig.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      gig.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 dark:bg-dark-surface-2 text-gray-800 dark:text-gray-200"
                    }`}>
                      {gig.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm mb-4 line-clamp-3">{gig.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Price:</span>
                      <span className="font-medium">₹{gig.basePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Orders:</span>
                      <span className="font-medium">{gig.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Delivery:</span>
                      <span className="font-medium">{gig.deliveryTime} days</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => setEditingGig(gig)}
                      className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:bg-dark-surface-2 transition-colors">
                      {gig.isActive ? "Pause" : "Activate"}
                    </button>
                  </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "orders" && (
        ordersStatus === "LoadingFirstPage" ? (
          <LoadingState message="Loading your orders..." />
        ) : myOrders.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders yet</h3>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Orders will appear here when clients hire you</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
            {myOrders.map((order: any) => (
              <div key={order._id} className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{order.title}</h3>
                    {order.client && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Client: {order.client.firstName} {order.client.lastName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 border rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'disputed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">Price: ₹{order.price}</p>
                    <p className="text-sm font-semibold text-green-600 mt-1">Payout: ₹{order.freelancerPayout || Math.round(order.price * 0.9)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
                  <button 
                    onClick={() => setViewOrder(order)}
                    className="bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-100 dark:bg-primary-900/20 transition-colors"
                  >
                    View Details
                  </button>
                  {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'disputed' && (
                    <button onClick={() => handleDispute(order._id, order.projectId)} className="bg-red-50 text-red-600 hover:text-red-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      Generate Ticket
                    </button>
                  )}
                  {order.status === 'completed' && !order.hasReviewed && order.orderId && (
                    <button 
                      onClick={() => setReviewOrderId(order.orderId)}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      Leave Review
                    </button>
                  )}
                  {order.status === 'completed' && order.hasReviewed && (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1 bg-green-50 px-4 py-2 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Review Submitted
                    </span>
                  )}
                </div>
              </div>
            ))}
            </div>
          {ordersStatus === "CanLoadMore" && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => loadMoreOrders(20)}
                className="bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 px-6 py-2 
                           rounded-lg font-medium hover:bg-gray-50 dark:bg-dark-surface-2 transition-colors"
              >
                Load More Orders
              </button>
            </div>
          )}
          {ordersStatus === "LoadingMore" && (
            <div className="flex justify-center mt-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          )}
          </>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
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
              disabled={categories === undefined}
              className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-surface min-w-[200px]"
            >
              <option value="">All Categories</option>
              {(categories || []).map((category: any) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {recommendedProjects === undefined ? (
            <div className="grid gap-6 mt-6">
              <ProjectSkeleton />
              <ProjectSkeleton />
              <ProjectSkeleton />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No matches found yet</h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Try adjusting your search or add more skills to your profile.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredProjects.map((project) => (
                <div key={project._id} className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        <span className="bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 px-2 py-1 rounded text-xs font-medium">
                          {Math.round(project.score)}% Match
                        </span>
                        <span>• Posted {new Date(project._creationTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/projects/${project._id}/propose`)}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
                    >
                      Apply Now
                    </button>
                  </div>
                  <p className="mt-3 text-gray-600 dark:text-gray-400 dark:text-gray-500 line-clamp-2">{project.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.skills.map((skill: string) => (
                      <span key={skill} className="bg-gray-100 dark:bg-dark-surface-2 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">{skill}</span>
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
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-2">Total Earnings</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-2">This Month</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{thisMonthEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-2">Available for Withdrawal</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalEarnings.toLocaleString()}</p>
            </div>
          </div>

          {totalEarnings === 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-8 text-center mt-6">
              <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">💰</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No earnings yet</h3>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">Complete orders to start earning money</p>
            </div>
          )}

          {totalEarnings > 0 && (
            <div className="mt-8 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-dark-border">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction History</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {completedOrders.map((order: any) => (
                  <div key={order._id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:bg-dark-surface-2 transition-colors">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{order.title}</h4>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 gap-4">
                        <span>{new Date(order.completedAt || order._creationTime).toLocaleDateString()}</span>
                        {order.client && (
                          <span>Client: {order.client.firstName} {order.client.lastName}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">+₹{order.freelancerPayout || Math.round(order.price * 0.9)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Order: ₹{order.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Profile Photo Modal */}
      {showProfilePhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={() => setShowProfilePhotoModal(false)}>
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowProfilePhotoModal(false)}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4">Profile Photo</h3>
            <div className="mb-6 flex justify-center">
              <img 
                src={profile.profilePictureUrl || useStorage(profile.profilePicture) || '/default-avatar.png'} 
                alt="Profile" 
                className="w-48 h-48 rounded-full object-cover border-4 border-gray-100 dark:border-dark-border"
              />
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowProfilePhotoModal(false);
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Change Photo
              </button>
              <button
                onClick={() => setShowProfilePhotoModal(false)}
                className="border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:bg-dark-surface-2 transition-colors"
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

      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
            <button onClick={() => setViewOrder(null)} className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500">✕</button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Order Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Title</h3>
                <p className="text-gray-900 dark:text-white font-semibold">{viewOrder.title}</p>
              </div>
              {viewOrder.client && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Client</h3>
                  <p className="text-gray-900 dark:text-white">{viewOrder.client.firstName} {viewOrder.client.lastName}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewOrder.description}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-dark-surface-2 border border-gray-200 dark:border-dark-border p-4 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Total Price</h3>
                  <p className="text-gray-900 dark:text-white font-semibold">₹{viewOrder.price}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Platform Fee (10%)</h3>
                  <p className="text-red-600 font-semibold">-₹{viewOrder.platformFee || Math.round(viewOrder.price * 0.1)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Your Payout</h3>
                  <p className="text-green-600 font-semibold">₹{viewOrder.freelancerPayout || Math.round(viewOrder.price * 0.9)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Delivery Time</h3>
                  <p className="text-gray-900 dark:text-white font-semibold">{viewOrder.deliveryTime} days</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Status</h3>
                <div className="mt-1">
                  <span className={`px-2 py-1 border rounded-full text-xs font-medium ${viewOrder.status === 'completed' ? 'bg-green-100 text-green-800' : viewOrder.status === 'disputed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{viewOrder.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GigSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 bg-gray-200 rounded w-1/2"></div>
        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      <div className="flex space-x-2 mt-4">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
        <div className="h-9 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/2">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="w-1/4 flex flex-col items-end">
          <div className="h-6 bg-gray-200 rounded-full w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 border-l-4 border-gray-200 dark:border-dark-border animate-pulse">
      <div className="flex justify-between items-start">
        <div className="w-2/3">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="flex gap-2 mb-3">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="h-9 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2 mt-3"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
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
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500">✕</button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Leave a Review</h2>
        <div className="bg-primary-50 dark:bg-primary-900/10 text-blue-800 p-3 rounded-lg text-sm mb-6">
          <strong>Double-Blind Review:</strong> Your review will remain hidden until both you and the other party have submitted feedback. This ensures honest ratings!
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button type="button" key={star} onClick={() => setRating(star)} className={`text-3xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} focus:outline-none`}>★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feedback</label>
            <textarea required value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" rows={4} placeholder="Share your experience..." />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white font-medium py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
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
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} gig. Please try again.`);
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
      <div className="bg-white dark:bg-dark-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Gig" : "Create New Gig"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gig Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="I will create a responsive website for your business"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Describe what you'll deliver, your process, and what makes your service unique..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Starting Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400 dark:text-gray-500">₹</span>
                  <input
                    type="number"
                    required
                    min="5"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Time (days) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="30"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-primary-100 dark:bg-primary-900/20 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-primary-600 dark:text-primary-400 hover:text-blue-800"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 dark:bg-dark-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
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

function OrderCard({ order, onViewDetails, onGenerateTicket, onLeaveReview, onSubmitWork }: any) {
  const isLate = order.deadline && Date.now() > order.deadline && (order.status === 'active' || order.status === 'revision_requested');
  
  const getStatusChip = (status: string) => {
    if (isLate) return <span className="bg-red-100 text-red-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">⚠ Late Delivery</span>;
    switch (status) {
      case 'active':
      case 'in_progress':
        return <span className="bg-primary-100 dark:bg-primary-900/20 text-blue-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1"><span className="animate-pulse">⏳</span> Active</span>;
      case 'submitted':
        return <span className="bg-purple-100 text-purple-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">👀 In Review</span>;
      case 'revision_requested':
        return <span className="bg-orange-100 text-orange-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">🔄 Revision Requested</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">🎉 Completed</span>;
      default:
        return <span className="bg-gray-100 dark:bg-dark-surface-2 text-gray-800 dark:text-gray-200 border-transparent px-3 py-1.5 rounded-full text-sm font-bold capitalize">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className={`bg-white dark:bg-dark-surface rounded-lg shadow-sm p-6 border-l-4 ${isLate ? 'border-red-500' : order.status === 'active' ? 'border-blue-500' : 'border-gray-200 dark:border-dark-border'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{order.title}</h3>
          {order.client && (
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">Client: {order.client.firstName} {order.client.lastName}</p>
          )}
        </div>
        <div className="text-right">
          {getStatusChip(order.status)}
          <p className="text-sm font-semibold text-green-600 mt-2">Payout: ₹{order.freelancerPayout || Math.round(order.price * 0.9)}</p>
        </div>
      </div>

      {order.deadline && (order.status === 'active' || order.status === 'revision_requested') && (
        <div className="mb-4 bg-gray-50 dark:bg-dark-surface-2 p-3 rounded-lg flex justify-between items-center text-sm border border-gray-100 dark:border-dark-border">
          <span className="font-medium text-gray-700 dark:text-gray-300">Deadline: {new Date(order.deadline).toLocaleString()}</span>
          <span className={`font-bold ${isLate ? 'text-red-600' : 'text-primary-600 dark:text-primary-400'}`}>
            {isLate ? "Overdue" : `${Math.max(0, Math.floor((order.deadline - Date.now()) / (1000 * 60 * 60)))} hours left`}
          </span>
        </div>
      )}

      {order.status === 'revision_requested' && order.revisionNotes && (
        <div className="mb-4 bg-orange-50 border border-orange-100 p-3 rounded-lg text-sm text-orange-800">
          <strong>Client requested revision:</strong> {order.revisionNotes}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 flex-wrap">
        <button 
          onClick={onViewDetails}
          className="bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-100 dark:bg-primary-900/20 transition-colors"
        >
          View Details
        </button>
        
        {(order.status === 'active' || order.status === 'revision_requested') && (
          <button 
            onClick={onSubmitWork}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            Submit Work
          </button>
        )}

        {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'disputed' && (
          <button onClick={onGenerateTicket} className="bg-red-50 text-red-600 hover:text-red-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
            Generate Ticket
          </button>
        )}
        {order.status === 'completed' && !order.hasReviewed && order.orderId && (
          <button 
            onClick={onLeaveReview}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Leave Review
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitWorkModal({ order, onClose }: { order: any, onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitDelivery = useMutation((api as any).projects.submitDelivery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitDelivery({ orderId: order._id, message, link });
      toast.success("Work submitted successfully! Client has 3 days to review.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit work.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">✕</button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Submit Work</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Message *</label>
            <textarea required value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" rows={4} placeholder="Describe what you have delivered..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Work (Optional)</label>
            <input type="url" value={link} onChange={e => setLink(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="https://github.com/..." />
          </div>
          <button type="submit" disabled={isSubmitting || !message.trim()} className="w-full bg-green-600 text-white font-medium py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? "Submitting..." : "Submit Delivery"}
          </button>
        </form>
      </div>
    </div>
  );
}
