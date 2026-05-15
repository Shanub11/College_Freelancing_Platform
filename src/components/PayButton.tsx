import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

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
    setIsLoading(true);
    try {
      const razorpayOrderId = await createRazorpayOrder({ orderId });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID as string,
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
    <button 
      onClick={handlePay} 
      disabled={isLoading}
      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50"
    >
      {isLoading ? "Processing..." : `Pay ₹${amount}`}
    </button>
  );
}