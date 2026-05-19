import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, Link } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { Helmet } from "react-helmet-async";

interface GigBrowserProps {
  userType: "freelancer" | "client";
  onViewProfile?: (userId: Id<"users">) => void;
  hideHeader?: boolean;
}

export function GigBrowser({
  userType,
  onViewProfile,
  hideHeader,
}: GigBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const activeView = userType === "freelancer" ? "projects" : "gigs";

  const categories = useQuery(api.categories.getCategories) || [];

  const results = useQuery(
    searchTerm
      ? activeView === "gigs"
        ? api.gigs.searchGigs
        : api.projects.searchProjects
      : activeView === "gigs"
      ? api.gigs.getGigs
      : api.projects.getProjects,
    {
      ...(searchTerm ? { searchTerm } : { limit: 20 }),
      category: selectedCategory || undefined,
    }
  );

  const searchResults = results || [];

  return (
    <div className="space-y-8">
      <Helmet>
        <title>
          {userType === "freelancer"
            ? "Find Freelance Projects for College Students | CollegeGig"
            : "Hire Cheap Web Developers for Startup India | CollegeGig"}
        </title>

        <meta
          name="description"
          content={
            userType === "freelancer"
              ? "Browse freelance projects and internships for college students in India. Start earning today."
              : "Discover and hire verified student freelancers for your startup. Affordable web developers, designers, and writers in India."
          }
        />
      </Helmet>

      {/* Header */}
      {!hideHeader && (
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {userType === "freelancer"
              ? "Browse Projects"
              : "Browse Services"}
          </h1>

          <p className="text-gray-500 text-base">
            {userType === "freelancer"
              ? "Find exciting projects that match your skills"
              : "Discover talented verified student freelancers"}
          </p>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sticky top-20 z-10">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder={`Search ${
                activeView === "gigs" ? "services" : "projects"
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          {/* Category */}
          <div className="md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
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

      {searchResults.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">
              {searchResults.length}
            </span> {activeView === "gigs" ? "services" : "projects"}
            {searchTerm && (
              <span> for "<span className="text-blue-600">{searchTerm}</span>"</span>
            )}
          </p>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory("")}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {searchResults.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">
              {activeView === "gigs" ? "💼" : "📋"}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {searchTerm || selectedCategory 
                ? "No results found" 
                : `No ${activeView === "gigs" ? "services" : "projects"} yet`}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs">
              {searchTerm || selectedCategory
                ? "Try different keywords or clear your filters"
                : activeView === "gigs" 
                  ? "Be the first to list a service!"
                  : "Post a project to get proposals from students"}
            </p>
            {(searchTerm || selectedCategory) && (
              <button
                onClick={() => { setSearchTerm(""); setSelectedCategory(""); }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          searchResults.map((item: any) => (
            <div
              key={item._id}
              className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {activeView === "gigs" ? (
                <GigCard
                  gig={item}
                  onViewProfile={onViewProfile}
                />
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

/* -------------------------------------------------------------------------- */
/*                                   GIG CARD                                 */
/* -------------------------------------------------------------------------- */

function GigCard({
  gig,
  onViewProfile,
}: {
  gig: any;
  onViewProfile?: (userId: Id<"users">) => void;
}) {
  const navigate = useNavigate();

  return (
    <>
      {/* Freelancer info header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {gig.freelancer?.firstName?.[0] || "F"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {gig.freelancer ? 
              `${gig.freelancer.firstName} ${gig.freelancer.lastName}` 
              : "Freelancer"}
          </p>
          {gig.freelancer?.collegeName && (
            <p className="text-[11px] text-gray-500 truncate">
              🎓 {gig.freelancer.collegeName}
            </p>
          )}
        </div>
        {gig.freelancer?.isVerified && (
          <div className="flex-shrink-0 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-100">
            ✓ Verified
          </div>
        )}
      </div>

      {/* Gig title */}
      <h3 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
        {gig.title}
      </h3>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">
        {gig.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {gig.tags?.slice(0, 2).map((tag: string) => (
          <span key={tag} className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md text-[11px] font-medium">
            {tag}
          </span>
        ))}
        {gig.category && (
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[11px] font-medium">
            {gig.category}
          </span>
        )}
      </div>

      {/* Bottom: price, rating, CTA */}
      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Starting at</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{gig.basePrice.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span className="text-sm font-semibold text-gray-800">
                {gig.averageRating ? gig.averageRating.toFixed(1) : "New"}
              </span>
            </div>
            <p className="text-[10px] text-gray-400">{gig.deliveryTime}d delivery</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (onViewProfile) {
              onViewProfile(gig.freelancerId);
            } else {
              navigate(`/profile/${gig.freelancerId}`);
            }
          }}
          className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          View Details
        </button>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                PROJECT CARD                                */
/* -------------------------------------------------------------------------- */

function ProjectCard({ project }: { project: any }) {
  const postedDate = project._creationTime
    ? new Date(project._creationTime)
    : new Date();

  const hoursAgo = Math.floor(
    (Date.now() - postedDate.getTime()) / (1000 * 60 * 60)
  );

  const daysAgo = Math.floor(hoursAgo / 24);

  return (
    <>
      {/* Header: title + NEW badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors flex-1">
          {project.title}
        </h3>
        {hoursAgo <= 24 && (
          <span className="flex-shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
            NEW
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">
        {project.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.skills?.slice(0, 3).map((skill: string) => (
          <span key={skill} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-[11px] font-medium">
            {skill}
          </span>
        ))}
        {project.skills?.length > 3 && (
          <span className="text-[11px] text-gray-400 self-center">
            +{project.skills.length - 3}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-auto">
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {hoursAgo <= 1 ? "Just posted"
              : hoursAgo < 24 ? `${hoursAgo}h ago`
              : `${daysAgo}d ago`}
          </span>
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Verified Client
          </span>
        </div>
        <Link
          to={`/projects/${project._id}`}
          className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Apply Now →
        </Link>
      </div>
    </>
  );
}
