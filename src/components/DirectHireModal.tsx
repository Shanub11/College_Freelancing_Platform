import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PaymentMethodBadges } from "./PaymentMethodBadges";

export interface DirectHireGig {
  _id: Id<"gigs">;
  freelancerId: Id<"users">;
  title: string;
  basePrice: number;
  deliveryTime: number;
}

interface DirectHireModalProps {
  gig: DirectHireGig;
  onClose: () => void;
}

export function DirectHireModal({ gig, onClose }: DirectHireModalProps) {
  const createDirectOrder = useMutation(api.projects.createDirectOrder);
  const createRazorpayOrder = useAction(api.paymentActions.createRazorpayOrder);

  const [formData, setFormData] = useState({
    title: `Direct Order: ${gig.title}`,
    description: `I would like to hire you for your service "${gig.title}". Here are my specific requirements:\n\n`,
    price: gig.basePrice,
    deliveryTime: gig.deliveryTime,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price < 5) return toast.error("Minimum order price is Rs 5");

    setIsLoading(true);
    try {
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
      if (!razorpayKeyId) {
        toast.error("Payment system is not configured. Please contact support.");
        return;
      }

      const orderId = await createDirectOrder({
        freelancerId: gig.freelancerId,
        gigId: gig._id,
        title: formData.title,
        description: formData.description,
        price: formData.price,
        deliveryTime: formData.deliveryTime,
      });

      const razorpayOrderId = await createRazorpayOrder({ orderId });

      if (!window.Razorpay) {
        toast.error("Payment checkout is still loading. Please try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        amount: Math.round(formData.price * 100),
        currency: "INR",
        name: "College Freelancing Platform",
        description: "Escrow Payment for Direct Order",
        order_id: razorpayOrderId,
        handler: async () => {
          toast.success("Payment received! Your order will activate shortly.", {
            duration: 6000,
          });
          onClose();
        },
        theme: { color: "#3399cc" },
      });
      rzp.open();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initiate direct hire";
      toast.error(message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface border border-transparent rounded-lg shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300">x</button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Hire for: {gig.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Title</label>
            <input required type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requirements & Instructions</label>
            <textarea required rows={4} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (Rs)</label>
              <input required type="number" min="5" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery (Days)</label>
              <input required type="number" min="1" value={formData.deliveryTime} onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors" />
            </div>
          </div>
          <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 p-4 rounded-lg text-sm flex gap-3">
            <span className="text-xl" aria-hidden="true">[lock]</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Secure Escrow Payment</p>
              <p className="text-blue-800">Your Rs {formData.price} payment will be held securely in escrow and released to the freelancer only after you approve the delivered work.</p>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
            {isLoading ? "Processing..." : `Pay Rs ${formData.price.toLocaleString("en-IN")} & Start Order`}
          </button>
          <PaymentMethodBadges />
        </form>
      </div>
    </div>
  );
}
