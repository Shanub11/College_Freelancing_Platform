import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, Link } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { Helmet } from "react-helmet-async";
import { useDebounce } from "../hooks/useDebounce";
import LoadingState from "./LoadingState";

interface GigBrowserProps {
  userType: "freelancer" | "client";
  onViewProfile?: (userId: Id<"users">) => void;
  hideHeader?: boolean;
}

export function GigBrowser({ userType, onViewProfile, hideHeader }: GigBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const activeView = userType === "freelancer" ? "projects" : "gigs";
  const categories = useQuery(api.categories.getCategories) || [];

  const results = useQuery(
    debouncedSearch
      ? activeView === "gigs" ? api.gigs.searchGigs : api.projects.searchProjects
      : activeView === "gigs" ? api.gigs.getGigs : api.projects.getProjects,
    {
      ...(debouncedSearch ? { searchTerm: debouncedSearch } : { limit: 20 }),
      category: selectedCategory || undefined,
    }
  );

  const searchResults = results || [];
  const isLoading = results === undefined;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{userType === "freelancer" ? "Find Projects | CollegeGig" : "Hire Student Freelancers | CollegeGig"}</title>
        <meta name="description" content={userType === "freelancer" ? "Browse freelance projects for college students in India." : "Discover and hire verified student freelancers."} />
      </Helmet>

      {!hideHeader && (
        <div className="space-y-1">
          <h1 className="text-2xl md:text-heading font-bold text-gray-900 dark:text-white">
            {userType === "freelancer" ? "Browse Projects" : "Browse Services"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {userType === "freelancer" ? "Find projects that match your skills" : "Discover talented verified student freelancers"}
          </p>
        </div>
      )}

      {/* Search + Filters */}
      <div className="card p-4 md:p-5 sticky top-20 z-10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={`Search ${activeView === "gigs" ? "services" : "projects"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field !pl-10 !py-3"
              id="gig-search"
              aria-label={`Search ${activeView}`}
            />
            {searchTerm && searchTerm !== debouncedSearch && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-field !py-3"
              id="category-filter"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      {searchResults.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{searchResults.length}</span> {activeView === "gigs" ? "services" : "projects"}
            {debouncedSearch && <span> for "<span className="text-primary-600 dark:text-primary-400">{debouncedSearch}</span>"</span>}
          </p>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory("")} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 flex items-center gap-1 font-medium">
              ✕ Clear filter
            </button>
          )}
        </div>
      )}

      {/* Results Grid */}
      {isLoading ? (
        <LoadingState variant="cards" rows={6} message="" />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {searchResults.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-dark-surface-2 rounded-2xl flex items-center justify-center text-4xl mb-4">
                {activeView === "gigs" ? "💼" : "📋"}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {searchTerm || selectedCategory ? "No results found" : `No ${activeView === "gigs" ? "services" : "projects"} yet`}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                {searchTerm || selectedCategory
                  ? "Try different keywords or clear your filters"
                  : activeView === "gigs" ? "Be the first to list a service!" : "Post a project to get proposals"}
              </p>
              {(searchTerm || selectedCategory) && (
                <button onClick={() => { setSearchTerm(""); setSelectedCategory(""); }} className="mt-4 btn-ghost text-primary-600 dark:text-primary-400 text-sm font-semibold">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            searchResults.map((item: any) => (
              <div key={item._id} className="card-hover p-5 flex flex-col">
                {activeView === "gigs" ? <GigCard gig={item} onViewProfile={onViewProfile} /> : <ProjectCard project={item} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function GigCard({ gig, onViewProfile }: { gig: any; onViewProfile?: (userId: Id<"users">) => void }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
          {gig.freelancer?.firstName?.[0] || "F"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {gig.freelancer ? `${gig.freelancer.firstName} ${gig.freelancer.lastName}` : "Freelancer"}
          </p>
          {gig.freelancer?.collegeName && <p className="text-micro text-gray-500 dark:text-gray-400 truncate">🎓 {gig.freelancer.collegeName}</p>}
        </div>
        {gig.freelancer?.isVerified && <span className="badge-success text-micro">✓ Verified</span>}
      </div>

      <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{gig.title}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-2 mb-3">{gig.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {gig.tags?.slice(0, 2).map((tag: string) => <span key={tag} className="badge-primary text-micro">{tag}</span>)}
        {gig.category && <span className="badge text-micro bg-gray-100 dark:bg-dark-surface-2 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-dark-border">{gig.category}</span>}
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100 dark:border-dark-border">
          <div>
            <p className="text-micro text-gray-400 uppercase tracking-wider font-medium">Starting at</p>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">₹{gig.basePrice.toLocaleString("en-IN")}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{gig.averageRating ? gig.averageRating.toFixed(1) : "New"}</span>
            </div>
            <p className="text-micro text-gray-400">{gig.deliveryTime}d delivery</p>
          </div>
        </div>
        <button
          onClick={() => onViewProfile ? onViewProfile(gig.freelancerId) : navigate(`/profile/${gig.freelancerId}`)}
          className="btn-primary w-full !py-2.5 text-sm"
          aria-label={`View details for ${gig.title}`}
        >
          View Details
        </button>
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: any }) {
  const postedDate = project._creationTime ? new Date(project._creationTime) : new Date();
  const hoursAgo = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60));
  const daysAgo = Math.floor(hoursAgo / 24);

  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-1">{project.title}</h3>
        {hoursAgo <= 24 && <span className="badge-success text-micro animate-pulse-soft">NEW</span>}
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-2 mb-3">{project.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.skills?.slice(0, 3).map((skill: string) => <span key={skill} className="badge-primary text-micro">{skill}</span>)}
        {project.skills?.length > 3 && <span className="text-micro text-gray-400">+{project.skills.length - 3}</span>}
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-border mb-3 text-micro text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {hoursAgo <= 1 ? "Just posted" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${daysAgo}d ago`}
          </span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Verified
          </span>
        </div>
        <Link to={`/projects/${project._id}`} className="btn-primary w-full !py-2.5 text-sm text-center block" aria-label={`Apply to ${project.title}`}>
          Apply Now →
        </Link>
      </div>
    </>
  );
}
