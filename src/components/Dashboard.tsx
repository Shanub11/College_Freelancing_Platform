import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import posthog from "posthog-js";
import { useTheme } from "../hooks/useTheme";
import { useNavigate, useLocation } from "react-router-dom";
// H1 fix: SupportTicketForm and UserProfile extracted into dedicated component files
import { UserProfile } from "./UserProfile";
import { 
  Settings, 
  Search, 
  Briefcase, 
  Clipboard, 
  IndianRupee, 
  User, 
  Headset, 
  Shield, 
  Plus, 
  X, 
  CheckCircle2, 
  Bell, 
  MessageSquare, 
  Menu,
  LifeBuoy
} from "lucide-react";
function ThemeToggleBtn() {
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-xl hover:bg-gray-100 dark:bg-dark-surface-2 dark:hover:bg-dark-surface-2" aria-label="Toggle dark mode">
      {resolvedTheme === "dark" ? (
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
      ) : (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
      )}
    </button>
  );
}

const GigBrowser = lazy(() => import("./GigBrowser").then(m => ({ default: m.GigBrowser })));
const FreelancerDashboard = lazy(() => import("./FreelancerDashboard").then(m => ({ default: m.FreelancerDashboard })));
const ClientDashboard = lazy(() => import("./ClientDashboard").then(m => ({ default: m.ClientDashboard })));
const AdminDashboard = lazy(() => import("./AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const VerificationUpload = lazy(() => import("./VerificationUpload").then(m => ({ default: m.VerificationUpload })));
const ChatInterface = lazy(() => import("./Chat").then(m => ({ default: m.ChatInterface })));
const ContactPage = lazy(() => import("./ContactPage").then(m => ({ default: m.ContactPage })));

import { Id } from "../../convex/_generated/dataModel";
import type { AppProfile, ChatOpenData } from "@/lib/profileTypes";

function SidebarIcon({ name }: { name: string }) {
  const cls = "w-5 h-5 flex-shrink-0";
  switch (name) {
    case "settings": return <Settings className={cls} />;
    case "search": return <Search className={cls} />;
    case "briefcase": return <Briefcase className={cls} />;
    case "clipboard": return <Clipboard className={cls} />;
    case "currency": return <IndianRupee className={cls} />;
    case "user": return <User className={cls} />;
    case "headset": return <Headset className={cls} />;
    case "life-buoy": return <LifeBuoy className={cls} />;
    case "shield": return <Shield className={cls} />;
    case "plus": return <Plus className={cls} />;
    default: return <Settings className={cls} />;
  }
}


interface DashboardProps {
  profile: AppProfile;
  initialTab?: string;
}

export function Dashboard({ profile, initialTab }: DashboardProps) {
  // Check if user is admin
  const isAdmin = useQuery(api.profiles.checkIsAdmin);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<string | null>(initialTab || null);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const verificationStatus = useQuery(api.profiles.getVerificationStatus);
  // Profile Picture Upload
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const logActivity = useMutation(api.logs.logActivity);

  // Notifications
  const notifications = useQuery(api.proposals.getNotifications, {});
  const markAsRead = useMutation(api.proposals.markAsRead);
  const markAllAsRead = useMutation(api.proposals.markAllAsRead);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = (notifications || []).filter((n: any) => !n.isRead).length;

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitData, setChatInitData] = useState<ChatOpenData | null>(null);
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

  const validateUpload = useMutation(api.storage.validateUpload);

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

      // SERVER-SIDE VALIDATION
      const validatedId = await validateUpload({
        storageId,
        category: "profile_image",
      });

      await updateProfile({ profilePicture: validatedId });
      toast.success("Profile picture updated!");
    } catch (error: any) {
      console.error(error);
      e.target.value = "";
      toast.error(error.message || "Failed to upload image");
    }
  };

  // Set the initial tab after isAdmin query has resolved.
  useEffect(() => {
    // This effect runs when isAdmin is no longer undefined (i.e., loaded).
    if (isAdmin !== undefined) {
      const stateTab = location.state?.activeTab;
      setActiveTab(initialTab || stateTab || (isAdmin ? "admin" : "browse"));
    }
  }, [isAdmin, initialTab, location.state]);

  const handleOpenSupport = (orderId?: string, projectId?: string) => {
    navigate("/contact", { state: { projectId: projectId || orderId } });
  };

  let tabs: { id: string; label: string; icon: string }[] = [];
  if (profile.userType === "admin") {
    tabs = [{ id: "admin", label: "Admin Panel", icon: "settings" }];
  } else if (profile.userType === "freelancer") {
    tabs = [
      { id: "browse", label: "Browse Projects", icon: "search" },
      { id: "my-gigs", label: "My Gigs", icon: "briefcase" },
      { id: "orders", label: "Orders", icon: "clipboard" },
      { id: "earnings", label: "Earnings", icon: "currency" },
      { id: "profile", label: "My Profile", icon: "user" },
      { id: "contact", label: "Help & Support", icon: "life-buoy" },
    ];
    // If freelancer is not verified, add verification tab
    if (!profile.isVerified) {
      tabs.unshift({ id: "verification", label: "Verify Account", icon: "shield" });
    }
  } else { // client
    tabs = [
      { id: "browse", label: "Browse Services", icon: "search" },
      { id: "projects", label: "My Projects", icon: "clipboard" },
      { id: "orders", label: "Orders", icon: "briefcase" },
      { id: "post-project", label: "Post Project", icon: "plus" },
      { id: "profile", label: "My Profile", icon: "user" },
      { id: "contact", label: "Help & Support", icon: "life-buoy" },
    ];
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-2 dark:bg-dark-bg transition-colors">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-200 border-b ${isScrolled ? 'bg-white dark:bg-dark-surface/80 dark:bg-dark-bg/80 backdrop-blur-xl shadow-md border-gray-200 dark:border-dark-border dark:border-dark-border' : 'bg-white dark:bg-dark-surface shadow-sm border-gray-100 dark:border-dark-border dark:border-dark-border'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {/* Hamburger menu - only visible on mobile */}
              <button
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-dark-surface-2 
                           hover:text-gray-900 dark:text-white transition-colors focus:outline-none flex items-center justify-center"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div
                className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Go to top"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">CollegeGig</span>
              </div>

              {profile.userType === "freelancer" && !profile.isVerified && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${verificationStatus?.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  verificationStatus?.status === "rejected" ? "bg-red-100 text-red-800" :
                    "bg-gray-100 dark:bg-dark-surface-2 text-gray-800 dark:text-gray-200"
                  }`}>
                  {verificationStatus?.status === "pending" ? "Verification Pending" :
                    verificationStatus?.status === "rejected" ? "Verification Rejected" :
                      "Unverified"}
                </div>
              )}

              {profile.userType === "freelancer" && profile.isVerified && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Verified Student</span>
                </div>
              )}

              {isAdmin && (
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Admin</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative flex gap-2 mr-2">
                <ThemeToggleBtn />
                <button onClick={() => { setChatInitData(null); setIsChatOpen(true); }} className="relative p-2 text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:text-primary-400 transition-colors flex items-center justify-center">
                  <MessageSquare className="h-6 w-6" />
                  {totalUnread > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {totalUnread}
                    </span>
                  )}
                </button>
                <div className="relative">
                  <button className="relative p-2 text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:text-primary-400 transition-colors flex items-center justify-center" onClick={() => {
                    if (!showNotifications && unreadCount > 0) {
                      markAllAsRead();
                    }
                    setShowNotifications(!showNotifications);
                  }}>
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 top-12 w-80 bg-white dark:bg-dark-surface rounded-xl shadow-card border border-gray-100 dark:border-dark-border dark:border-dark-border z-50 overflow-hidden animate-scale-in origin-top-right">
                      <div className="p-3 border-b border-gray-100 dark:border-dark-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface-2 dark:bg-dark-surface-2 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white dark:text-white">Notifications</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-white dark:text-gray-400 dark:text-gray-500 dark:hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {!notifications ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 animate-pulse">Loading...</div>
                        ) : notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">No notifications</div>
                        ) : (
                          notifications.map((n: any) => (
                            <div key={n._id} className={`p-4 border-b border-gray-100 dark:border-dark-border dark:border-dark-border hover:bg-gray-50 dark:bg-dark-surface-2 dark:hover:bg-dark-surface-2 cursor-pointer transition-colors ${!n.isRead ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`} onClick={() => { if (!n.isRead) markAsRead({ notificationId: n._id }); }}>
                              <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900 dark:text-white dark:text-white' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}>{n.message}</p>
                              <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1 block">{new Date(n._creationTime).toLocaleDateString()}</span>
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
                  <div className="absolute right-0 top-12 w-56 bg-white dark:bg-dark-surface rounded-xl shadow-card border border-gray-100 dark:border-dark-border dark:border-dark-border z-50 overflow-hidden animate-scale-in origin-top-right">
                    <div className="p-4 border-b border-gray-100 dark:border-dark-border dark:border-dark-border bg-gray-50 dark:bg-dark-surface-2 dark:bg-dark-surface-2">
                      <p className="font-bold text-gray-900 dark:text-white dark:text-white truncate">{profile.firstName} {profile.lastName}</p>
                      <p className="text-xs font-medium mt-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 capitalize">
                        {profile.userType}
                      {profile.userType === "freelancer" && (
                        <span className={profile.isVerified ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                          {profile.isVerified ? " • Verified" : " • Unverified"}
                        </span>
                      )}
                      {profile.userType === "admin" && <span className="text-purple-600 dark:text-purple-400"> • Admin</span>}
                      </p>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setActiveTab("profile");
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-dark-surface-2 dark:hover:bg-dark-surface-2 transition-colors"
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
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer"
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
              bg-white dark:bg-dark-surface md:bg-transparent
              shadow-xl md:shadow-none
              transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
              md:translate-x-0
              md:sticky md:top-24 md:self-start
              overflow-y-auto md:overflow-visible
              flex flex-col h-full md:h-auto
            `}
          >
            {/* Mobile sidebar header with close button */}
            <div className="flex items-center justify-between p-4 border-b md:hidden">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center 
                                justify-center">
                  <span className="text-white font-bold text-xs">CG</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">CollegeGig</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-dark-surface-2 
                           hover:text-gray-900 dark:text-white transition-colors flex items-center justify-center"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 md:hidden border-b border-gray-100 dark:border-dark-border">
              {tabs.slice(0, 4).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (location.pathname !== "/dashboard") {
                      navigate("/dashboard", { state: { activeTab: tab.id } });
                    }
                    setActiveTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`flex items-center space-x-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${activeTab === tab.id
                    ? "bg-primary-600 text-white border-blue-600"
                    : "bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-400 dark:text-gray-500 border-gray-200 dark:border-dark-border hover:border-blue-300"
                    }`}
                >
                  <SidebarIcon name={tab.icon} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <nav className="bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border p-4 shadow-sm md:h-[calc(100vh-8rem)] md:min-h-[500px] flex flex-col justify-between overflow-y-auto no-scrollbar flex-1 md:flex-initial pb-safe-area-inset-bottom">
              <div className="space-y-1.5">
                {tabs.filter(t => t.id !== "profile" && t.id !== "contact").map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (location.pathname !== "/dashboard") {
                        navigate("/dashboard", { state: { activeTab: tab.id } });
                      }
                      setActiveTab(tab.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-150 group ${activeTab === tab.id
                      ? "bg-primary-600 text-white font-semibold shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-2 hover:text-gray-900 dark:hover:text-white"
                      }`}
                  >
                    <SidebarIcon name={tab.icon} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-4 border-t border-gray-100 dark:border-dark-border mt-auto">
                {tabs.filter(t => t.id === "profile" || t.id === "contact").map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "contact") {
                        navigate("/contact");
                      } else {
                        if (location.pathname !== "/dashboard") {
                          navigate("/dashboard", { state: { activeTab: tab.id } });
                        }
                        setActiveTab(tab.id);
                      }
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-150 group ${activeTab === tab.id
                      ? "bg-primary-600 text-white font-semibold shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-2 hover:text-gray-900 dark:hover:text-white"
                      }`}
                  >
                    <SidebarIcon name={tab.icon} />
                    <span className="text-sm">{tab.label}</span>
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
              {activeTab === "browse" && profile.userType === "freelancer" && <GigBrowser userType={profile.userType} />}
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
              {activeTab === "contact" && <ContactPage />}
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
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-sm w-full text-center relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowProfilePhotoModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold mb-4">Profile Photo</h3>
            <div className="mb-6 flex justify-center">
              {profile.profilePictureUrl ? (
                <img
                  src={profile.profilePictureUrl}
                  alt="Profile"
                  className="w-48 h-48 rounded-full object-cover border-4 border-gray-100 dark:border-dark-border"
                  onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-100 dark:border-dark-border">
                  <span className="text-4xl font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
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
    </div>
  );
}

