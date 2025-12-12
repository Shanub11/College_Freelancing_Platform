import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getNotifications = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const getProposalWithDetails = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);

    if (!proposal) {
      return null;
    }

    const project = await ctx.db.get(proposal.projectId);

    if (!project) {
      throw new Error("Project not found for this proposal");
    }

    return {
      ...proposal,
      projectTitle: project.title,
      clientId: project.clientId,
      // We can enrich this with more data as needed, e.g., client/freelancer profiles
    };
  },
});

export const acceptProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to accept a proposal.");
    }

    const proposalToAccept = await ctx.db.get(args.proposalId);
    if (!proposalToAccept) {
      throw new Error("Proposal not found.");
    }

    const project = await ctx.db.get(proposalToAccept.projectId);
    if (project?.clientId !== userId) {
      throw new Error("You are not authorized to accept proposals for this project.");
    }

    // Mark proposal as payment pending instead of accepted
    await ctx.db.patch(args.proposalId, { status: "payment_pending" });

    // Create the Order record with 'pending_payment' status
    const orderId = await ctx.db.insert("orders", {
      projectId: proposalToAccept.projectId,
      freelancerId: proposalToAccept.freelancerId,
      clientId: project.clientId,
      title: project.title,
      description: project.description,
      price: proposalToAccept.proposedPrice,
      deliveryTime: proposalToAccept.deliveryTime,
      status: "pending_payment",
    });

    // Notify the freelancer
    await ctx.db.insert("notifications", {
      userId: proposalToAccept.freelancerId,
      type: "proposalAccepted",
      message: `Your proposal for "${project.title}" has been accepted! Waiting for client payment.`,
      link: `/orders/${orderId}`,
      isRead: false,
    });

    return orderId;
  },
});

export const rejectProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be logged in to reject a proposal.");
    }

    const proposalToReject = await ctx.db.get(args.proposalId);
    if (!proposalToReject) {
      throw new Error("Proposal not found.");
    }

    const project = await ctx.db.get(proposalToReject.projectId);
    if (project?.clientId !== userId) {
      throw new Error("You are not authorized to reject proposals for this project.");
    }

    await ctx.db.patch(args.proposalId, { status: "rejected" });
  },
});