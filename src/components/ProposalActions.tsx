import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PaymentMethodBadges } from "./PaymentMethodBadges";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

function useRazorpayScript(): boolean {
  const [isLoaded, setIsLoaded] = useState(
    typeof window !== "undefined" && !!window.Razorpay
  );

  useEffect(() => {
    if (isLoaded) return;

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => setIsLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      toast.error("Payment system failed to load. Please refresh and try again.");
    };
    document.body.appendChild(script);
  }, [isLoaded]);

  return isLoaded;
}

export function ProposalActions({
  proposalId,
  amount,
  clientName,
  clientEmail,
}: {
  proposalId: Id<"proposals">;
  amount: number;
  clientName?: string;
  clientEmail?: string;
}) {
  const navigate = useNavigate();
  const acceptProposal = useMutation(api.proposals.acceptProposal);
  const rejectProposal = useMutation(api.proposals.rejectProposal);
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);
  const razorpayReady = useRazorpayScript();

  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
    if (!razorpayKeyId) {
      toast.error("Payment system is not configured. Please contact support.");
      return;
    }

    if (!razorpayReady || !window.Razorpay) {
      toast.error("Payment system is still loading. Please wait a moment.");
      return;
    }

    setIsLoading(true);
    try {
      const orderId = await acceptProposal({ proposalId });
      const razorpayOrderId = await createRazorpayOrder({ orderId });

      const options = {
        key: razorpayKeyId,
        amount: amount * 100,
        currency: "INR",
        name: "CollegeGig",
        description: "Escrow Payment for Order",
        order_id: razorpayOrderId,
        handler: function (_response: Record<string, unknown>) {
          toast.success(
            "Payment received! Your order will activate shortly once confirmed.",
            { duration: 6000 }
          );
        },
        prefill: {
          name: clientName,
          email: clientEmail,
        },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () {
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to process.";
      console.error("Accept flow failed:", error);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this proposal?")) return;
    try {
      await rejectProposal({ proposalId });
      toast.success("Proposal rejected successfully.");
      navigate(0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reject.";
      console.error("Reject failed:", error);
      toast.error(message);
    }
  };

  const isDisabled = isLoading || !razorpayReady;

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isDisabled}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold 
                     hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed 
                     transition-colors flex-1 shadow-sm"
        >
          {isLoading
            ? "Processing..."
            : !razorpayReady
            ? "Loading..."
            : "Accept & Pay"}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 
                     rounded-lg font-bold hover:bg-red-100 disabled:opacity-50 
                     transition-colors flex-1"
        >
          Reject
        </button>
      </div>
      <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg 
                      flex items-start gap-2 border border-blue-100">
        <span className="text-base leading-none">🔒</span>
        <p className="font-medium">
          Your money is safe. Payment is held securely in escrow and released 
          only after you approve the work.
        </p>
      </div>
      <PaymentMethodBadges />
    </div>
  );
}
