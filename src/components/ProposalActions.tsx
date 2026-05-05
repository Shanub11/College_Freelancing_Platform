import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  const markOrderPaid = useMutation(api.projects.markOrderPaid);
  
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
        key: import.meta.env.VITE_RAZORPAY_KEY_ID as string,
        amount: amount * 100, // Amount in paise
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Order",
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          // Success! Update DB instantly for test mode (Bypassing missing local webhooks)
          await markOrderPaid({ orderId });
          toast.success("Payment Successful! Funds are now held in Escrow.");
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
      toast.error(error.message || "Failed to process acceptance.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this proposal?")) return;
    
    try {
      await rejectProposal({ proposalId });
      toast.success("Proposal rejected successfully.");
      // Refresh the page to remove the rejected proposal from the list
      navigate(0);
    } catch (error) {
      console.error("Reject failed:", error);
      toast.error("Failed to reject proposal.");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <div className="flex gap-3">
        <button 
          onClick={handleAccept} 
          disabled={isLoading}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex-1 shadow-sm"
        >
          {isLoading ? "Processing..." : "Accept & Pay"}
        </button>
        
        <button 
          onClick={handleReject} 
          disabled={isLoading}
          className="bg-red-50 text-red-600 border border-red-200 px-6 py-2.5 rounded-lg font-bold hover:bg-red-100 disabled:opacity-50 transition-colors flex-1"
        >
          Reject
        </button>
      </div>
      <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2 border border-blue-100">
        <span className="text-base leading-none">🔒</span> 
        <p className="font-medium">Your money is safe. Payment is held securely in escrow and released only after you approve the work.</p>
      </div>
    </div>
  );
}