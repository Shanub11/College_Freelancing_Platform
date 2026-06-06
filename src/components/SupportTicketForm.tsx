/**
 * SupportTicketForm — Help & Support tab content.
 * Extracted from Dashboard.tsx (H1 god-component fix).
 * Handles both general support tickets and order/project-specific disputes.
 */
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface SupportTicketFormProps {
  initialOrderId?: Id<"orders"> | null;
  initialProjectId?: Id<"projectRequests"> | null;
}

export function SupportTicketForm({ initialOrderId, initialProjectId }: SupportTicketFormProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const openDispute = useMutation(api.disputes.openDispute);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await openDispute({
        orderId: initialOrderId || undefined,
        projectId: initialProjectId || undefined,
        reason,
      });
      toast.success("Support ticket generated successfully. An admin will review it soon.");
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-sm p-8 max-w-2xl mx-auto mt-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Help &amp; Support</h2>

      {(initialOrderId || initialProjectId) && (
        <div className="bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 text-primary-700 dark:text-primary-400 p-4 rounded-xl mb-6 text-sm">
          <strong>Note:</strong> You are submitting a ticket regarding a specific{" "}
          {initialOrderId ? "Order" : "Project"}. The details have been attached automatically.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            How can we help you?
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={6}
            placeholder="Describe your issue in detail..."
            className="input-field min-h-[120px] resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary py-3 active:scale-[0.99] transition-transform"
        >
          {isSubmitting ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}
