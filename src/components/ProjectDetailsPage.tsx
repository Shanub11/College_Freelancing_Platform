import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, Link } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: Id<"projectRequests"> }>();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const project = useQuery(
    api.projectRequests.getProjectRequestById,
    projectId ? { projectId } : "skip"
  );

  if (project === undefined) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (project === null) {
    return <div className="text-center p-8">Project not found.</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isChatOpen ? 'mr-80' : 'mr-0'}`}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              
            </div>
            <p className="text-gray-500 mt-2">Posted by Client</p>

            <div className="mt-6 border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-800">Project Description</h2>
              <p className="text-gray-600 mt-2 whitespace-pre-wrap">{project.description}</p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold">Budget</p>
                <p className="text-lg font-bold text-blue-900">₹{project.budget.min} - ₹{project.budget.max}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800 font-semibold">Deadline</p>
                <p className="text-lg font-bold text-green-900">{new Date(project.deadline).toLocaleDateString()}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 font-semibold">Proposals</p>
                <p className="text-lg font-bold text-yellow-900">{project.proposalCount}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800">Required Skills</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.skills.map(skill => (
                  <span key={skill} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link
                to={`/projects/${project._id}/propose`}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
              >
                Submit Your Proposal
              </Link>
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}