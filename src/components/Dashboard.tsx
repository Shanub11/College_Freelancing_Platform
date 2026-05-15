import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import posthog from "posthog-js";

const GigBrowser = lazy(() => import("./GigBrowser").then(m => ({ default: m.GigBrowser })));
const FreelancerDashboard = lazy(() => import("./FreelancerDashboard").then(m => ({ default: m.FreelancerDashboard })));
const ClientDashboard = lazy(() => import("./ClientDashboard").then(m => ({ default: m.ClientDashboard })));
const AdminDashboard = lazy(() => import("./AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const VerificationUpload = lazy(() => import("./VerificationUpload").then(m => ({ default: m.VerificationUpload })));
const ChatInterface = lazy(() => import("./Chat").then(m => ({ default: m.ChatInterface })));

interface DashboardProps {
  profile: any;
}

export function Dashboard({ profile }: DashboardProps) {
  // Check if user is admin
  const isAdmin = useQuery(api.profiles.checkIsAdmin);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [supportOrderId, setSupportOrderId] = useState<string | null>(null);
  const [supportProjectId, setSupportProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const verificationStatus = useQuery(api.profiles.getVerificationStatus);
  // Profile Picture Upload
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const logActivity = useMutation((api as any).logs.logActivity);

  // Notifications
  const notifications = useQuery(api.proposals.getNotifications, {});
  const markAsRead = useMutation(api.proposals.markAsRead);
  const markAllAsRead = useMutation(api.proposals.markAllAsRead);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = (notifications || []).filter((n: any) => !n.isRead).length;

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitData, setChatInitData] = useState<any>(null);
  const { results: conversations } = usePaginatedQuery(api.chat.getConversations, {}, { initialNumItems: 20 });
  const totalUnread = (conversations || []).reduce((acc, c) => acc + c.unreadCount, 0);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Log User Login
  useEffect(() => {
    const hasLogged = sessionStorage.getItem("hasLoggedLogin");
    if (!hasLogged && profile) {
      logActivity({
        action: "User Login",
        details: `User ${profile.firstName} ${profile.lastName} logged in`,
      });
      sessionStorage.setItem("hasLoggedLogin", "true");
      
      // Identify user in PostHog
      posthog.identify(profile.userId, {
        name: `${profile.firstName} ${profile.lastName}`,
        userType: profile.userType,
        college: profile.collegeName
      });
      posthog.capture("user_logged_in");
    }
  }, [profile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size before upload (max 5MB for profile pictures)
    const MAX_PROFILE_PIC_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_PROFILE_PIC_SIZE) {
      toast.error(
        "Profile picture must be smaller than 5MB. " + 
        "Please choose a smaller image."
      );
      // Reset the file input so user can try again
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
      await updateProfile({ profilePicture: storageId });
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    }
  };

  // Set the initial tab after isAdmin query has resolved.
  useEffect(() => {
    // This effect runs when isAdmin is no longer undefined (i.e., loaded).
    if (isAdmin !== undefined) {
      setActiveTab(isAdmin ? "admin" : "browse");
    }
  }, [isAdmin]);

  const handleOpenSupport = (orderId?: string, projectId?: string) => {
    setSupportOrderId(orderId || null);
    setSupportProjectId(projectId || null);
    setActiveTab("support");
  };

  let tabs = [];
  if (profile.userType === "admin") {
    tabs = [{ id: "admin", label: "Admin Panel", icon: "⚙️" }];
  } else if (profile.userType === "freelancer") {
    tabs = [
      { id: "browse", label: "Browse Projects", icon: "🔍" },
      { id: "my-gigs", label: "My Gigs", icon: "💼" },
      { id: "orders", label: "Orders", icon: "📋" },
      { id: "earnings", label: "Earnings", icon: "💰" },
      { id: "profile", label: "My Profile", icon: "👤" },
      { id: "support", label: "Help & Support", icon: "🎧" },
    ];
    // If freelancer is not verified, add verification tab
    if (!profile.isVerified) {
      tabs.unshift({ id: "verification", label: "Verify Account", icon: "🛡️" });
    }
  } else { // client
    tabs = [
      { id: "browse", label: "Browse Services", icon: "🔍" },
      { id: "projects", label: "My Projects", icon: "📋" },
      { id: "orders", label: "Orders", icon: "💼" },
      { id: "post-project", label: "Post Project", icon: "➕" },
      { id: "profile", label: "My Profile", icon: "👤" },
      { id: "support", label: "Help & Support", icon: "🎧" },
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-200 border-b ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-md border-gray-200' : 'bg-white shadow-sm border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Hamburger menu - only visible on mobile */}
              <button
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 
                           hover:text-gray-900 transition-colors focus:outline-none"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Go to top"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <span className="text-xl font-bold text-gray-900">CollegeGig</span>
              </div>
              
              {profile.userType === "freelancer" && !profile.isVerified && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  verificationStatus?.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  verificationStatus?.status === "rejected" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {verificationStatus?.status === "pending" ? "Verification Pending" :
                   verificationStatus?.status === "rejected" ? "Verification Rejected" :
                   "Unverified"}
                </div>
              )}
              
              {profile.userType === "freelancer" && profile.isVerified && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <span>✓</span>
                  <span>Verified Student</span>
                </div>
              )}

              {isAdmin && (
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <span>⚙️</span>
                  <span>Admin</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative flex gap-4 mr-2">
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
                        {!notifications ? (
                          <div className="p-4 text-center text-gray-500 animate-pulse">Loading...</div>
                        ) : notifications.length === 0 ? (
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
              </div>
              <div className="relative">
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  title="Profile Menu"
                >
                  {profile.profilePictureUrl ? (
                    <img 
                      src={profile.profilePictureUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover" 
                      onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {profile.firstName?.[0]}{profile.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </div>

                {showProfileMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                      <p className="font-bold text-gray-800 truncate">{profile.firstName} {profile.lastName}</p>
                      <p className="text-xs font-medium mt-1 text-gray-500 capitalize">
                        {profile.userType}
                        {profile.userType === "freelancer" && (
                          <span className={profile.isVerified ? "text-green-600" : "text-yellow-600"}>
                            {profile.isVerified ? " • Verified" : " • Unverified"}
                          </span>
                        )}
                        {profile.userType === "admin" && <span className="text-purple-600"> • Admin</span>}
                      </p>
                    </div>
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          setActiveTab("profile");
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        View Profile
                      </button>
                      <div 
                        onClickCapture={() => {
                          logActivity({
                            action: "User Logout",
                            details: `User ${profile.firstName} ${profile.lastName} logged out`,
                          });
                          sessionStorage.removeItem("hasLoggedLogin");
                          posthog.reset(); // Clear PostHog session on logout
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <SignOutButton />
                      </div>
                    </div>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar backdrop overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          
          {/* Sidebar - slides in on mobile, static on desktop */}
          <div
            className={`
              fixed md:static
              inset-y-0 left-0
              z-40 md:z-10
              w-64 flex-shrink-0
              bg-white md:bg-transparent
              shadow-xl md:shadow-none
              transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
              md:translate-x-0
              md:sticky md:top-24 md:self-start
              overflow-y-auto md:overflow-visible
            `}
          >
            {/* Mobile sidebar header with close button */}
            <div className="flex items-center justify-between p-4 border-b md:hidden">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center 
                                justify-center">
                  <span className="text-white font-bold text-xs">CG</span>
                </div>
                <span className="font-bold text-gray-900">CollegeGig</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 
                           hover:text-gray-900 transition-colors"
                aria-label="Close navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="bg-white rounded-lg shadow-sm p-4 md:shadow-sm pb-safe-area-inset-bottom">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsSidebarOpen(false); // Close sidebar on mobile after selection
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
            {/* Show a loading state until the active tab is determined */}
            {activeTab === null && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
            {activeTab === "browse" && profile.userType !== "client" && <GigBrowser userType={profile.userType} />}
            {activeTab === "admin" && profile.userType === "admin" && <AdminDashboard adminId={profile.userId} onOpenChat={(data) => { setChatInitData(data); setIsChatOpen(true); }} />}
            {profile.userType === "freelancer" && (
              <>
                {activeTab === "verification" && <VerificationUpload profile={profile} />}
                {activeTab === "my-gigs" && <FreelancerDashboard profile={profile} activeTab="gigs" />}
                {activeTab === "orders" && <FreelancerDashboard profile={profile} activeTab="orders" onOpenSupport={handleOpenSupport} />}
                {activeTab === "earnings" && <FreelancerDashboard profile={profile} activeTab="earnings" />}
              </>
            )}
            {profile.userType === "client" && (
              <>
                {activeTab === "browse" && <ClientDashboard profile={profile} activeTab="browse-services" />}
                {activeTab === "projects" && <ClientDashboard profile={profile} activeTab="projects" onOpenChat={(data) => { setChatInitData(data); setIsChatOpen(true); }} />}
                {activeTab === "orders" && <ClientDashboard profile={profile} activeTab="orders" onOpenSupport={handleOpenSupport} />}
                {activeTab === "post-project" && <ClientDashboard profile={profile} activeTab="post-project" />}
              </>
            )}
            {activeTab === "profile" && <UserProfile profile={profile} onEditPhoto={() => setShowProfilePhotoModal(true)} />}
            {activeTab === "support" && <SupportTicketForm initialOrderId={supportOrderId} initialProjectId={supportProjectId} />}
            </Suspense>
          </div>
        </div>
      </div>

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
              {profile.profilePictureUrl ? (
                <img 
                  src={profile.profilePictureUrl} 
                  alt="Profile" 
                  className="w-48 h-48 rounded-full object-cover border-4 border-gray-100"
                  onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-100">
                  <span className="text-4xl font-medium text-gray-500">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
              )}
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
    </div>
  );
}

function SupportTicketForm({ initialOrderId, initialProjectId }: { initialOrderId?: string | null, initialProjectId?: string | null }) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openDispute = useMutation((api as any).disputes.openDispute);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await openDispute({
        orderId: initialOrderId || undefined,
        projectId: initialProjectId || undefined,
        reason
      });
      toast.success("Support ticket generated successfully. An admin will review it soon.");
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto mt-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Help & Support</h2>
      
      {(initialOrderId || initialProjectId) && (
        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg mb-6 text-sm">
          <strong>Note:</strong> You are submitting a ticket regarding a specific {initialOrderId ? "Order" : "Project"}. The details have been attached automatically.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How can we help you?
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={6}
            placeholder="Describe your issue in detail..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}

function UserProfile({ profile, onEditPhoto }: { profile: any, onEditPhoto: () => void }) {
  const profileData = useQuery(api.projects.getFreelancerPublicProfile, { userId: profile.userId });
  const clientProfileData = useQuery((api as any).projects?.getClientPublicProfile, profile.userType === "client" ? { userId: profile.userId } : "skip");
  
  const [bio, setBio] = useState(profile.bio || "");
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [portfolioItems, setPortfolioItems] = useState<any[]>(profile.portfolioItems || []);
  const [company, setCompany] = useState(profile.company || "");
  const [identity, setIdentity] = useState(profile.identity || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [linkedin, setLinkedin] = useState(profile.linkedin || "");
  const [industry, setIndustry] = useState(profile.industry || "");
  const [teamSize, setTeamSize] = useState(profile.teamSize || "");
  const [hiringPreferences, setHiringPreferences] = useState<string[]>(profile.hiringPreferences || []);
  const [preferredCommunication, setPreferredCommunication] = useState(profile.preferredCommunication || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    description: "",
    link: "",
    image: null as string | null,
    imageUrl: null as string | null,
  });
  const [isUploadingPortfolioImage, setIsUploadingPortfolioImage] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  useEffect(() => {
    setBio(profile.bio || "");
    setSkills(profile.skills || []);
    setPortfolioItems(profile.portfolioItems || []);
    setCompany(profile.company || "");
    setIdentity(profile.identity || "");
    setWebsite(profile.website || "");
    setLinkedin(profile.linkedin || "");
    setIndustry(profile.industry || "");
    setTeamSize(profile.teamSize || "");
    setHiringPreferences(profile.hiringPreferences || []);
    setPreferredCommunication(profile.preferredCommunication || "");
  }, [profile]);

  const hasChanges = 
    bio !== (profile.bio || "") || 
    JSON.stringify(skills) !== JSON.stringify(profile.skills || []) ||
    JSON.stringify(portfolioItems.map((i: any) => ({ id: i.id, title: i.title, description: i.description, link: i.link || undefined, image: i.image || undefined }))) !== JSON.stringify(profile.portfolioItems || []) ||
    company !== (profile.company || "") ||
    identity !== (profile.identity || "") ||
    website !== (profile.website || "") ||
    linkedin !== (profile.linkedin || "") ||
    industry !== (profile.industry || "") ||
    teamSize !== (profile.teamSize || "") ||
    JSON.stringify(hiringPreferences) !== JSON.stringify(profile.hiringPreferences || []) ||
    preferredCommunication !== (profile.preferredCommunication || "");

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        bio,
        skills: profile.userType === "freelancer" ? skills : undefined,
        portfolioItems: profile.userType === "freelancer" ? portfolioItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          link: item.link || undefined,
          image: item.image || undefined,
        })) : undefined,
        company: profile.userType === "client" ? company : undefined,
        identity: profile.userType === "client" ? identity : undefined,
        website: profile.userType === "client" ? website : undefined,
        linkedin: profile.userType === "client" ? linkedin : undefined,
        industry: profile.userType === "client" ? industry : undefined,
        teamSize: profile.userType === "client" ? teamSize : undefined,
        hiringPreferences: profile.userType === "client" ? hiringPreferences : undefined,
        preferredCommunication: profile.userType === "client" ? preferredCommunication : undefined,
      });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s: string) => s !== skill));
  };

  if (profile.userType === "freelancer") {
    if (!profileData) return <div className="text-center p-8 text-gray-500">Loading profile...</div>;
    
    const { completedProjects, reviews, activityMap = {} } = profileData as any;

    // Calculate completeness
    let completeness = 0;
    if (profile.firstName) completeness += 20;
    if (profile.bio) completeness += 20;
    if (profile.skills && profile.skills.length > 0) completeness += 20;
    if (profile.collegeName) completeness += 20;
    if (profile.profilePictureUrl) completeness += 20;

    // Determine Level
    let level = "Novice";
    if (completedProjects.length >= 10) level = "Top Talent";
    else if (completedProjects.length >= 3) level = "Rising Star";

    const successRate = 100; // Can be enhanced later via order history metrics

    return (
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto mt-4 relative">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Basic Info & Avatar */}
          <div className="md:w-1/3 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={onEditPhoto}>
              {profile.profilePictureUrl ? (
                <img 
                  src={profile.profilePictureUrl} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity" 
                  onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity">
                  <span className="text-4xl font-medium text-gray-500">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">Change Photo</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
            <p className="text-gray-600 font-medium capitalize">{profile.tagline || "Student Freelancer"}</p>
            
            <div className="mt-2 text-sm text-gray-500">
              <p>{profile.collegeName || "College not specified"}</p>
              {profile.graduationYear && <p>Class of {profile.graduationYear}</p>}
            </div>

            {profile.isVerified && (
              <div className="mt-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <span>✓</span> Verified Student
              </div>
            )}
            
            <div className="mt-4 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg w-full">
              <p className="text-sm font-semibold mb-1">Freelancer Tier</p>
              <p className="text-lg font-bold">{level}</p>
            </div>
          </div>

          {/* Right Column: Stats & LeetCode Style Progress */}
          <div className="md:w-2/3 space-y-6">
            {/* Gamification & Progress */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Profile Completeness</span>
                <span className="text-sm font-bold text-blue-600">{completeness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${completeness}%` }}></div>
              </div>
              {completeness < 100 && (
                <p className="text-xs text-gray-500 mt-2">Add more details like a bio or profile picture to reach 100%.</p>
              )}
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Rating</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-bold text-gray-900">{profile.averageRating ? profile.averageRating.toFixed(1) : "New"}</span>
                  <span className="text-yellow-400 text-lg">★</span>
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Completed</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl font-bold text-gray-900">{completedProjects.length}</span>
                  <span className="text-gray-400 text-lg">💼</span>
                </div>
              </div>
              <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
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
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white shadow-sm min-h-[100px]" 
                placeholder="Tell us about yourself..." 
              />
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map((skill: string) => (
                  <span key={skill} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <span>{skill}</span>
                    <button type="button" onClick={() => removeSkill(skill)} className="text-blue-600 hover:text-blue-800">×</button>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Portfolio Editing */}
            <div className="mt-8 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Portfolio</h3>
                <button 
                  onClick={() => setIsAddingPortfolio(true)}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium"
                >
                  + Add Project
                </button>
              </div>

              {isAddingPortfolio && (
                <div className="bg-gray-50 p-4 rounded-lg border mb-4">
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Project Title *" 
                      value={newPortfolioItem.title} 
                      onChange={e => setNewPortfolioItem({...newPortfolioItem, title: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea 
                      placeholder="Description *" 
                      value={newPortfolioItem.description} 
                      onChange={e => setNewPortfolioItem({...newPortfolioItem, description: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <input 
                      type="text" 
                      placeholder="Link (e.g. GitHub or Live Demo)" 
                      value={newPortfolioItem.link} 
                      onChange={e => setNewPortfolioItem({...newPortfolioItem, link: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 bg-white border px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                        {isUploadingPortfolioImage ? "Uploading..." : newPortfolioItem.image ? "Change Image" : "Upload Image"}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                          // Validate file size (max 5MB for portfolio images)
                          const MAX_PORTFOLIO_SIZE = 5 * 1024 * 1024;
                          if (file.size > MAX_PORTFOLIO_SIZE) {
                            toast.error("Portfolio image must be smaller than 5MB.");
                            e.target.value = "";
                            return;
                          }

                            try {
                              setIsUploadingPortfolioImage(true);
                              const compressedFile = await compressImage(file, 800, 800, 0.8);
                              const postUrl = await generateUploadUrl();
                              const result = await fetch(postUrl, {
                                method: "POST",
                                headers: { "Content-Type": compressedFile.type },
                                body: compressedFile,
                              });
                              const { storageId } = await result.json();
                              const objectUrl = URL.createObjectURL(file);
                              setNewPortfolioItem(prev => ({ ...prev, image: storageId, imageUrl: objectUrl }));
                            } catch (err) {
                              toast.error("Failed to upload image");
                            } finally {
                              setIsUploadingPortfolioImage(false);
                            }
                          }}
                          disabled={isUploadingPortfolioImage}
                        />
                      </label>
                      {newPortfolioItem.imageUrl && (
                        <img 
                          src={newPortfolioItem.imageUrl} 
                          alt="Preview" 
                          className="h-10 w-10 object-cover rounded border" 
                          onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                        />
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button 
                        onClick={() => {
                          setIsAddingPortfolio(false);
                          setNewPortfolioItem({ title: "", description: "", link: "", image: null, imageUrl: null });
                        }} 
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          if (!newPortfolioItem.title.trim() || !newPortfolioItem.description.trim()) {
                            toast.error("Title and description are required.");
                            return;
                          }
                          setPortfolioItems([...portfolioItems, { 
                            id: Math.random().toString(36).substring(2, 9), 
                            ...newPortfolioItem 
                          }]);
                          setNewPortfolioItem({ title: "", description: "", link: "", image: null, imageUrl: null });
                          setIsAddingPortfolio(false);
                        }} 
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        Save Project
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolioItems.map((item: any) => (
                    <div key={item.id} className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col relative group">
                      <button 
                        onClick={() => {
                          setNewPortfolioItem({ title: item.title, description: item.description, link: item.link || "", image: item.image || null, imageUrl: item.imageUrl || null });
                          setPortfolioItems(portfolioItems.filter(i => i.id !== item.id));
                          setIsAddingPortfolio(true);
                        }}
                        className="absolute top-2 right-11 bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        title="Edit project"
                      >
                        ✎
                      </button>
                      <button 
                        onClick={() => setPortfolioItems(portfolioItems.filter(i => i.id !== item.id))}
                        className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        title="Delete project"
                      >
                        ✕
                      </button>
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-32 object-cover" 
                          onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center border-b">
                          <span className="text-4xl text-gray-300">🖼️</span>
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-bold text-gray-900 line-clamp-1">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 flex-1">{item.description}</p>
                        {item.link && (
                          <a href={item.link.startsWith('http') ? item.link : `https://${item.link}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline mt-3 flex items-center gap-1 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Link
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No portfolio items added yet.</p>
              )}
            </div>
            
            {hasChanges && (
              <div className="flex justify-end mt-4">
                <button 
                  onClick={handleSaveChanges} 
                  disabled={isSubmitting} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LeetCode Style Activity Graph */}
        <div className="border-t pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Map</h3>
          <div className="bg-gray-50 p-6 rounded-lg border">
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

            <div className="flex justify-between items-center text-xs text-gray-500 mt-6 pt-4 border-t">
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
        <div className="border-t pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Client Reviews ({reviews?.length || 0})</h3>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review._id} className="bg-white border rounded-lg p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
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
            <p className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center border border-dashed">
              No reviews yet. Complete projects to get reviews!
            </p>
          )}
        </div>

        {/* Completed Projects Catalog */}
        <div className="border-t pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Completed Projects</h3>
          {completedProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {completedProjects.map((project: any) => (
                <div key={project._id} className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 line-clamp-1">{project.title}</h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">Completed</span>
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

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{project.category}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 bg-gray-50 p-6 rounded-lg text-center border border-dashed">
              You haven't completed any platform projects yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  const clientData = clientProfileData || { postedProjectsCount: 0, completedHiresCount: 0 };

  // Fallback for Client or Admin view
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto mt-4 relative">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Basic Info & Avatar */}
        <div className="md:w-1/3 flex flex-col items-center text-center">
          <div className="relative group cursor-pointer" onClick={onEditPhoto}>
            {profile.profilePictureUrl ? (
              <img 
                src={profile.profilePictureUrl} 
                alt="Profile" 
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity" 
                onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity">
                <span className="text-4xl font-medium text-gray-500">
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">Change Photo</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
          <p className="text-gray-600 font-medium capitalize">{profile.userType}</p>
          
          {profile.isVerified && (
            <div className="mt-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <span>✓</span> Verified {profile.userType === "freelancer" ? "Student" : "User"}
            </div>
          )}

          {profile.paymentVerified && (
            <div className="mt-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <span>💳</span> Payment Verified
            </div>
          )}

          {profile.userType === "client" && (
            <div className="mt-6 w-full text-left bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Client Stats</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Projects Posted</span>
                  <span className="font-semibold text-gray-900">{clientData.postedProjectsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed Hires</span>
                  <span className="font-semibold text-gray-900">{clientData.completedHiresCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Rating</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    {profile.averageRating ? profile.averageRating.toFixed(1) : "New"} <span className="text-yellow-400">★</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="md:w-2/3 space-y-6">
          {/* About Me */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">About Me</h3>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white shadow-sm min-h-[100px]" 
              placeholder="Tell us about yourself..." 
            />
          </div>

          {profile.userType === "client" && (
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Company / Brand Name</h3>
                <input 
                  type="text" 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white shadow-sm" 
                  placeholder="Your company name" 
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Identity</h3>
                <select 
                  value={identity} 
                  onChange={(e) => setIdentity(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white shadow-sm"
                >
                  <option value="">Select identity</option>
                  <option value="Startup Founder">Startup Founder</option>
                  <option value="Student Founder">Student Founder</option>
                  <option value="Small Business">Small Business</option>
                  <option value="Agency">Agency</option>
                  <option value="Individual">Individual</option>
                  <option value="Creator">Creator</option>
                </select>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Hiring Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {['Project-based', 'Long-term', 'Quick tasks', 'Ongoing support'].map(pref => (
                    <label key={pref} className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded border">
                      <input 
                        type="checkbox" 
                        checked={hiringPreferences.includes(pref)}
                        onChange={(e) => {
                          if (e.target.checked) setHiringPreferences([...hiringPreferences, pref]);
                          else setHiringPreferences(hiringPreferences.filter((p: string) => p !== pref));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Preferred Communication</h3>
                <select 
                  value={preferredCommunication} 
                  onChange={(e) => setPreferredCommunication(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white shadow-sm"
                >
                  <option value="">Select preference</option>
                  <option value="In-app chat">In-app chat</option>
                  <option value="Email">Email</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Website</h3>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 text-sm" placeholder="https://..." />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">LinkedIn</h3>
                  <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 text-sm" placeholder="https://linkedin.com/..." />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Industry</h3>
                  <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 text-sm" placeholder="e.g., SaaS, EdTech" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Team Size</h3>
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 text-sm">
                    <option value="">Select size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201+">201+</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {hasChanges && (
            <div className="flex justify-end mt-4">
              <button 
                onClick={handleSaveChanges} 
                disabled={isSubmitting} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
