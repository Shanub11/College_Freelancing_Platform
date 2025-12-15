import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

interface GigBrowserProps {
  userType: "freelancer" | "client";
}

export function GigBrowser({ userType }: GigBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const activeView = userType === "freelancer" ? "projects" : "gigs";

  const categories = useQuery(api.categories.getCategories) || [];

  const results = useQuery(
    searchTerm
      ? (activeView === "gigs" ? api.gigs.searchGigs : api.projects.searchProjects)
      : (activeView === "gigs" ? api.gigs.getGigs : api.projects.getProjects),
    {
      ...(searchTerm ? { searchTerm } : { limit: 20 }),
      category: selectedCategory || undefined,
    }
  );

  const searchResults = results || [];


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {userType === "freelancer" ? "Browse Projects" : "Browse Services"}
        </h1>
        <p className="text-gray-600">
          {userType === "freelancer" 
            ? "Find exciting projects to work on" 
            : "Discover talented student freelancers"
          }
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`Search ${activeView === "gigs" ? "services" : "projects"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchResults.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">
              {activeView === "gigs" ? "💼" : "📋"}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeView === "gigs" ? "services" : "projects"} found
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory
                ? "Try adjusting your search criteria"
                : `No ${activeView === "gigs" ? "services" : "projects"} available yet`
              }
            </p>
          </div>
        ) : (
          searchResults.map((item: any) => (
            <div key={item._id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              {activeView === "gigs" ? (
                <GigCard gig={item} />
              ) : (
                <ProjectCard project={item} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GigCard({ gig }: { gig: any }) {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{gig.title}</h3>
        <span className="text-lg font-bold text-green-600">₹{gig.basePrice}</span>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{gig.description}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {gig.tags.slice(0, 3).map((tag: string) => (
          <span
            key={tag}
            className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
          >
            {tag}
          </span>
        ))}
        {gig.tags.length > 3 && (
          <span className="text-gray-500 text-xs">+{gig.tags.length - 3} more</span>
        )}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        <span>⭐ {gig.averageRating ? gig.averageRating.toFixed(1) : "New"}</span>
        <span>🚚 {gig.deliveryTime} days</span>
        <span>📦 {gig.totalOrders} orders</span>
      </div>

      <button 
        onClick={() => navigate(`/profile/${gig.freelancerId}`)}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        View Details
      </button>
    </>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{project.title}</h3>
        <span className="text-sm font-medium text-green-600">
          ₹{project.budget.min} - ₹{project.budget.max}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {project.skills.slice(0, 3).map((skill: string) => (
          <span
            key={skill}
            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
          >
            {skill}
          </span>
        ))}
        {project.skills.length > 3 && (
          <span className="text-gray-500 text-xs">+{project.skills.length - 3} more</span>
        )}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
        <span>📅 {new Date(project.deadline).toLocaleDateString()}</span>
        <span>💼 {project.proposalCount} proposals</span>
        <span>👤 {project.client?.firstName || "Client"}</span>
      </div>

      {/* This should be a <Link> component from your routing library, e.g., react-router-dom */}
      <a href={`/projects/${project._id}`} className="block text-center w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors">
        Submit Proposal
      </a>
    </>
  );
}
