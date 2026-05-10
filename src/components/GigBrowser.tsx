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
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={`Search ${
                activeView === "gigs" ? "services" : "projects"
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all"
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

      {/* Results */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {searchResults.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="text-6xl mb-4">
              {activeView === "gigs" ? "💼" : "📋"}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No {activeView === "gigs" ? "services" : "projects"} found
            </h3>

            <p className="text-gray-500">
              {searchTerm || selectedCategory
                ? "Try adjusting your search or filters"
                : `No ${
                    activeView === "gigs" ? "services" : "projects"
                  } available yet`}
            </p>
          </div>
        ) : (
          searchResults.map((item: any) => (
            <div
              key={item._id}
              className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-emerald-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
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
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-snug">
          {gig.title}
        </h3>

        <span className="text-emerald-600 font-bold text-lg ml-3 whitespace-nowrap">
          ₹{gig.basePrice}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-5">
        {gig.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {gig.tags?.slice(0, 3).map((tag: string) => (
          <span
            key={tag}
            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
          >
            {tag}
          </span>
        ))}

        {gig.tags?.length > 3 && (
          <span className="text-xs text-gray-500 self-center">
            +{gig.tags.length - 3} more
          </span>
        )}
      </div>

      {/* Bottom */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-5">
          <div className="flex items-center gap-1">
            <span>⭐</span>
            <span>
              {gig.averageRating
                ? gig.averageRating.toFixed(1)
                : "New Freelancer"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span>🚚</span>
            <span>{gig.deliveryTime} days</span>
          </div>

          <div className="flex items-center gap-1">
            <span>🔥</span>
            <span>Quick Delivery</span>
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
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
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
      {/* Top */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 leading-snug line-clamp-2">
            {project.title}
          </h3>
        </div>

        {hoursAgo <= 24 && (
          <span className="ml-3 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap">
            NEW
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-5">
        {project.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {project.skills?.slice(0, 3).map((skill: string) => (
          <span
            key={skill}
            className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-medium"
          >
            {skill}
          </span>
        ))}

        {project.skills?.length > 3 && (
          <span className="text-xs text-gray-500 self-center">
            +{project.skills.length - 3} more
          </span>
        )}
      </div>

      {/* Bottom */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-5">
          {/* Posted */}
          <div className="flex items-center gap-1">
            <span>📅</span>

            <span>
              {hoursAgo <= 1
                ? "Posted recently"
                : hoursAgo < 24
                ? `Posted ${hoursAgo}h ago`
                : `Posted ${daysAgo}d ago`}
            </span>
          </div>

          {/* Verified */}
          <div className="flex items-center gap-1">
            <span>⭐</span>
            <span>Verified Client</span>
          </div>

          {/* Hiring */}
          <div className="flex items-center gap-1">
            <span>⚡</span>
            <span>Quick Hiring</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/projects/${project._id}`}
          className="block w-full text-center bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Apply Now
        </Link>
      </div>
    </>
  );
}