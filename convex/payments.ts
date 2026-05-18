import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * INTERNAL: Marks a payment as funded.
 * Called by the Razorpay webhook handler after a successful capture.
 */
export const markAsFunded = internalMutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayTransferId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_razorpayOrderId", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId)
      )
      .unique();

    if (!payment) {
      // Log but do not throw — Razorpay may send webhooks for orders
      // created outside this system or before our DB record was created.
      console.warn(
        `[Webhook] Payment not found for Razorpay Order ID: ${args.razorpayOrderId}. Skipping.`
      );
      return null;
    }

    // IDEMPOTENCY CHECK: If already funded, this is a duplicate webhook.
    // Do nothing and return success so Razorpay stops retrying.
    if (payment.status === "funded" || payment.status === "released") {
      console.log(
        `[Webhook] Payment ${payment._id} already has status "${payment.status}". ` +
        `Duplicate webhook for Razorpay Order ID: ${args.razorpayOrderId}. Skipping.`
      );
      return null;
    }

    // Only process if currently in "pending" status
    if (payment.status !== "pending") {
      console.warn(
        `[Webhook] Payment ${payment._id} has unexpected status "${payment.status}" ` +
        `for Razorpay Order ID: ${args.razorpayOrderId}. Skipping.`
      );
      return null;
    }

    // Mark payment as funded
    await ctx.db.patch(payment._id, {
      status: "funded",
      razorpayTransferId: args.razorpayTransferId,
    });

    // Update order status
    await ctx.db.patch(payment.orderId, {
      status: "active",
    });

    // Fetch the order to get the project ID
    const order = await ctx.db.get(payment.orderId);
    if (order && order.projectId) {
      // Update the project status to in_progress
      await ctx.db.patch(order.projectId, {
        status: "in_progress",
        selectedFreelancer: order.freelancerId,
      });

      // Mark the winning proposal as accepted now that payment is confirmed
      const winningProposal = await ctx.db
        .query("proposals")
        .withIndex("by_project_and_freelancer", (q) =>
          q.eq("projectId", order.projectId!).eq("freelancerId", order.freelancerId)
        )
        .first();

      if (winningProposal) {
        await ctx.db.patch(winningProposal._id, { status: "accepted" });
      }

      // Reject other proposals for the same project now that payment is confirmed
      const otherProposals = await ctx.db
        .query("proposals")
        .withIndex("by_projectId", (q) => q.eq("projectId", order.projectId!))
        .filter((q) => q.neq(q.field("freelancerId"), order.freelancerId))
        .collect();

      for (const proposal of otherProposals) {
        await ctx.db.patch(proposal._id, { status: "rejected" });
      }
    }

    // Send email notification to the freelancer that payment is confirmed
    if (order) {
      const freelancerUser = await ctx.db.get(order.freelancerId);
      const clientProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", order.clientId))
        .unique();

      if (freelancerUser?.email) {
        const freelancerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", order.freelancerId))
          .unique();

        await ctx.scheduler.runAfter(
          0,
          internal.email.sendPaymentReceivedEmail,
          {
            toEmail: freelancerUser.email,
            toName: freelancerProfile
              ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
              : freelancerUser.email,
            orderTitle: order.title,
            amount: payment.amount,
            clientName: clientProfile
              ? `${clientProfile.firstName} ${clientProfile.lastName}`
              : "Your client",
          }
        );
      }
    }

    console.log(
      `[Webhook] Successfully funded payment ${payment._id} ` +
      `for Razorpay Order ID: ${args.razorpayOrderId}`
    );

    return null;
  },
});

// --- Internal Helpers ---

export const getOrderAndFreelancer = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const freelancerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", order.freelancerId))
      .unique();

    return { order, freelancerProfile };
  },
});

export const createPaymentRecord = internalMutation({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("payments", {
      orderId: args.orderId,
      status: "pending",
      razorpayOrderId: args.razorpayOrderId,
      amount: args.amount,
    });
  },
});

export const saveFreelancerAccountId = internalMutation({
  args: { userId: v.id("users"), razorpayAccountId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, { razorpayAccountId: args.razorpayAccountId });
    }
  },
});

export const getPayment = internalQuery({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.paymentId);
  },
});

export const markAsReleased = internalMutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, { status: "released" });
  },
});
