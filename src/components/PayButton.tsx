import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export function PayButton({ orderId, amount }: { orderId: Id<"orders">, amount: number }) {
  const createOrder = useAction(api.paymentActions.createRazorpayOrder);
  const [isLoading, setIsLoading] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // 1. Create Order on Backend (Escrow enabled)
      const razorpayOrderId = await createOrder({ orderId });

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID as string,
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Order",
        order_id: razorpayOrderId,
        handler: function (response: any) {
          // Success! The webhook will handle the database update.
          toast.success("Payment Successful! Funds are now held in Escrow.");
          // Ideally, redirect to the order status page here
        },
        prefill: {
          // You can prefill client details here if available
          // name: "Client Name",
          // email: "client@example.com",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initialization failed:", error);
      toast.error("Failed to initiate payment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 max-w-sm">
      <button 
        onClick={handlePayment} 
        disabled={isLoading}
        className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm text-lg"
      >
        {isLoading ? "Processing..." : `Pay ₹${amount} (Escrow)`}
      </button>
      <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2 border border-blue-100">
        <span className="text-xl leading-none">🔒</span> 
        <p className="font-medium">Your money is safe. Payment is held securely and released only after you approve the work.</p>
      </div>
    </div>
  );
}