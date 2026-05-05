import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { toast } from "sonner";
import { compressImage } from "../../convex/image";
import posthog from "posthog-js";

const GigBrowser = lazy(() => import("./GigBrowser").then(m => ({ default: m.GigBrowser })));
const FreelancerDashboard = lazy(() => import("./FreelancerDashboard").then(m => ({ default: m.FreelancerDashboard })));
const ClientDashboard = lazy(() => import("./ClientDashboard").then(m => ({ default: m.ClientDashboard })));
const AdminDashboard = lazy(() => import("./AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const VerificationUpload = lazy(() => import("./VerificationUpload").then(m => ({ default: m.VerificationUpload })));

interface DashboardProps {
  profile: any;
}

export function Dashboard({ profile }: DashboardProps) {
  // Check if user is admin
  const isAdmin = useQuery(api.profiles.checkIsAdmin);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verificationStatus = useQuery(api.profiles.getVerificationStatus);
  // Profile Picture Upload
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const logActivity = useMutation((api as any).logs.logActivity);

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
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CollegeGig</span>
              
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
              <div 
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setActiveTab("profile")}
                title="View Profile"
              >
                {profile.profilePictureUrl ? (
                  <img src={profile.profilePictureUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {profile.firstName?.[0]}{profile.lastName?.[0]}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {profile.firstName} {profile.lastName}
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              <div onClickCapture={() => {
                logActivity({
                  action: "User Logout",
                  details: `User ${profile.firstName} ${profile.lastName} logged out`,
                });
                sessionStorage.removeItem("hasLoggedLogin");
                posthog.reset(); // Clear PostHog session on logout
              }}>
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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

            {/* Profile Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Profile</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="capitalize font-medium">{profile.userType}</span>
                </div>
                {profile.userType === "freelancer" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">College:</span>
                      <span className="font-medium">{profile.collegeName || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium">
                        {profile.averageRating ? `${profile.averageRating.toFixed(1)} ⭐` : "No ratings yet"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
            {/* Show a loading state until the active tab is determined */}
            {activeTab === null && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
            {activeTab === "browse" && profile.userType !== "client" && <GigBrowser userType={profile.userType} />}
            {activeTab === "admin" && profile.userType === "admin" && <AdminDashboard />}
            {profile.userType === "freelancer" && (
              <>
                {activeTab === "verification" && <VerificationUpload profile={profile} />}
                {activeTab === "my-gigs" && <FreelancerDashboard profile={profile} activeTab="gigs" />}
                {activeTab === "orders" && <FreelancerDashboard profile={profile} activeTab="orders" />}
                {activeTab === "earnings" && <FreelancerDashboard profile={profile} activeTab="earnings" />}
              </>
            )}
            {profile.userType === "client" && (
              <>
                {activeTab === "browse" && <ClientDashboard profile={profile} activeTab="browse-services" />}
                {activeTab === "projects" && <ClientDashboard profile={profile} activeTab="projects" />}
                {activeTab === "orders" && <ClientDashboard profile={profile} activeTab="orders" />}
                {activeTab === "post-project" && <ClientDashboard profile={profile} activeTab="post-project" />}
              </>
            )}
            {activeTab === "profile" && <UserProfile profile={profile} onEditPhoto={() => setShowProfilePhotoModal(true)} />}
            </Suspense>
          </div>
        </div>
      </div>

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

function UserProfile({ profile, onEditPhoto }: { profile: any, onEditPhoto: () => void }) {
  const profileData = useQuery(api.projects.getFreelancerPublicProfile, { userId: profile.userId });
  
  const [bio, setBio] = useState(profile.bio || "");
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [portfolioItems, setPortfolioItems] = useState<any[]>(profile.portfolioItems || []);
  const [company, setCompany] = useState(profile.company || "");
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

  useEffect(() => {
    setBio(profile.bio || "");
    setSkills(profile.skills || []);
    setPortfolioItems(profile.portfolioItems || []);
    setCompany(profile.company || "");
  }, [profile]);

  const hasChanges = 
    bio !== (profile.bio || "") || 
    JSON.stringify(skills) !== JSON.stringify(profile.skills || []) ||
    JSON.stringify(portfolioItems.map((i: any) => ({ id: i.id, title: i.title, description: i.description, link: i.link || undefined, image: i.image || undefined }))) !== JSON.stringify(profile.portfolioItems || []) ||
    company !== (profile.company || "");

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
                  <span className="text-xl font-bold text-gray-900">{completedProjects.length > 0 ? successRate + '%' : 'N/A'}</span>
                  <span className="text-green-500 text-lg">📈</span>
                </div>
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
                        <img src={newPortfolioItem.imageUrl} alt="Preview" className="h-10 w-10 object-cover rounded border" />
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
                        <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" />
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
          <div className="bg-gray-50 p-6 rounded-lg border overflow-x-auto">
            <div className="flex gap-1">
              {Array.from({ length: 52 }).map((_, col) => (
                <div key={col} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }).map((_, row) => {
                    const daysAgo = (51 - col) * 7 + (6 - row);
                    const date = new Date();
                    date.setDate(date.getDate() - daysAgo);
                    const dateStr = date.toISOString().split("T")[0];
                    const count = activityMap[dateStr] || 0;
                    
                    let intensity = 0;
                    if (count > 0 && count <= 2) intensity = 1;
                    else if (count > 2 && count <= 5) intensity = 2;
                    else if (count > 5 && count <= 10) intensity = 3;
                    else if (count > 10) intensity = 4;

                    const colors = ["bg-gray-200", "bg-green-200", "bg-green-400", "bg-green-600", "bg-green-800"];
                    return (
                      <div key={`${col}-${row}`} className={`w-3 h-3 rounded-sm ${colors[intensity]}`} title={`${count} activities on ${dateStr}`}></div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
                <div className="w-3 h-3 rounded-sm bg-green-200"></div>
                <div className="w-3 h-3 rounded-sm bg-green-400"></div>
                <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                <div className="w-3 h-3 rounded-sm bg-green-800"></div>
              </div>
              <span>More</span>
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
                <div key={project._id} className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 line-clamp-1">{project.title}</h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">Completed</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{project.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-gray-500 font-medium">Budget: ₹{project.budget.min} - ₹{project.budget.max}</span>
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

          {profile.userType === "client" && profile.company && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Company</h3>
              <input 
                type="text" 
                value={company} 
                onChange={(e) => setCompany(e.target.value)} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-700 bg-white shadow-sm" 
                placeholder="Your company name" 
              />
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
