import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function ReleaseFundsButton({ paymentId }: { paymentId: Id<"payments"> }) {
  const release = useAction(api.paymentActions.releaseEscrow);
  const [isLoading, setIsLoading] = useState(false);

  const handleRelease = async () => {
    if (!confirm("Are you sure you want to approve the work and release funds to the freelancer?")) return;

    setIsLoading(true);
    try {
      await release({ paymentId });
      alert("Funds released successfully!");
    } catch (error) {
      console.error("Release failed:", error);
      alert("Failed to release funds. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleRelease} 
      disabled={isLoading}
      className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
    >
      {isLoading ? "Releasing..." : "Approve Work & Release Funds"}
    </button>
  );
}