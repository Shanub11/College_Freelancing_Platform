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

 * This now includes creating a notification for the client.

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



    const project = await ctx.db.get(args.projectId);

    if (!project) {

      throw new Error("Project not found");

    }



    const proposalId = await ctx.db.insert("proposals", {

      projectId: args.projectId,

      freelancerId,

      coverLetter: args.coverLetter,

      proposedPrice: args.proposedPrice,

      deliveryTime: args.deliveryTime,

      status: "pending",

    });



    // Increment proposal count on the project request

    await ctx.db.patch(args.projectId, { proposalCount: (project.proposalCount || 0) + 1 });



    // Create a notification for the client

    await ctx.db.insert("notifications", {

      userId: project.clientId,

      type: "new_proposal",

      message: `You have a new proposal for your project: ${project.title}`,

      isRead: false,

      link: `/projects/${args.projectId}/proposals`,

    });





    return proposalId;

  },

});



/**

 * Query to get all proposals for a specific project.

 */

export const getProposalsForProject = query({

  args: {

    projectId: v.id("projectRequests"),

  },

  handler: async (ctx, args) => {

    const proposals = await ctx.db

      .query("proposals")

      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))

      .collect();



    return Promise.all(

      proposals.map(async (proposal) => {

        const freelancerProfile = await ctx.db

          .query("profiles")

          .withIndex("by_user", (q) => q.eq("userId", proposal.freelancerId))

          .unique();

        return {

          ...proposal,

          freelancerName: freelancerProfile

            ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`

            : "Unknown Freelancer",

        };

      })

    );

  },

});
