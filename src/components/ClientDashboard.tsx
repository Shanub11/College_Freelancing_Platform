import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
// Optional file storage hook: convex/react-file-storage may not be available in all environments.
// Provide a local fallback that returns a string URL when the stored reference is already a URL,
// or null otherwise. Replace this with the real useStorage from 'convex/react-file-storage' if available.
function useStorage(fileRef: any): string | null {
  if (!fileRef) return null;
  if (typeof fileRef === "string") return fileRef;
  if (typeof fileRef === "object") {
    // Common fields that might contain a URL or path in different environments
    if (typeof fileRef.url === "string") return fileRef.url;
    if (typeof fileRef.path === "string") return fileRef.path;
    if (typeof (fileRef as any).filename === "string") return (fileRef as any).filename;
  }
  return null;
}
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { ProposalActions } from "./ProposalActions";
import { ChatInterface } from "./Chat";
import { GigBrowser } from "./GigBrowser";

// Main component for the client dashboard
export function ClientDashboard({ profile, activeTab }: { profile: any, activeTab: string }) {
  const myProjects = useQuery(api.projects.getMyProjects, {}) || [];
  const notifications = useQuery(api.proposals.getNotifications, {}) || [];
  const myOrders = useQuery(api.projects.getMyClientOrders) || [];
  const [selectedProject, setSelectedProject] = useState<Id<"projectRequests"> | null>(null);
  const [viewingFreelancer, setViewingFreelancer] = useState<Id<"users"> | null>(null);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitData, setChatInitData] = useState<any>(null);
  const conversations = useQuery(api.chat.getConversations) || [];
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  // Profile Picture Upload
  const generateUploadUrl = useMutation((api as any).profiles.generateUploadUrl);
  const updateProfile = useMutation((api as any).profiles.updateProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await updateProfile({ profilePicture: storageId });
      toast.success("Profile picture updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
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
            setChatInitData({ projectId: selectedProject, clientId: profile.userId, freelancerId });
            setIsChatOpen(true);
          }}
        />
        <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} initialConversation={chatInitData} currentUserId={profile.userId} />
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
          <button className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a3 3 0 00-6 0v.083A6 6 0 002 11v3.159c0 .538-.214 1.055-.595 1.436L0 17h5m10 0v1a3 3 0 01-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>

          
        </div>
      </div>
      
      {activeTab === 'projects' && (
        <ProjectList projects={myProjects} onSelectProject={setSelectedProject} />
      )}

      {activeTab === 'orders' && (
        <OrderList orders={myOrders} />
      )}

      {activeTab === 'post-project' && (
        <PostProjectForm />
      )}

      {activeTab === 'browse-services' && (
        <GigBrowser userType="client" />
      )}
      
      <ChatInterface 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        initialConversation={chatInitData}
        currentUserId={profile.userId}
      />

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
      
    </div>
  );
}

function OrderFreelancerAvatar({ freelancer }: { freelancer: any }) {
  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <img src={freelancer.profilePictureUrl || useStorage(freelancer.profilePicture) || '/default-avatar.png'} alt="Freelancer" className="w-6 h-6 rounded-full object-cover" />
      <span>{freelancer.firstName} {freelancer.lastName}</span>
    </div>
  );
}



function ProfileAvatar({ profile }: { profile: any }) {
  const profilePictureUrl = useStorage(profile.profilePicture);

  return (
    <div className="flex items-center space-x-6 mb-6">
      <img src={profilePictureUrl || '/default-avatar.png'} alt="Freelancer" className="w-24 h-24 rounded-full" />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1>
        <p className="text-gray-600">{profile.tagline}</p>
        <div className="flex items-center mt-2">
          {/* Placeholder for rating */}
          <span className="text-yellow-500">★★★★☆</span>
          <span className="ml-2 text-gray-600">({profile.totalReviews || 0} reviews)</span>
        </div>
      </div>
    </div>
  );
}

// Component to display the list of orders
function OrderList({ orders }: { orders: any[] }) {
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
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">In Progress</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Completed</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Cancelled</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order._id} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{order.title}</h3>
              {order.freelancer && (
                <OrderFreelancerAvatar freelancer={order.freelancer} />
              )}
            </div>
            <div className="text-right">
              {getStatusChip(order.status)}
              <p className="text-sm text-gray-500 mt-1">Budget: ₹{order.budget.min} - ₹{order.budget.max}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Component to display the list of projects
function ProjectList({ projects, onSelectProject }: { projects: any[], onSelectProject: (id: Id<"projectRequests">) => void }) {
  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
        <p className="text-gray-600">Post your first project to start receiving proposals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project._id} className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h3>
              <p className="text-gray-600 mb-3">{project.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {project.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <p className="font-medium">{project.proposalCount} proposals</p>
          </div>
          <button
            onClick={() => onSelectProject(project._id)}
            disabled={project.status !== 'open'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {project.status === 'open' ? 'View Proposals' : `Project ${project.status}`}
          </button>
        </div>
      ))}
    </div>
  );
}

