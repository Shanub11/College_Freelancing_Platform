import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

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
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

export const markAllAsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return null;
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

    // Prevent duplicate order creation for this project
    const existingOrder = await ctx.db
      .query("orders")
      .withIndex("by_client", (q) => q.eq("clientId", project.clientId))
      .filter((q) => q.eq(q.field("projectId"), project._id))
      .first();
    if (existingOrder && existingOrder.status !== "cancelled") {
      throw new Error("An order already exists for this project.");
    }

    // Mark proposal as payment pending instead of accepted
    await ctx.db.patch(args.proposalId, { status: "payment_pending" });
    
    const platformFee = Math.round(proposalToAccept.proposedPrice * 0.10);
    const freelancerPayout = proposalToAccept.proposedPrice - platformFee;

    // Create the Order record with 'pending_payment' status
    const orderId = await ctx.db.insert("orders", {
      projectId: proposalToAccept.projectId,
      freelancerId: proposalToAccept.freelancerId,
      clientId: project.clientId,
      title: project.title,
      description: project.description,
      price: proposalToAccept.proposedPrice,
      platformFee,
      freelancerPayout,
      deliveryTime: proposalToAccept.deliveryTime,
      status: "pending_payment",
    });

    // Notify the freelancer in-app
    await ctx.db.insert("notifications", {
      userId: proposalToAccept.freelancerId,
      type: "proposalAccepted",
      message: `Your proposal for "${project.title}" has been accepted! Waiting for client payment.`,
      link: `/orders/${orderId}`,
      isRead: false,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      action: "Proposal Accepted",
      details: `Proposal for project "${project.title}" accepted. Price: ${proposalToAccept.proposedPrice}`,
      userId,
      timestamp: Date.now(),
      relatedId: orderId,
    });

    // Send email notification to the freelancer
    const freelancerUser = await ctx.db.get(proposalToAccept.freelancerId);
    if (freelancerUser?.email) {
      const freelancerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) =>
          q.eq("userId", proposalToAccept.freelancerId)
        )
        .unique();

      await ctx.scheduler.runAfter(
        0,
        internal.email.sendProposalAcceptedEmail,
        {
          toEmail: freelancerUser.email,
          toName: freelancerProfile
            ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
            : freelancerUser.email,
          projectTitle: project.title,
          agreedPrice: proposalToAccept.proposedPrice,
          orderId: orderId,
        }
      );
    }

    return orderId;
  },
});

export const rejectProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  returns: v.null(),
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

    // Log activity
    await ctx.db.insert("activityLogs", {
      action: "Proposal Rejected",
      details: `Proposal for project "${project.title}" rejected.`,
      userId,
      timestamp: Date.now(),
      relatedId: args.proposalId,
    });

    return null;
  },
});