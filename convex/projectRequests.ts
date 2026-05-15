import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { enforceModeration, enforceModerationOnFields } from "./moderation";
import { enforceRateLimit } from "./rateLimiter";
import { Id } from "./_generated/dataModel";

/**
 * Query to get all project requests that are currently open.
 */
export const getOpenProjectRequests = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("projectRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich with client information
    const page = await Promise.all(
      requests.page.map(async (req) => {
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

    return {
      ...requests,
      page,
    };
  },
});

const projectRequestShape = {
  _id: v.id("projectRequests"),
  _creationTime: v.number(),
  clientId: v.id("users"),
  title: v.string(),
  description: v.string(),
  category: v.string(),
  budget: v.optional(v.any()),
  deadline: v.number(),
  skills: v.array(v.string()),
  attachments: v.optional(v.array(v.id("_storage"))),
  status: v.union(
    v.literal("open"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("disputed")
  ),
  selectedFreelancer: v.optional(v.id("users")),
  proposalCount: v.number(),
};

/**
 * Query to get a single project request by its ID.
 */
export const getProjectRequestById = query({
  args: {
    projectId: v.id("projectRequests"),
  },
  returns: v.union(v.null(), v.object(projectRequestShape)),
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
  returns: v.id("proposals"),

  handler: async (ctx, args) => {

    const freelancerId = await getAuthUserId(ctx);

    if (!freelancerId) {

      throw new Error("You must be logged in to submit a proposal.");

    }



    await enforceModerationOnFields(ctx, freelancerId as Id<"users">, [
      { fieldName: "cover letter", value: args.coverLetter },
    ]);

    await enforceRateLimit(
      ctx,
      freelancerId as Id<"users">,
      "proposal_submit",
      3,
      60 * 60 * 1000,
      "You can only submit 3 proposals per hour. Please wait."
    );

    const project = await ctx.db.get(args.projectId);

    if (!project) {

      throw new Error("Project not found");

    }



    const existingProposal = await ctx.db
      .query("proposals")
      .withIndex("by_project_and_freelancer", (q) =>
        q.eq("projectId", args.projectId).eq("freelancerId", freelancerId)
      )
      .first();
    if (existingProposal) {
      throw new Error("You have already submitted a proposal for this project.");
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
    // Step 1: Get the authenticated user
    const userId = await getAuthUserId(ctx);
    
    // Step 2: If not logged in, return empty array
    if (!userId) return [];

    // Step 3: Load the project to check ownership
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Step 4: Check if the user is the client who posted this project
    const isClient = project.clientId === userId;

    // Step 5: Check if the user has submitted a proposal for this project
    // (freelancers can only see their own proposal, not others')
    const ownProposal = await ctx.db
      .query("proposals")
      .withIndex("by_project_and_freelancer", (q) =>
        q.eq("projectId", args.projectId).eq("freelancerId", userId)
      )
      .first();
    
    const isFreelancerWithProposal = ownProposal !== null;

    // Step 6: If neither client nor a bidding freelancer, deny access
    if (!isClient && !isFreelancerWithProposal) return [];

    // Step 7: Fetch proposals based on role
    // Clients see ALL proposals. Freelancers only see their own.
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const visibleProposals = isClient
      ? proposals
      : proposals.filter((p) => p.freelancerId === userId);

    // Step 8: Enrich with freelancer profile name
    return Promise.all(
      visibleProposals.map(async (proposal) => {
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
