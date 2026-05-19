import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { Helmet } from "react-helmet-async";

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: Id<"projectRequests"> }>();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const navigate = useNavigate();

  const project = useQuery(
    api.projects.getProjectById,
    projectId ? { projectId } : "skip"
  );

  const clientData = useQuery(
    api.projects.getClientPublicProfile,
    project?.clientId ? { userId: project.clientId } : "skip"
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-dark-surface-2">
      <Helmet>
        <title>{project.title} - Freelance Project for Students | CollegeGig</title>
        <meta name="description" content={`Apply for: ${project.title}. ${project.description?.substring(0, 150)}... Perfect for college students freelancing in India.`} />
        <meta name="keywords" content="freelancers for college projects, college students freelancing India" />
      </Helmet>
      {/* Header with Back Button */}
      <header className="bg-white dark:bg-dark-surface shadow-sm border-b border-gray-200 dark:border-dark-border sticky top-0 z-10 px-4 py-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:text-primary-400 transition-colors"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="font-medium text-lg">Back</span>
        </button>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full transition-all duration-300 ease-in-out ${isChatOpen ? 'mr-80' : 'mr-0'}`}>
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Project Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-8">
                <h1 className="text-3xl md:text-heading font-bold text-gray-900 dark:text-white">{project.title}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Posted {new Date(project._creationTime).toLocaleDateString()}</p>
                
                <div className="mt-8 border-t border-gray-100 dark:border-dark-border pt-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Project Description</h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
                </div>

                <div className="mt-8 max-w-xs">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl inline-block w-full text-center">
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Deadline</p>
                    <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{new Date(project.deadline).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 dark:border-dark-border pt-8">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.skills.map(skill => (
                      <span key={skill} className="badge-primary">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Client Details & Actions */}
            <div className="space-y-6 sticky top-24 self-start">
              <div className="card p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">About the Client</h3>
                <div className="flex items-center gap-4 mb-6">
                  {project.client.profilePictureUrl ? (
                    <img src={project.client.profilePictureUrl} alt="Client" className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-gray-50 dark:ring-dark-surface-2" />
                  ) : (
                    <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-xl shadow-sm ring-2 ring-gray-50 dark:ring-dark-surface-2">
                      {project.client.firstName[0]}{project.client.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{project.client.firstName} {project.client.lastName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{project.client.identity || "Client"}</p>
                  </div>
                </div>
                
                <div className="space-y-3.5 text-sm text-gray-600 dark:text-gray-300 mb-8">
                  <div className="flex justify-between gap-4 items-center">
                    <span>Average Rating</span>
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 bg-gray-50 dark:bg-dark-surface-2 px-2.5 py-1 rounded-lg">
                      {project.client.averageRating ? project.client.averageRating.toFixed(1) : "New"} <span className="text-yellow-400 text-lg">★</span>
                      {project.client.totalReviews > 0 && <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">({project.client.totalReviews})</span>}
                    </span>
                  </div>
                  
                  {clientData !== undefined && (
                    <>
                      <div className="flex justify-between gap-4">
                        <span>Projects Posted</span>
                        <span className="font-medium text-gray-900 dark:text-white">{clientData?.postedProjectsCount || 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Completed Hires</span>
                        <span className="font-medium text-gray-900 dark:text-white">{clientData?.completedHiresCount || 0}</span>
                      </div>
                    </>
                  )}

                  {project.client.company && (
                    <div className="flex justify-between gap-4 border-t border-gray-100 dark:border-dark-border pt-3 mt-3">
                      <span>Company</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate text-right">{project.client.company}</span>
                    </div>
                  )}
                  {project.client.industry && (
                    <div className="flex justify-between gap-4">
                      <span>Industry</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate text-right">{project.client.industry}</span>
                    </div>
                  )}
                  {project.client.teamSize && (
                    <div className="flex justify-between gap-4">
                      <span>Team Size</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate text-right">{project.client.teamSize}</span>
                    </div>
                  )}
                  {project.client.preferredCommunication && (
                    <div className="flex justify-between gap-4">
                      <span>Communication</span>
                      <span className="font-medium text-gray-900 dark:text-white truncate text-right">{project.client.preferredCommunication}</span>
                    </div>
                  )}
                  
                  {project.client.hiringPreferences && project.client.hiringPreferences.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-gray-100 dark:border-dark-border pt-3 mt-3">
                      <span>Hiring Preferences</span>
                      <div className="flex flex-wrap gap-1">
                        {project.client.hiringPreferences.map((pref: string) => (
                          <span key={pref} className="bg-gray-100 dark:bg-dark-surface-2 border border-gray-200 dark:border-dark-border px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-300">{pref}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(project.client.website || project.client.linkedin) && (
                    <div className="flex gap-4 pt-3 border-t border-gray-100 dark:border-dark-border mt-3">
                      {project.client.website && (
                        <a href={project.client.website.startsWith('http') ? project.client.website : `https://${project.client.website}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">Website</a>
                      )}
                      {project.client.linkedin && (
                        <a href={project.client.linkedin.startsWith('http') ? project.client.linkedin : `https://${project.client.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">LinkedIn</a>
                      )}
                    </div>
                  )}

                  {project.client.paymentVerified && (
                    <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg font-medium mt-4">
                      <span>💳</span> Payment Verified
                    </div>
                  )}
                </div>

                <Link
                  to={`/projects/${project._id}/propose`}
                  className="btn-primary w-full block text-center !py-3.5"
                >
                  Apply Now
                </Link>
              </div>

              {clientData && clientData.reviews && clientData.reviews.length > 0 && (
                <div className="bg-white dark:bg-dark-surface shadow-sm rounded-lg p-6 border border-gray-100 dark:border-dark-border">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Reviews</h3>
                  <div className="space-y-4">
                    {clientData.reviews.slice(0, 3).map((review: any) => (
                      <div key={review._id} className="border-b border-gray-100 dark:border-dark-border last:border-0 pb-4 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{review.reviewerName}</span>
                          <div className="flex text-yellow-400 text-xs">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 line-clamp-3 mt-1">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}