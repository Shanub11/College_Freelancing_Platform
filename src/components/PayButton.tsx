import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PaymentMethodBadges } from "./PaymentMethodBadges";

export function PayButton({ orderId, amount }: { orderId: Id<"orders">, amount: number }) {
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePay = async () => {
    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
    if (!razorpayKeyId) {
      toast.error(
        "Payment system is not configured. Please contact support."
      );
      console.error(
        "Missing environment variable: VITE_RAZORPAY_KEY_ID"
      );
      return;
    }

    setIsLoading(true);
    try {
      const razorpayOrderId = await createRazorpayOrder({ orderId });

      const options = {
        key: razorpayKeyId,
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Order",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          // Order activation happens via Razorpay webhook → convex/razorpay.ts → markAsFunded
          toast.success("Payment received! Your order will activate shortly once confirmed.", { duration: 6000 });
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment failed:", error);
      toast.error(error.message || "Failed to process payment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button 
        onClick={handlePay} 
        disabled={isLoading}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50 w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay ₹${amount.toLocaleString("en-IN")}`
        )}
      </button>
      <PaymentMethodBadges />
    </div>
  );
}