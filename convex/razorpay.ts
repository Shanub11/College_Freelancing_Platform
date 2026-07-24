import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { SimpleSentry } from "./lib/sentry";

declare const process: any;

// You'll need to store your RAZORPAY_WEBHOOK_SECRET as an environment variable in your Convex project settings.
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoded));
}

export const handleRazorpayWebhook = httpAction(async (ctx, request) => {
  // Initialize Sentry for Convex (V8 Isolate environment)
  const sentry = new SimpleSentry(process.env.SENTRY_DSN || "");

  const signature = request.headers.get("x-razorpay-signature");
  const body = await request.text();

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error("Razorpay webhook secret is not configured.");
    sentry.captureMessage("Razorpay webhook secret missing", "fatal");
    return new Response("Webhook not configured", { status: 500 });
  }

  if (!signature) {
    console.error("Razorpay webhook signature missing from headers.");
    sentry.captureMessage("Razorpay webhook signature missing", "warning");
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
      sentry.captureMessage("Razorpay webhook signature mismatch", "error");
      return new Response("Webhook verification failed", { status: 401 });
    }
  } catch (err) {
    console.error("Error during Razorpay webhook verification:", err);
    sentry.captureException(err);
    return new Response("Webhook Error", { status: 400 });
  }

  try {
    // 2. Handle the event
    const event = JSON.parse(body);
    const eventType = typeof event.event === "string" ? event.event : "unknown";
    const bodyHash = await sha256Hex(body);
    const providerEventId =
      typeof event.id === "string"
        ? event.id
        : typeof event.payload?.payment?.entity?.id === "string"
          ? `${eventType}:${event.payload.payment.entity.id}`
          : typeof event.payload?.account?.entity?.id === "string"
            ? `${eventType}:${event.payload.account.entity.id}`
            : `${eventType}:${bodyHash}`;

    const claimed = await ctx.runMutation(
      internal.payments.claimRazorpayWebhookEvent,
      {
        eventId: providerEventId,
        eventType,
      }
    );

    if (!claimed) {
      return new Response(null, { status: 200 });
    }

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
        razorpayPaymentId: paymentId,
        razorpayTransferId: transferId,
      });
    }

    if (event.event === "account.activated") {
      const accountId = event.payload?.account?.entity?.id;
      if (!accountId) {
        console.warn("[Webhook] account.activated event missing account id.");
      } else {
        await ctx.runMutation(internal.payments.markFreelancerPayoutReady, {
          razorpayAccountId: accountId,
        });
      }
    }

    // Return a 200 response to acknowledge receipt of the event
    return new Response(null, { status: 200 });
  } catch (err) {
    console.error("Error processing Razorpay webhook:", err);
    sentry.captureException(err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
