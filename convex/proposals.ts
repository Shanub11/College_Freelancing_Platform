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

    // Accept the selected proposal
    await ctx.db.patch(args.proposalId, { status: "accepted" });

    // Update the project status to ongoing and assign the freelancer
    await ctx.db.patch(proposalToAccept.projectId, { status: "in_progress", selectedFreelancer: proposalToAccept.freelancerId });

    // Notify the freelancer
    await ctx.db.insert("notifications", {
      userId: proposalToAccept.freelancerId,
      type: "proposalAccepted",
      message: `Your proposal for "${project.title}" has been accepted!`,
      link: `/projects/${project._id}`,
      isRead: false,
    });

    // Reject other proposals for the same project
    const otherProposals = await ctx.db
      .query("proposals")
      .withIndex("by_projectId", (q) => q.eq("projectId", proposalToAccept.projectId))
      .filter((q) => q.neq(q.field("_id"), args.proposalId))
      .collect();

    for (const proposal of otherProposals) {
      await ctx.db.patch(proposal._id, { status: "rejected" });
    }
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