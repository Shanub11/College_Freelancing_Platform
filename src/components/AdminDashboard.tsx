import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { SignOutButton } from "../SignOutButton";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"verifications" | "logs">("verifications");
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
            <p className="text-sm text-gray-600">Manage platform verifications and view activity logs</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-lg p-1 shadow-sm border">
              <button
                onClick={() => setActiveTab("verifications")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "verifications"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Verifications
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "logs"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Activity Logs
              </button>
            </div>
            <SignOutButton />
          </div>
        </div>
        
      </header>
      <main className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {activeTab === "verifications" ? (
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
          ) : (
            <ActivityLogList />
          )}
        </div>
      </main>
    </div>
  );
}

function ActivityLogList() {
  const [filterAction, setFilterAction] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterPerformerName, setFilterPerformerName] = useState("");

  // Cast api to any to avoid type errors before codegen runs
  const logs = useQuery((api as any).logs?.getLogs, {
    action: filterAction || undefined,
    date: filterDate || undefined,
    performerName: filterPerformerName || undefined,
  });

  const clearFilters = () => {
    setFilterAction("");
    setFilterDate("");
    setFilterPerformerName("");
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Activity Logs</h3>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Actions</option>
              <option value="User Login">User Login</option>
              <option value="User Logout">User Logout</option>
              <option value="Profile Created">Profile Created</option>
              <option value="Profile Updated">Profile Updated</option>
              <option value="Verification Requested">Verification Requested</option>
              <option value="Verification Approved">Verification Approved</option>
              <option value="Verification Rejected">Verification Rejected</option>
              <option value="Project Created">Project Created</option>
              <option value="Proposal Accepted">Proposal Accepted</option>
              <option value="Proposal Rejected">Proposal Rejected</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />

            <input
              type="text"
              placeholder="Search by Name"
              value={filterPerformerName}
              onChange={(e) => setFilterPerformerName(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-48"
            />

            {(filterAction || filterDate || filterPerformerName) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      
      {logs === undefined ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900">No logs found</h3>
          <p className="text-gray-600">Try adjusting your filters.</p>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log: any) => (
              <tr key={log._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${log.action.includes("Approved") ? "bg-green-100 text-green-800" : 
                      log.action.includes("Rejected") ? "bg-red-100 text-red-800" : 
                      "bg-blue-100 text-blue-800"}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{log.performerName}</div>
                  <div className="text-sm text-gray-500">{log.performerEmail}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate" title={log.details}>
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}