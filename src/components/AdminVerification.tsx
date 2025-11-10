import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AdminVerification() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const pendingRequests = useQuery(api.verification.getPendingVerifications) || [];
  const selectedRequestDetails = useQuery(
    api.verification.getVerificationDetails,
    selectedRequest ? { requestId: selectedRequest as any } : "skip"
  );
  const reviewVerification = useMutation(api.verification.reviewVerification);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;

    try {
      await reviewVerification({
        requestId: selectedRequest as any,
        status,
        adminNotes: reviewNotes || undefined,
      });

      toast.success(`Verification ${status} successfully`);
      setSelectedRequest(null);
      setReviewNotes("");
    } catch (error) {
      toast.error(`Failed to ${status} verification`);
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Verification</h1>
        <p className="text-gray-600">Review and approve student verification requests</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Requests List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>
          
          <div className="divide-y max-h-96 overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-2">✅</div>
                <p className="text-gray-600">No pending verification requests</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request._id}
                  onClick={() => setSelectedRequest(request._id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedRequest === request._id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {request.profile?.firstName} {request.profile?.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{request.collegeName}</p>
                      <p className="text-sm text-gray-500">{request.collegeEmail}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(request._creationTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Request Details</h2>
          </div>
          
          {!selectedRequest ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-2">👈</div>
              <p className="text-gray-600">Select a request to review</p>
            </div>
          ) : selectedRequestDetails ? (
            <div className="p-4 space-y-6">
              {/* Student Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Student Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">
                      {selectedRequestDetails.profile?.firstName} {selectedRequestDetails.profile?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedRequestDetails.user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">College:</span>
                    <span className="font-medium">{selectedRequestDetails.collegeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">College Email:</span>
                    <span className="font-medium">{selectedRequestDetails.collegeEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium">
                      {new Date(selectedRequestDetails._creationTime).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student ID Document */}
              {selectedRequestDetails.studentIdUrl && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Student ID Document</h3>
                  <div className="border rounded-lg p-4">
                    <img
                      src={selectedRequestDetails.studentIdUrl}
                      alt="Student ID"
                      className="max-w-full h-auto rounded"
                      onError={(e) => {
                        // If image fails to load, show a download link instead
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const link = document.createElement('a');
                        link.href = selectedRequestDetails.studentIdUrl!;
                        link.textContent = 'Download Student ID Document';
                        link.className = 'text-blue-600 hover:text-blue-700 underline';
                        link.target = '_blank';
                        target.parentNode?.appendChild(link);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Review Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes (Optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about your decision..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => handleReview("approved")}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview("rejected")}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading request details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
