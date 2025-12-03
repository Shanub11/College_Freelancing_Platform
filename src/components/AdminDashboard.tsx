import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { SignOutButton } from "../SignOutButton";

export function AdminDashboard() {
  const [expandedRequestId, setExpandedRequestId] = useState<Id<"verificationRequests"> | null>(null);
  const pendingVerifications = useQuery(api.profiles.getPendingVerifications) || [];
  const approve = useMutation(api.profiles.approveVerification);
  const reject = useMutation(api.profiles.rejectVerification);

  const handleApprove = async (requestId: Id<"verificationRequests">, profileId: Id<"profiles">) => {
    try {
      await approve({ requestId, profileId });
      toast.success("Profile verification approved!");
    } catch (error) {
      toast.error("Failed to approve verification.");
      console.error(error);
    }
  };

  const handleReject = async (requestId: Id<"verificationRequests">) => {
    try {
      await reject({ requestId });
      toast.warning("Profile verification rejected.");
    } catch (error) {
      toast.error("Failed to reject verification.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Student Verification Requests</p>
          </div>
          <div>
            <SignOutButton />
          </div>
        </div>
        
      </header>
      <main className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Pending Verifications ({pendingVerifications.length})
              </h3>
              <div className="mt-4">
                {pendingVerifications.length === 0 ? (
                  <p className="text-gray-500">No profiles are currently pending verification.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingVerifications.map((req) => (
                      req.profileId && (
                        <div key={req._id} className="border bg-white rounded-lg shadow-sm">
                          <div 
                            className="p-4 flex items-center justify-between cursor-pointer"
                            onClick={() => setExpandedRequestId(expandedRequestId === req._id ? null : req._id)}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{req.profileName}</p>
                              <p className="text-sm text-gray-500">{req.collegeName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-400">
                                {new Date(req._creationTime).toLocaleDateString()}
                              </span>
                              <button className="text-gray-500 hover:text-gray-700">
                                {expandedRequestId === req._id ? '▲' : '▼'}
                              </button>
                            </div>
                          </div>
                          {expandedRequestId === req._id && (
                            <div className="border-t p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-gray-500">College Email</p>
                                  <p className="text-gray-900">{req.collegeEmail}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-500">Course</p>
                                  <p className="text-gray-900">{req.course}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-500">Department</p>
                                  <p className="text-gray-900">{req.department}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {req.studentIdUrl && (
                                  <a href={req.studentIdUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-100 p-3 rounded-lg text-center hover:bg-gray-200 transition-colors">
                                    View Student ID
                                  </a>
                                )}
                                {req.govtIdUrl && (
                                  <a href={req.govtIdUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-100 p-3 rounded-lg text-center hover:bg-gray-200 transition-colors">
                                    View Government ID
                                  </a>
                                )}
                              </div>
                              <div className="flex justify-end gap-3 pt-4">
                                <button
                                  onClick={() => handleReject(req._id)}
                                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApprove(req._id, req.profileId!)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}