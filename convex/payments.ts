import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * INTERNAL: Marks a payment as funded.
 * Called by the Razorpay webhook handler after a successful capture.
 */
export const markAsFunded = internalMutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayTransferId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_razorpayOrderId", (q) => q.eq("razorpayOrderId", args.razorpayOrderId))
      .unique();

    if (!payment) {
      throw new Error(`Payment not found for Razorpay Order ID: ${args.razorpayOrderId}`);
    }

    await ctx.db.patch(payment._id, {
      status: "funded",
      razorpayTransferId: args.razorpayTransferId,
    });

    await ctx.db.patch(payment.orderId, {
      status: "in_progress",
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
        .unique();
      
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