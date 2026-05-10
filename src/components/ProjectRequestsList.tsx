import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import posthog from "posthog-js";

export function ProjectRequestsList() {
  const { results: projectRequests, status, loadMore } = usePaginatedQuery(
    api.projectRequests.getOpenProjectRequests,
    {},
    { initialNumItems: 20 }
  );

  if (projectRequests === undefined && status === "LoadingFirstPage") {
    return <div>Loading project requests...</div>;
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Available Project Requests
      </h2>
      {!projectRequests || projectRequests.length === 0 ? (
        <p className="text-gray-500">
          There are no open project requests at the moment. Check back later!
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-200">
          {projectRequests.map((req) => (
            <li key={req._id} className="py-4">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                    <Link to={`/projects/${req._id}`}>{req.title}</Link>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {req.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                    <span>By: {req.clientName}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col sm:items-end gap-2">
                  <Link
                    to={`/projects/${req._id}`}
                    onClick={() => posthog.capture("clicked_submit_proposal_start", { projectId: req._id })}
                    className="bg-blue-600 text-white text-center px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                  >
                    Submit Proposal
                  </Link>
                  <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                    Chat with Client
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
          {status === "CanLoadMore" && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => loadMore(20)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}