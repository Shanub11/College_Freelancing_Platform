import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormData>();

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

  if (!project) {
    return <div>Loading project details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit a Proposal</h1>
        <p className="text-gray-600 mt-1">For project: <span className="font-semibold">{project.title}</span></p>

        {submittedProposalId ? (
          <div className="mt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-xl font-semibold">Proposal Submitted!</h2>
            <p className="text-gray-600 mt-2">You can now discuss the project details with the client.</p>
            <button
              onClick={() => navigate(`/proposals/${submittedProposalId}/discussion`)}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              Discuss Proposal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700">Cover Letter</label>
              <textarea
                id="coverLetter"
                {...register("coverLetter", { required: "Cover letter is required." })}
                rows={6}
                className="mt-1 px-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              {errors.coverLetter && <p className="text-red-500 text-sm mt-1">{errors.coverLetter.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="proposedPrice" className="block text-sm font-medium text-gray-700">Your Price ($)</label>
                <input
                  type="number"
                  id="proposedPrice"
                  {...register("proposedPrice", { required: "Price is required.", valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.proposedPrice && <p className="text-red-500 text-sm mt-1">{errors.proposedPrice.message}</p>}
              </div>
              <div>
                <label htmlFor="deliveryTime" className="block text-sm font-medium text-gray-700">Estimated Delivery (in days)</label>
                <input
                  type="number"
                  id="deliveryTime"
                  {...register("deliveryTime", { required: "Delivery time is required.", valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.deliveryTime && <p className="text-red-500 text-sm mt-1">{errors.deliveryTime.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300">
              {isSubmitting ? "Submitting..." : "Submit Proposal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}