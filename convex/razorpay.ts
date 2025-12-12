import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// You'll need to store your RAZORPAY_WEBHOOK_SECRET as an environment variable in your Convex project settings.
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export const handleRazorpayWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("x-razorpay-signature");
  const body = await request.text();

  if (!signature) {
    console.error("Razorpay webhook signature missing from headers.");
    return new Response("Signature missing", { status: 401 });
  }

  // 1. Verify the webhook signature to ensure the request is from Razorpay.
  // We use the Web Crypto API available in the Convex runtime.
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(RAZORPAY_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(body)
    );

    if (!isValid) {
      console.error("Razorpay webhook verification failed: Signatures do not match.");
      return new Response("Webhook verification failed", { status: 401 });
    }
  } catch (err) {
    console.error("Error during Razorpay webhook verification:", err);
    return new Response("Webhook Error", { status: 400 });
  }

  // 2. Handle the event
  const event = JSON.parse(body);
  if (event.event === "payment.captured") {
    const paymentId = event.payload.payment.entity.id;
    const orderId = event.payload.payment.entity.order_id;

    // Fetch transfers using standard fetch instead of SDK
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    const transfers = await response.json();
    const transferId = transfers.items?.[0]?.id;

    await ctx.runMutation(internal.payments.markAsFunded, {
      razorpayOrderId: orderId,
      razorpayTransferId: transferId,
    });
  }

  // Return a 200 response to acknowledge receipt of the event
  return new Response(null, { status: 200 });
});