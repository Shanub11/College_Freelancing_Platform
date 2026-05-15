/**
 * PaymentMethodBadges - Shows accepted payment methods below pay buttons.
 * 
 * Indian users strongly prefer seeing UPI logos before clicking pay.
 * This component is used on all payment CTAs across the app.
 */
export function PaymentMethodBadges() {
  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
        Accepted payment methods
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* UPI */}
        <div className="flex items-center gap-1 bg-purple-50 border border-purple-100 px-2 py-1 rounded-md">
          <span className="text-purple-700 font-bold text-xs">UPI</span>
        </div>
        {/* Google Pay */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-md">
          <span className="text-blue-500 font-bold text-[11px]">G</span>
          <span className="text-red-500 font-bold text-[11px]">Pay</span>
        </div>
        {/* PhonePe */}
        <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">
          <span className="text-indigo-700 font-bold text-xs">PhonePe</span>
        </div>
        {/* Paytm */}
        <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">
          <span className="text-blue-700 font-bold text-xs">Paytm</span>
        </div>
        {/* Cards */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
          <span className="text-gray-600 text-xs">💳 Cards</span>
        </div>
        {/* Net Banking */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-md">
          <span className="text-gray-600 text-xs">🏦 NetBanking</span>
        </div>
      </div>
      {/* Trust indicator */}
      <p className="text-[10px] text-gray-400 flex items-center gap-1">
        <span>🔒</span>
        <span>Secured by Razorpay · 256-bit SSL encryption</span>
      </p>
    </div>
  );
}