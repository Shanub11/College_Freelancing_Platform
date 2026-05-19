import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface ProposalFormData {
  coverLetter: string;
  proposedPrice: number;
  deliveryTime: number;
}

export function SubmitProposalPage() {
  const { projectId } = useParams<{ projectId: Id<"projectRequests"> }>();
  const navigate = useNavigate();
  const [submittedProposalId, setSubmittedProposalId] = useState<Id<"proposals"> | null>(null);
  const project = useQuery(api.projectRequests.getProjectRequestById, {
    projectId: projectId!,
  });
  const createProposal = useMutation(api.projectRequests.createProposal);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormData>();

  const proposedPrice = useWatch({ control, name: "proposedPrice" }) || 0;
  const platformFee = Math.round(proposedPrice * 0.10);
  const payout = proposedPrice - platformFee;

  const onSubmit = async (data: ProposalFormData) => {
    try {
      const newProposalId = await createProposal({
        projectId: projectId!,
        ...data,
      });
      toast.success("Proposal submitted successfully!");
      setSubmittedProposalId(newProposalId);
    } catch (error) {
      toast.error("Failed to submit proposal.");
      console.error(error);
    }
  };

  if (project === undefined) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500">Loading project details...</div>
      </div>
    );
  }

  if (project === null) {
    return <div className="text-center p-8">Project not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col transition-colors">
      {/* Header with Back Button */}
      <header className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl shadow-sm border-b border-gray-100 dark:border-dark-border sticky top-0 z-10 px-4 py-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <span className="font-semibold text-sm uppercase tracking-wider">Back</span>
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 w-full animate-fade-in-up">
        <div className="card p-6 md:p-10 relative overflow-hidden">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Submit a Proposal</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">For project: <span className="font-semibold text-gray-800 dark:text-gray-200">{project.title}</span></p>

          {submittedProposalId ? (
            <div className="mt-10 text-center animate-scale-in">
              <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-green-50/50 dark:ring-green-900/10">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Proposal Submitted!</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">The client has been notified. You can track your proposals on your dashboard.</p>
              <button
                onClick={() => navigate(`/dashboard`)}
                className="btn-primary mt-8"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
              <div>
                <label htmlFor="coverLetter" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cover Letter</label>
                <textarea
                  id="coverLetter"
                  {...register("coverLetter", { required: "Cover letter is required." })}
                  rows={6}
                  className="input-field min-h-[150px] resize-y"
                  placeholder="Introduce yourself and explain why you're a great fit for this project..."
                />
                {errors.coverLetter && <p className="text-red-500 text-sm mt-1">{errors.coverLetter.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="proposedPrice" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Price (₹)</label>
                  <input
                    type="number"
                    id="proposedPrice"
                    {...register("proposedPrice", { required: "Price is required.", valueAsNumber: true })}
                    className="input-field"
                    placeholder="e.g., 500"
                  />
                  {errors.proposedPrice && <p className="text-red-500 text-sm mt-1">{errors.proposedPrice.message}</p>}
                  
                  {proposedPrice > 0 && (
                    <div className="mt-4 p-5 bg-primary-50/50 dark:bg-primary-900/10 rounded-2xl border border-primary-100 dark:border-primary-900/30 text-sm animate-fade-in">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400 mb-2 font-medium">
                        <span>Project Amount:</span>
                        <span>₹{proposedPrice}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400 mb-3 font-medium">
                        <span>Platform Fee (10%):</span>
                        <span className="text-red-500">-₹{platformFee}</span>
                      </div>
                      <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-primary-100 dark:border-primary-900/30 pt-3 mt-1 text-base">
                        <span>You'll Receive:</span>
                        <span className="text-green-600 dark:text-green-400">₹{payout}</span>
                      </div>
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-4 flex items-start gap-1.5 font-medium bg-primary-100/50 dark:bg-primary-900/30 p-2 rounded-lg">
                        <span className="shrink-0">ℹ️</span> Platform fee helps us maintain secure payments and student support.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="deliveryTime" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Estimated Delivery (in days)</label>
                  <input
                    type="number"
                    id="deliveryTime"
                    {...register("deliveryTime", { required: "Delivery time is required.", valueAsNumber: true })}
                    className="input-field"
                    placeholder="e.g., 7"
                  />
                  {errors.deliveryTime && <p className="text-red-500 text-sm mt-1">{errors.deliveryTime.message}</p>}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-dark-border mt-8 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full md:w-auto min-w-[200px] !py-3.5">
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </div>
                  ) : "Submit Proposal"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}