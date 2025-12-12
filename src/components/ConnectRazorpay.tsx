import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

export function ConnectRazorpay({ userId, email, name }: { userId: Id<"users">, email: string, name: string }) {
  const onboard = useAction(api.paymentActions.onboardFreelancer);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const accountId = await onboard({ userId, email, name });
      alert(`Razorpay Account Connected! ID: ${accountId}`);
    } catch (error) {
      console.error("Onboarding failed:", error);
      alert("Failed to connect Razorpay account.");
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