// Component to display proposals for a selected project
function ProjectProposals({ projectId, onBack, onViewProfile, clientProfile, onChat }: { projectId: Id<"projectRequests">, onBack: () => void, onViewProfile: (userId: Id<"users">) => void, clientProfile: any, onChat: (freelancerId: Id<"users">) => void }) {
  const proposals = useQuery(api.projects.getProposalsForProject, { projectId }) || [];
  const project = useQuery(api.projects.getProjectById, { projectId });
  const recommendations = useQuery(api.recommendations.getRecommendedFreelancers, { projectId }) || [];


  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-blue-600 hover:underline">
        &larr; Back to Projects
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proposals for {project?.title}</h1>
        <p className="text-gray-600">Review proposals from freelancers for your project.</p>
      </div>
      {proposals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">📬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals yet</h3>
          <p className="text-gray-600">You will be notified when freelancers submit proposals for this project.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => (
            <div key={p._id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg text-gray-900">{p.freelancerName}</p>
                  <p className="text-gray-600">Proposed Price: <span className="font-medium text-gray-800">₹{p.proposedPrice}</span></p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold px-2 py-1 rounded-full ${
                    p.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                    p.status === 'payment_pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {p.status === 'payment_pending' ? 'Payment Pending' : p.status}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">{p.coverLetter}</p>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                {project?.status === 'open' && p.status !== 'accepted' && p.status !== 'rejected' && (
                  <>
                    <ProposalActions 
                      proposalId={p._id}
                      amount={p.proposedPrice}
                      clientName={`${clientProfile.firstName} ${clientProfile.lastName}`}
                    />
                  </>
                )}
                <button onClick={() => onChat(p.freelancerId)} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-2">
                  <span>Chat</span>
                </button>
                <button onClick={() => onViewProfile(p.freelancerId)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Recommendations Section */}
      {project?.status === 'open' && (
        <div className="mt-12 border-t pt-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recommended Freelancers</h2>
              <p className="text-gray-600 text-sm">Top matches based on skills, rating, and college.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {recommendations.map((freelancer) => (
              <div key={freelancer._id} className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={useStorage(freelancer.profilePicture) || '/default-avatar.png'} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{freelancer.firstName} {freelancer.lastName}</h3>
                      <p className="text-xs text-blue-600 font-medium">{Math.round(freelancer.score)}% Match Score</p>
                    </div>
                  </div>
                  <button onClick={() => onViewProfile(freelancer.userId)} className="text-sm text-gray-600 hover:text-blue-600">View Profile</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {freelancer.skills?.slice(0, 3).map((s: string) => (
                    <span key={s} className="text-xs bg-white border px-2 py-0.5 rounded text-gray-600">{s}</span>
                  ))}
                </div>
                <button onClick={() => onChat(freelancer.userId)} className="w-full mt-4 bg-white border border-blue-200 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
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

  if (!profileData) {
    return <div>Loading profile...</div>;
  }

  const { profile, completedProjects } = profileData;

  if (!profile) {
    return <div>Freelancer profile not found.</div>;
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-blue-600 hover:underline">
        &larr; Back to Proposals
      </button>
      <div className="bg-white rounded-lg shadow-sm p-8">
        <ProfileAvatar profile={profile} />

        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">About Me</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((skill) => (
              <span key={skill} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">{skill}</span>
            ))}
          </div>
        </div>

        <div className="border-t pt-6 mt-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Completed Projects ({completedProjects.length})</h3>
          {completedProjects.length > 0 ? (
            <div className="space-y-4">
              {completedProjects.map((project: any) => (
                <div key={project._id} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800">{project.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">Budget: ₹{project.budget.min} - ₹{project.budget.max}</p>
                  {/* You could add client feedback here if you have a reviews system */}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">This freelancer hasn't completed any projects on the platform yet.</p>
          )}
        </div>
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
    budgetMin: 50,
    budgetMax: 500,
    deadline: "",
  });

  const categories = useQuery(api.categories.getCategories, {}) || [];
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
                Minimum Budget (₹) *
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
                Maximum Budget (₹) *
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
  );
}
