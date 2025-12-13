import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignOutButton } from "../SignOutButton";
import { GigBrowser } from "./GigBrowser";
import { FreelancerDashboard } from "./FreelancerDashboard";
import { ClientDashboard } from "./ClientDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { VerificationUpload } from "./VerificationUpload";

interface DashboardProps {
  profile: any;
}

export function Dashboard({ profile }: DashboardProps) {
  // Check if user is admin
  const isAdmin = useQuery(api.profiles.checkIsAdmin);

  const [activeTab, setActiveTab] = useState<string | null>(null);

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
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  Verification Pending
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
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {profile.firstName} {profile.lastName}
                </span>
              </div>
              <SignOutButton />
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
            {/* Show a loading state until the active tab is determined */}
            {activeTab === null && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
            {activeTab === "browse" && <GigBrowser userType={profile.userType} />}
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
                {activeTab === "projects" && <ClientDashboard profile={profile} activeTab="projects" />}
                {activeTab === "orders" && <ClientDashboard profile={profile} activeTab="orders" />}
                {activeTab === "post-project" && <ClientDashboard profile={profile} activeTab="post-project" />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
