import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
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
        theme: { color: "#4F46E5" },
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
    <div className="flex flex-col items-start gap-2">
      {/* Security banner */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg px-3 py-2 w-full">
        <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <span>Secured with <strong>escrow protection</strong> — funds released only when you approve</span>
      </div>

      <button
        onClick={handlePay}
        disabled={isDisabled}
        className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl text-sm font-semibold
                   hover:from-emerald-700 hover:to-green-700 shadow-md hover:shadow-lg
                   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed 
                   w-full active:scale-[0.98] flex items-center justify-center gap-2"
        id="pay-button"
        aria-label={`Pay ${amount} rupees`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing securely...
          </>
        ) : !razorpayReady ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading payment...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            Pay ₹{amount.toLocaleString("en-IN")} securely
          </>
        )}
      </button>
      <PaymentMethodBadges />
    </div>
  );
}
