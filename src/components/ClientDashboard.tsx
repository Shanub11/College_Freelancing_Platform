import { useState, useRef, Suspense, lazy } from "react";
import { useQuery, useMutation, usePaginatedQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { ProposalActions } from "./ProposalActions";
import { GigBrowser } from "./GigBrowser";
import { compressImage } from "@/lib/imageUtils";
import posthog from "posthog-js";
import { PayButton } from "./PayButton";
import { Helmet } from "react-helmet-async";
import { getProfilePictureUrl, getStorageUrl } from "@/lib/storageHelpers";
import LoadingState from "./LoadingState";
import ConfirmModal from "./ConfirmModal";
import { PaymentMethodBadges } from "./PaymentMethodBadges";

const ChatInterface = lazy(() => import("./Chat").then(m => ({ default: m.ChatInterface })));

// Main component for the client dashboard
export function ClientDashboard({ profile, activeTab, onOpenChat, onOpenSupport }: { profile: any, activeTab: string, onOpenChat?: (data?: any) => void, onOpenSupport?: (orderId?: string, projectId?: string) => void }) {
  const myProjects = useQuery(api.projects.getMyProjects, {});
  const notifications = useQuery(api.proposals.getNotifications, {}) || [];
  const myOrders = useQuery(api.projects.getMyClientOrders);
  const [selectedProject, setSelectedProject] = useState<Id<"projectRequests"> | null>(null);
  const [viewingFreelancer, setViewingFreelancer] = useState<Id<"users"> | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const markAsRead = useMutation(api.proposals.markAsRead);
  const markAllAsRead = useMutation(api.proposals.markAllAsRead);
  const completeOrder = useMutation(api.projects.completeOrderAndReleaseFunds);
  
  const [releaseModal, setReleaseModal] = useState<{
    orderId: Id<"orders">
  } | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitData, setChatInitData] = useState<any>(null);
  const { results: conversations } = usePaginatedQuery(api.chat.getConversations, {}, { initialNumItems: 20 });
  const totalUnread = (conversations || []).reduce((acc, c) => acc + c.unreadCount, 0);

  // Profile Picture Upload
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  const handleSelectProject = (projectId: Id<"projectRequests">) => {
    setSelectedProject(projectId);
    posthog.capture("viewed_proposals", { projectId });
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
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload image. Please try again.");
    }
  };

  const handleReleaseFunds = (orderId: Id<"orders">) => {
    setReleaseModal({ orderId });
  };

  const handleReleaseConfirm = async () => {
    if (!releaseModal) return;
    setIsReleasing(true);
    try {
      await completeOrder({ orderId: releaseModal.orderId });
      toast.success("Work approved and funds released to the freelancer!");
    } catch (error: any) {
      toast.error(error.message || "Failed to release funds. Please try again.");
    } finally {
      setIsReleasing(false);
      setReleaseModal(null);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (viewingFreelancer) {
    return <FreelancerProfile userId={viewingFreelancer} onBack={() => setViewingFreelancer(null)} />;
  }

  if (selectedProject && !viewingFreelancer) {
    return (
      <>
        <ProjectProposals
          projectId={selectedProject}
          onBack={() => setSelectedProject(null)}
          onViewProfile={setViewingFreelancer}
          clientProfile={profile}
          onChat={(freelancerId) => {
            if (onOpenChat) {
              onOpenChat({ projectId: selectedProject, clientId: profile.userId, freelancerId });
            } else {
              setChatInitData({ projectId: selectedProject, clientId: profile.userId, freelancerId });
              setIsChatOpen(true);
            }
          }}
        />
        <Suspense fallback={null}>
          <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} initialConversation={chatInitData} currentUserId={profile.userId} />
        </Suspense>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === "projects" && "My Projects"}
            {activeTab === "orders" && "My Orders"}
            {activeTab === "post-project" && "Post a Project"}
            {activeTab === "browse-services" && "Browse Services"}
            {activeTab !== "projects" && activeTab !== "post-project" && activeTab !== "orders" && activeTab !== "browse-services" && "Dashboard"}
          </h1>
          <p className="text-gray-600">
            {activeTab === "projects" && "Manage your posted project requests"}
            {activeTab === "orders" && "Track your ongoing and completed projects"}
            {activeTab === "post-project" && "Describe your project and receive proposals from talented students"}
            {activeTab === "browse-services" && "Find talented freelancers for your projects"}
            {activeTab !== "projects" && activeTab !== "post-project" && activeTab !== "orders" && activeTab !== "browse-services" &&
              "Welcome back, " + profile.firstName}
          </p>
        </div>
        <div className="relative flex gap-4">
          
          <div className="relative">
            
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications</div>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n._id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50' : ''}`} onClick={() => { if (!n.isRead) markAsRead({ notificationId: n._id }); }}>
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <span className="text-xs text-gray-500 mt-1 block">{new Date(n._creationTime).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {activeTab === 'projects' && (
        myProjects === undefined ? (
          <LoadingState message="Loading your projects..." />
        ) : (
          <ProjectList projects={myProjects} onSelectProject={handleSelectProject} onReleaseFunds={handleReleaseFunds} />
        )
      )}

      {activeTab === 'orders' && (
        myOrders === undefined ? (
          <LoadingState message="Loading your orders..." />
        ) : (
          <OrderList orders={myOrders} onOpenSupport={onOpenSupport} />
        )
      )}

      {activeTab === 'post-project' && (
        <PostProjectForm />
      )}

      {activeTab === 'browse-services' && (
        <GigBrowser userType="client" onViewProfile={setViewingFreelancer} hideHeader={true} />
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
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowProfilePhotoModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h3>
            <div className="mb-6 flex justify-center">
              <img 
                src={getProfilePictureUrl(profile.profilePictureUrl, profile.profilePicture)} 
                alt="Profile" 
                className="w-48 h-48 rounded-full object-cover border-4 border-gray-100 shadow-sm"
                onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
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
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={releaseModal !== null}
        title="Release Funds to Freelancer"
        message="Are you sure you want to approve this work and release funds to the freelancer? This action cannot be undone."
        confirmLabel="Yes, Release Funds"
        confirmVariant="success"
        isLoading={isReleasing}
        onConfirm={handleReleaseConfirm}
        onCancel={() => setReleaseModal(null)}
      />
      
    </div>
  );
}

function OrderFreelancerAvatar({ freelancer }: { freelancer: any }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <img 
        src={getProfilePictureUrl(freelancer.profilePictureUrl, freelancer.profilePicture)} 
        alt="Freelancer" 
        className="w-6 h-6 rounded-full object-cover" 
        onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
      />
      <span>{freelancer.firstName} {freelancer.lastName}</span>
    </div>
  );
}



// Component to display the list of orders
function OrderList({ orders, onOpenSupport }: { orders: any[], onOpenSupport?: (orderId?: string, projectId?: string) => void }) {
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<any | null>(null);

  const handleDispute = (orderId: string, projectId?: string) => {
    if (onOpenSupport) {
      onOpenSupport(orderId, projectId);
    }
  };

  const handleReleaseFunds = async (orderId: string) => {
    if (confirm("Are you sure you want to approve this work and release funds to the freelancer?\n\n⚠️ This action cannot be undone.")) {
      // In a real app, call a Convex mutation here.
      toast.success("Work approved and funds released to the freelancer!");
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-600">When you accept a proposal, your project will appear here.</p>
      </div>
    );
  }

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'in_progress':
      case 'active':
        return <span className="bg-blue-100 text-blue-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1"><span className="animate-pulse">⏳</span> In Progress</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">🎉 Completed</span>;
      case 'delivered':
        return <span className="bg-yellow-100 text-yellow-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">👀 Awaiting Approval</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold">Cancelled</span>;
      case 'disputed':
        return <span className="bg-red-100 text-red-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold">Disputed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold capitalize">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order._id} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 group hover:shadow-md transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{order.title}</h3>
              {order.freelancer && (
                <OrderFreelancerAvatar freelancer={order.freelancer} />
              )}
            </div>
            <div className="text-right">
              {getStatusChip(order.status)}
              <p className="text-sm text-gray-500 mt-1 font-medium">Price: ₹{order.price}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
            {order.status === 'pending_payment' && (
              <div className="mr-auto">
                <PayButton orderId={order._id} amount={order.price} />
              </div>
            )}
            <button 
              onClick={() => setViewOrder(order)}
              className="bg-blue-50 text-blue-700 border-transparent px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              View Details
            </button>
            {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'disputed' && order.status !== 'open' && order.status !== 'pending_payment' && (
              <button 
                onClick={() => handleDispute(order._id, order.projectId)}
                className="bg-red-50 text-red-700 border-transparent px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Generate Ticket
              </button>
            )}
            {order.status === 'completed' && !order.hasReviewed && order.orderId && (
              <button 
                onClick={() => setReviewOrderId(order.orderId)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
              >
                Leave Review
              </button>
            )}
            {order.status === 'completed' && order.hasReviewed && (
              <span className="text-green-800 text-sm font-medium flex items-center gap-1 bg-green-100 border-transparent px-4 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Review Submitted
              </span>
            )}
          </div>
        </div>
      ))}
      {reviewOrderId && (
        <ReviewModal orderId={reviewOrderId} onClose={() => setReviewOrderId(null)} />
      )}
      {viewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setViewOrder(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Title</h3>
                <p className="text-gray-900 font-semibold">{viewOrder.title}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{viewOrder.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Price</h3>
                  <p className="text-gray-900 font-semibold">₹{viewOrder.price}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Delivery Time</h3>
                  <p className="text-gray-900 font-semibold">{viewOrder.deliveryTime} days</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">{getStatusChip(viewOrder.status)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Leave a Review</h2>
        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-3 rounded-lg text-sm mb-6">
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
            <textarea required value={comment} onChange={(e) => setComment(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500" rows={4} placeholder="Share your experience..." />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-colors">
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Component to display the list of projects
function ProjectList({ projects, onSelectProject, onReleaseFunds }: { projects: any[], onSelectProject: (id: Id<"projectRequests">) => void, onReleaseFunds: (orderId: Id<"orders">) => void }) {
  if (projects.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
        <p className="text-gray-600">Post your first project to start receiving proposals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project._id} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 group hover:shadow-md transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
              <p className="text-gray-600 mb-3">{project.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {project.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <p className="font-medium text-gray-600">{project.proposalCount} proposals</p>
              {project.status === 'in_progress' && project.orderId && project.orderStatus !== 'completed' ? (
                <button
                  onClick={() => onReleaseFunds(project.orderId)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors whitespace-nowrap"
                >
                  ✓ Release Funds
                </button>
              ) : project.status === 'completed' ? (
                <span className="bg-green-100 text-green-800 border-transparent px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap">🎉 Completed</span>
              ) : (
                <button
                  onClick={() => onSelectProject(project._id)}
                  disabled={project.status !== 'open'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {project.status === 'open' ? 'View Proposals' : `Project ${project.status.replace('_', ' ')}`}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectProposals({
  projectId,
  onBack,
  onViewProfile,
  clientProfile,
  onChat
}: {
  projectId: Id<"projectRequests">;
  onBack: () => void;
  onViewProfile: (userId: Id<"users">) => void;
  clientProfile: any;
  onChat: (userId: Id<"users">) => void;
}) {
  const proposals = useQuery(api.projectRequests.getProposalsForProject, { projectId }) || [];
  const project = useQuery(api.projects.getProjectById, { projectId });
  const recommendations = useQuery(api.recommendations.getRecommendedFreelancers, { projectId }) || [];


  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Projects
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposals for {project?.title}</h1>
        <p className="text-gray-600">Review proposals from freelancers for your project.</p>
      </div>
      {proposals.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals yet</h3>
          <p className="text-gray-600">You will be notified when freelancers submit proposals for this project.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => (
            <div key={p._id} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 group hover:shadow-md transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg text-gray-900">{p.freelancerName}</p>
                  <p className="text-gray-600">Proposed Price: <span className="font-medium text-blue-600">₹{p.proposedPrice}</span></p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold px-2 py-1 border rounded-full ${
                    p.status === 'accepted' ? 'bg-green-100 text-green-800 border-transparent' : 
                    p.status === 'payment_pending' ? 'bg-yellow-100 text-yellow-800 border-transparent' :
                    'bg-gray-100 text-gray-800 border-transparent'
                  }`}>
                    {p.status === 'payment_pending' ? 'Payment Pending' : p.status}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-700 mb-2">{p.coverLetter}</p>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4">
                {project?.status === 'open' && p.status !== 'accepted' && p.status !== 'rejected' && (
                  <div className="mb-4">
                    <ProposalActions 
                      proposalId={p._id}
                      amount={p.proposedPrice}
                      clientName={`${clientProfile.firstName} ${clientProfile.lastName}`}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <button onClick={() => onChat(p.freelancerId)} className="bg-blue-50 border border-blue-100 text-blue-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors flex items-center gap-2">
                    <span>💬 Chat</span>
                  </button>
                  <button onClick={() => onViewProfile(p.freelancerId)} className="bg-gray-50 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Recommendations Section */}
      {project?.status === 'open' && (
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recommended Freelancers</h2>
              <p className="text-gray-600 text-sm">Top matches based on skills, rating, and college.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {recommendations.map((freelancer) => (
              <div key={freelancer._id} className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm hover:shadow-md transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={getProfilePictureUrl(undefined, freelancer.profilePicture)} 
                      className="w-12 h-12 rounded-full object-cover" 
                      onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{freelancer.firstName} {freelancer.lastName}</h3>
                      <p className="text-xs text-blue-600 font-medium">{Math.round(freelancer.score)}% Match Score</p>
                    </div>
                  </div>
                  <button onClick={() => onViewProfile(freelancer.userId)} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">View Profile</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {freelancer.skills?.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-md">{s}</span>
                  ))}
                </div>
                <button onClick={() => onChat(freelancer.userId)} className="w-full mt-4 bg-blue-50 border border-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                  Message Freelancer
                </button>
              </div>
            ))}
            {recommendations.length === 0 && (
              <p className="text-gray-500 italic col-span-2">No specific recommendations found for this project yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component to display a freelancer's public profile
function FreelancerProfile({ userId, onBack }: { userId: Id<"users">, onBack: () => void }) {
  const profileData = useQuery(api.projects.getFreelancerPublicProfile, { userId });
  const [hireGig, setHireGig] = useState<any | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (!profileData) {
    return <div>Loading profile...</div>;
  }

  const { profile, completedProjects, reviews, activityMap = {}, gigs = [] } = profileData as any;
  if (!profile) {
    return <div>Freelancer profile not found.</div>;
  }

  // Calculate completeness
  let completeness = 0;
  if (profile.firstName) completeness += 20;
  if (profile.bio) completeness += 20;
  if (profile.skills && profile.skills.length > 0) completeness += 20;
  if (profile.collegeName) completeness += 20;
  if (profile.profilePicture) completeness += 20;

  // Determine Level
  let level = "Novice";
  if (completedProjects.length >= 10) level = "Top Talent";
  else if (completedProjects.length >= 3) level = "Rising Star";

  // Calculate Success Rate (Mocked/Basic calculation for now)
  const successRate = 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Helmet>
        <title>{profile.firstName} {profile.lastName} - {profile.tagline || "Student Freelancer"} | CollegeGig</title>
        <meta name="description" content={`Hire ${profile.firstName} ${profile.lastName}, a verified student freelancer from ${profile.collegeName || 'India'}. ${profile.bio?.substring(0, 150) || 'Check out my portfolio and hire me for your next project.'}`} />
        <meta name="keywords" content={`hire ${profile.firstName}, college students freelancing India, student web developer India`} />
      </Helmet>
      <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium mb-4">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back
      </button>
      
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Basic Info & Avatar */}
          <div className="md:w-1/3 flex flex-col items-center text-center">
            <img 
              src={getProfilePictureUrl(undefined, profile.profilePicture)} 
              alt="Freelancer" 
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4" 
              onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
            />
            <h1 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
            <p className="text-gray-600 font-medium">{profile.tagline || "Student Freelancer"}</p>
            
            <div className="mt-2 text-sm text-gray-500">
              <p>{profile.collegeName || "College not specified"}</p>
              {profile.graduationYear && <p>Class of {profile.graduationYear}</p>}
            </div>

            {profile.isVerified && (
              <div className="mt-4 bg-green-100 border border-transparent text-green-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span>✓</span> Verified Student
              </div>
            )}
            
            <div className="mt-4 bg-blue-50 border border-blue-100 text-blue-800 px-4 py-2 rounded-lg w-full">
              <p className="text-sm font-semibold mb-1">Freelancer Tier</p>
              <p className="text-lg font-bold">{level}</p>
            </div>
          </div>

          {/* Right Column: Stats & LeetCode Style Progress */}
          <div className="md:w-2/3 space-y-6">
            {/* Gamification & Progress */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Profile Completeness</span>
                <span className="text-sm font-bold text-blue-600">{completeness}%</span>
              </div>
              <div className="w-full bg-gray-200 border border-transparent rounded-full h-2.5 overflow-hidden">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${completeness}%` }}></div>
              </div>
              {completeness < 100 && (
                <p className="text-xs text-gray-500 mt-2">Add more details like a bio or profile picture to reach 100%.</p>
              )}
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Rating</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-bold text-gray-900">{profile.averageRating ? profile.averageRating.toFixed(1) : "New"}</span>
                  <span className="text-yellow-400 text-lg">★</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Completed</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-bold text-gray-900">{completedProjects.length}</span>
                  <span className="text-gray-400 text-lg">💼</span>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Success</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-bold text-gray-900">{profileData?.onTimeRate !== undefined ? profileData.onTimeRate + '%' : 'N/A'}</span>
                  <span className="text-green-500 text-lg">📈</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">On-Time Delivery</p>
              </div>
            </div>

            {/* About Me */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">About Me</h3>
              <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                {profile.bio || "No bio provided."}
              </p>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.length ? profile.skills.map((skill: string) => (
                  <span key={skill} className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                    {skill}
                  </span>
                )) : <span className="text-gray-500 text-sm">No skills listed.</span>}
              </div>
            </div>
          </div>
        </div>

        {/* LeetCode Style Activity Graph (Mocked for visual representation) */}
        <div className="border-t border-gray-200 pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Map</h3>
          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-6">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h4 className="font-semibold text-gray-800 text-lg">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h4>
              <button 
                onClick={handleNextMonth} 
                disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-1">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                
                const days = [];
                for (let i = 0; i < firstDayOfMonth; i++) {
                  days.push(null);
                }
                for (let i = 1; i <= daysInMonth; i++) {
                  days.push(new Date(year, month, i));
                }
                while (days.length % 7 !== 0) {
                  days.push(null);
                }

                return days.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="h-10 sm:h-12"></div>;
                  
                  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const count = activityMap[dateStr] || 0;
                  
                  let intensity = 0;
                  if (count > 0 && count <= 2) intensity = 1;
                  else if (count > 2 && count <= 5) intensity = 2;
                  else if (count > 5 && count <= 10) intensity = 3;
                  else if (count > 10) intensity = 4;

                  const colors = ["bg-white border-gray-200", "bg-green-100 border-green-200", "bg-green-300 border-green-400", "bg-green-500 border-green-600", "bg-green-700 border-green-800"];
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`h-10 sm:h-12 rounded-md flex items-center justify-center text-xs font-medium border transition-all hover:scale-105 cursor-default ${colors[intensity]} ${intensity > 2 ? 'text-white' : 'text-gray-700'} shadow-sm`}
                      title={`${count} activities on ${date.toLocaleDateString()}`}
                    >
                      {date.getDate()}
                    </div>
                  )
                });
              })()}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200">
              <span>Less Activity</span>
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded shadow-sm border border-gray-200 bg-white"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-200 bg-green-100"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-400 bg-green-300"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-600 bg-green-500"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-800 bg-green-700"></div>
              </div>
              <span>More Activity</span>
            </div>
          </div>
        </div>

        {/* Client Reviews */}
        <div className="border-t border-gray-200 pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Client Reviews ({reviews?.length || 0})</h3>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review._id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 border border-transparent rounded-full flex items-center justify-center font-bold text-sm">
                        {review.reviewerName.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-900">{review.reviewerName}</span>
                    </div>
                    <div className="flex text-yellow-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center border border-dashed border-gray-200">
              No reviews yet. Be the first to hire and review!
            </p>
          )}
        </div>

        {/* Portfolio Section */}
        <div className="border-t border-gray-200 pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Portfolio</h3>
          {profile.portfolioItems && profile.portfolioItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.portfolioItems.map((item: any) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow group">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-40 object-cover" 
                      onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 border-b border-gray-200 flex items-center justify-center">
                      <span className="text-4xl text-gray-300">🖼️</span>
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3 flex-1">{item.description}</p>
                    {item.link && (
                      <a href={item.link.startsWith('http') ? item.link : `https://${item.link}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline transition-colors mt-4 flex items-center gap-1 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        View Project
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center border border-dashed border-gray-200">
              No portfolio items added yet.
            </p>
          )}
        </div>

        {/* Services Offered (Gigs) */}
        {gigs && gigs.length > 0 && (
          <div className="border-t border-gray-200 pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Services Offered</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gigs.map((gig: any) => (
                <div key={gig._id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 line-clamp-1">{gig.title}</h4>
                    <span className="text-green-600 font-bold">₹{gig.basePrice}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{gig.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm text-gray-500">
                    <span>⏱️ {gig.deliveryTime} days</span>
                    <button onClick={() => setHireGig(gig)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
                      Hire Me
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Projects Catalog */}
        <div className="border-t border-gray-200 pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Completed Projects</h3>
          {completedProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {completedProjects.map((project: any) => (
                <div key={project._id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 line-clamp-1">{project.title}</h4>
                    <span className="bg-green-100 border border-transparent text-green-800 text-xs px-2 py-1 rounded-full font-semibold">Completed</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 flex-1">{project.description}</p>
                  
                  {project.review && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-yellow-400 text-sm">
                          {'★'.repeat(project.review.rating)}{'☆'.repeat(5 - project.review.rating)}
                        </span>
                        <span className="text-xs font-semibold text-gray-700 ml-1">Client Review</span>
                      </div>
                      <p className="text-sm text-gray-600 italic">"{project.review.comment}"</p>
                    </div>
                  )}

                <div className="mt-4 flex justify-end border-t border-gray-200 pt-3">
                  <span className="text-xs bg-gray-100 border border-transparent text-gray-600 px-2 py-1 rounded-lg">{project.category}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center border border-dashed border-gray-200">
              This freelancer hasn't completed any platform projects yet.
            </p>
          )}
        </div>

      </div>
      {hireGig && <DirectHireModal gig={hireGig} onClose={() => setHireGig(null)} />}
    </div>
  );
}

function DirectHireModal({ gig, onClose }: { gig: any, onClose: () => void }) {
  const createDirectOrder = useMutation(api.projects.createDirectOrder);
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);

  const [formData, setFormData] = useState({
    title: `Direct Order: ${gig.title}`,
    description: `I would like to hire you for your service "${gig.title}". Here are my specific requirements:\n\n`,
    price: gig.basePrice,
    deliveryTime: gig.deliveryTime,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price < 5) return toast.error("Minimum order price is ₹5");

    setIsLoading(true);
    try {
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
      if (!razorpayKeyId) {
        toast.error(
          "Payment system is not configured. Please contact support."
        );
        return;
      }

      const orderId = await createDirectOrder({
        freelancerId: gig.freelancerId,
        gigId: gig._id,
        title: formData.title,
        description: formData.description,
        price: formData.price,
        deliveryTime: formData.deliveryTime,
      });

      const razorpayOrderId = await createRazorpayOrder({ orderId });

      const options = {
        key: razorpayKeyId,
        amount: Math.round(formData.price * 100),
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Direct Order",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          toast.success("Payment received! Your order will activate shortly.", { duration: 6000 });
          onClose();
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate direct hire");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-transparent rounded-lg shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Hire for: {gig.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Title</label>
            <input required type="text" value={formData.title} onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))} className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements & Instructions</label>
            <textarea required rows={4} value={formData.description} onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))} className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input required type="number" min="5" value={formData.price} onChange={(e) => setFormData(prev => ({...prev, price: parseInt(e.target.value) || 0}))} className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery (Days)</label>
              <input required type="number" min="1" value={formData.deliveryTime} onChange={(e) => setFormData(prev => ({...prev, deliveryTime: parseInt(e.target.value) || 1}))} className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm flex gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Secure Escrow Payment</p>
              <p className="text-blue-800">Your ₹{formData.price} payment will be held securely in escrow and released to the freelancer only after you approve the delivered work.</p>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
            {isLoading ? "Processing..." : `Pay ₹${formData.price.toLocaleString("en-IN")} & Start Order`}
          </button>
          <PaymentMethodBadges />
        </form>
      </div>
    </div>
  );
}

function PostProjectForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    skills: [] as string[],
    deadline: "",
  });

  const categories = useQuery(api.categories.getCategories, {}) || [];
  const createProject = useMutation(api.projects.createProject);
  const logActivity = useMutation((api as any).logs.logActivity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.deadline) {
      toast.error("Please select a deadline");
      return;
    }

    try {
      const projectId = await createProject({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        deadline: new Date(formData.deadline).getTime(),
        skills: formData.skills,
      });

      await logActivity({
        action: "Project Created",
        details: `Project "${formData.title}" created`,
        relatedId: projectId,
      });

      toast.success("Project posted successfully!");
      posthog.capture("project_posted", { category: formData.category });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        skills: [],
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
    <div className="bg-white border border-transparent rounded-lg shadow-sm p-6">
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
              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
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
              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                  className="bg-blue-100 border border-transparent text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
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
              className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div className="bg-blue-50 border border-transparent p-4 rounded-lg">
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
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Post Project
          </button>
        </form>
    </div>
  );
}
