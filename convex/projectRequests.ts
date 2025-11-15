import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query to get all project requests that are currently open.
 */
export const getOpenProjectRequests = query({
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("projectRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .collect();

    // Enrich with client information
    return Promise.all(
      requests.map(async (req) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", req.clientId))
          .unique();
        return {
          ...req,
          clientName: clientProfile
            ? `${clientProfile.firstName} ${clientProfile.lastName}`
            : "Anonymous Client",
        };
      })
    );
  },
});

/**
 * Query to get a single project request by its ID.
 */
export const getProjectRequestById = query({
  args: {
    projectId: v.id("projectRequests"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

/**
 * Mutation to create a proposal for a project request.
 */
export const createProposal = mutation({
  args: {
    projectId: v.id("projectRequests"),
    coverLetter: v.string(),
    proposedPrice: v.number(),
    deliveryTime: v.number(),
  },
  handler: async (ctx, args) => {
    const freelancerId = await getAuthUserId(ctx);
    if (!freelancerId) {
      throw new Error("You must be logged in to submit a proposal.");
    }

    // You might want to add a check here to prevent submitting multiple proposals

    const proposalId = await ctx.db.insert("proposals", {
      projectId: args.projectId,
      freelancerId,
      coverLetter: args.coverLetter,
      proposedPrice: args.proposedPrice,
      deliveryTime: args.deliveryTime,
      status: "pending",
    });

    // Increment proposal count on the project request
    await ctx.db.patch(args.projectId, { proposalCount: (await ctx.db.get(args.projectId))!.proposalCount + 1 });

    return proposalId;
  },
});