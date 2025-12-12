import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";

export function ProposalActions({ 
  proposalId, 
  amount,
  clientName,
  clientEmail 
}: { 
  proposalId: Id<"proposals">, 
  amount: number,
  clientName?: string,
  clientEmail?: string
}) {
  const navigate = useNavigate();
  const acceptProposal = useMutation(api.proposals.acceptProposal);
  const rejectProposal = useMutation(api.proposals.rejectProposal);
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);
  
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

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      // 1. Accept Proposal & Create Order in DB
      const orderId = await acceptProposal({ proposalId });

      // 2. Create Razorpay Order (Escrow)
      const razorpayOrderId = await createRazorpayOrder({ orderId });

      // 3. Open Razorpay Checkout
      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID : undefined),
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Order",
        order_id: razorpayOrderId,
        handler: function (response: any) {
          // Success! Redirect to the Order page
          navigate(`/orders/${orderId}`);
        },
        prefill: {
          name: clientName,
          email: clientEmail,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Accept flow failed:", error);
      alert(error.message || "Failed to process acceptance.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this proposal?")) return;
    
    try {
      await rejectProposal({ proposalId });
      // Refresh the page to remove the rejected proposal from the list
      navigate(0);
    } catch (error) {
      console.error("Reject failed:", error);
      alert("Failed to reject proposal.");
    }
  };

  return (
    <div className="flex gap-3">
      <button 
        onClick={handleAccept} 
        disabled={isLoading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? "Processing..." : "Accept & Pay"}
      </button>
      
      <button 
        onClick={handleReject} 
        disabled={isLoading}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}