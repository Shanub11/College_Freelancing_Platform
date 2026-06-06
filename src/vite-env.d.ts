/// <reference types="vite/client" />

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler?: (response: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  }) => void | Promise<void>;
  prefill?: Record<string, string | undefined>;
  notes?: Record<string, string | undefined>;
  theme?: {
    color?: string;
  };
}

interface RazorpayCheckout {
  open: () => void;
  on: (event: string, callback: (response: any) => void) => void;
}

interface Window {
  Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout;
}
