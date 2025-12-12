import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";

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
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Order",
        order_id: razorpayOrderId,
        handler: function (response: any) {
          // Success! The webhook will handle the database update.
          alert("Payment Successful! Funds are now held in Escrow.");
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
      alert("Failed to initiate payment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={isLoading}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      {isLoading ? "Processing..." : `Pay ₹${amount} (Escrow)`}
    </button>
  );
}