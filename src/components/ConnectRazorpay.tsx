import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

// userId prop is kept for parent-side use (display, etc.) but is NO longer
// forwarded to onboardFreelancer — the server action now derives userId from
// the authenticated session to prevent auth-bypass (see C3 fix in paymentActions.ts).
export function ConnectRazorpay({ userId: _userId, email, name }: { userId: Id<"users">, email: string, name: string }) {
  const onboard = useAction(api.paymentActions.onboardFreelancer);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // userId is intentionally omitted — the action uses the session identity.
      const accountId = await onboard({ email, name });
      toast.success(`Razorpay Account Connected! ID: ${accountId}`);
    } catch (error) {
      console.error("Onboarding failed:", error);
      toast.error("Failed to connect Razorpay account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleConnect} 
      disabled={isLoading}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      {isLoading ? "Connecting..." : "Connect Razorpay for Payouts"}
    </button>
  );
}