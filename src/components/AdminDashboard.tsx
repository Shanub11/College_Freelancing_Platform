import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function AdminDashboard() {
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
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Student Verification Requests</p>
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
                  <ul className="divide-y divide-gray-200">
                    {pendingVerifications.map((req) => (
                      req.profileId && (
                        <li key={req._id} className="py-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{req.profileName}</p>
                            <p className="text-sm text-gray-500">{req.collegeName} - {req.collegeEmail}</p>
                            {/* You can add a link to the verification document here later */}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(req._id, req.profileId!)}
                              className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(req._id)}
                              className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </li>
                      )
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}