import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ConnectRazorpayProps {
  userId: Id<"users">;
  onSuccess?: (razorpayAccountId: string) => void;
}

// Full bank-details form that calls saveBankDetailsAndStartRouteOnboarding.
// The old onboardFreelancer action was removed (it only accepted email+name
// and was superseded by this full KYC flow).
export function ConnectRazorpay({ userId: _userId, onSuccess }: ConnectRazorpayProps) {
  const startOnboarding = useAction(api.paymentActions.saveBankDetailsAndStartRouteOnboarding);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    accountHolderName: "",
    ifsc: "",
    accountNumber: "",
    stakeholderPhone: "",
    stakeholderPan: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await startOnboarding({
        accountHolderName: form.accountHolderName,
        ifsc: form.ifsc,
        accountNumber: form.accountNumber,
        stakeholderPhone: form.stakeholderPhone,
        stakeholderPan: form.stakeholderPan,
      });
      toast.success(`Payout account submitted! Status: ${result.status}`);
      onSuccess?.(result.razorpayAccountId);
    } catch (error: any) {
      console.error("Payout onboarding failed:", error);
      toast.error(error?.message || "Failed to connect payout account.");
    } finally {
      setIsLoading(false);
    }
  };

  const fields: { name: keyof typeof form; label: string; placeholder: string; hint?: string }[] = [
    { name: "accountHolderName", label: "Account Holder Name", placeholder: "As on bank account" },
    { name: "accountNumber",     label: "Bank Account Number", placeholder: "Enter account number" },
    { name: "ifsc",              label: "IFSC Code",           placeholder: "e.g. SBIN0001234", hint: "11-character IFSC code" },
    { name: "stakeholderPhone",  label: "Mobile Number",       placeholder: "Without country code", hint: "Linked to your bank account" },
    { name: "stakeholderPan",    label: "PAN Number",          placeholder: "e.g. ABCDE1234F", hint: "Permanent Account Number" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(({ name, label, placeholder, hint }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
          <input
            type="text"
            name={name}
            value={form[name]}
            onChange={handleChange}
            placeholder={placeholder}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-surface text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
      ))}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        {isLoading ? "Submitting…" : "Connect Payout Account"}
      </button>
    </form>
  );
}