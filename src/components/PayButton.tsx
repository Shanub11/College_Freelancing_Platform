import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PaymentMethodBadges } from "./PaymentMethodBadges";

// Declare Razorpay on window for TypeScript
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
      // Script tag exists — wait for it to load
      existingScript.addEventListener("load", () => setIsLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error("[Razorpay] Failed to load checkout script.");
      toast.error("Payment system failed to load. Please refresh and try again.");
    };
    document.body.appendChild(script);
  }, [isLoaded]);

  return isLoaded;
}

export function PayButton({
  orderId,
  amount,
}: {
  orderId: Id<"orders">;
  amount: number;
}) {
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);
  const [isLoading, setIsLoading] = useState(false);
  const razorpayReady = useRazorpayScript();

  const handlePay = async () => {
    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
    if (!razorpayKeyId) {
      toast.error("Payment system is not configured. Please contact support.");
      return;
    }

    if (!razorpayReady || !window.Razorpay) {
      toast.error("Payment system is still loading. Please wait a moment and try again.");
      return;
    }

    setIsLoading(true);
    try {
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
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () {
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to process payment.";
      console.error("Payment failed:", error);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !razorpayReady;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handlePay}
        disabled={isDisabled}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium 
                   hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50 
                   disabled:cursor-not-allowed w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : !razorpayReady ? (
          "Loading payment..."
        ) : (
          `Pay ₹${amount.toLocaleString("en-IN")}`
        )}
      </button>
      <PaymentMethodBadges />
    </div>
  );
}
