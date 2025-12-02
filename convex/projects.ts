import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    budget: v.object({
      min: v.number(),
      max: v.number(),
    }),
    deadline: v.number(),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = await getAuthUserId(ctx);
    if (!clientId) {
      throw new Error("You must be logged in to create a project.");
    }

    const projectId = await ctx.db.insert("projectRequests", {
      clientId,
      status: "open",
      proposalCount: 0,
      ...args,
    });

    return projectId;
  },
});

export const getMyProjects = query({
  handler: async (ctx) => {
    const clientId = await getAuthUserId(ctx);
    if (!clientId) {
      return [];
    }

    return ctx.db
      .query("projectRequests")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();
  },
});

// NOTE: This is a placeholder. You should have a getProjects and searchProjects
// query for your GigBrowser component to work.
export const getProjects = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // This is a simplified version. You might have more complex logic.
    const projects = await ctx.db.query("projectRequests").order("desc").take(args.limit || 20);
    return projects;
  },
});

export const searchProjects = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // This is a simplified version. You might want to use a search index.
    const projects = await ctx.db
      .query("projectRequests")
      .filter((q) => q.eq(q.field("title"), args.searchTerm))
      .take(20);
    return projects;
  },
});

export const getProjectById = query({
  args: { projectId: v.id("projectRequests") },
  async handler(ctx, args) {
    const project = await ctx.db.get(args.projectId);

    if (!project) {
      return null;
    }

    // Fetch client profile
    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", project.clientId))
      .first();

    if (!clientProfile) {
      throw new Error("Client profile not found for this project");
    }

    // Fetch proposal count for this project
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
      .collect();

    return {
      ...project,
      client: clientProfile,
      proposalCount: proposals.length,
    };
  },
});

export const getProposalsForProject = query({
  args: { projectId: v.id("projectRequests") },
  async handler(ctx, args) {
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    const proposalsWithFreelancer = await Promise.all(
      proposals.map(async (p) => {
        const freelancerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", p.freelancerId))
          .first();

        return {
          ...p,
          freelancerName: `${freelancerProfile?.firstName || ''} ${freelancerProfile?.lastName || ''}`.trim() || "A Freelancer",
          // You can add more freelancer details here if needed
        };
      })
    );

    return proposalsWithFreelancer;
  },
});

export const getMyClientOrders = query({
  handler: async (ctx) => {
    const clientId = await getAuthUserId(ctx);
    if (!clientId) {
      return [];
    }

    const myProjects = await ctx.db
      .query("projectRequests")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .filter((q) => q.neq(q.field("status"), "open"))
      .order("desc")
      .collect();

    const ordersWithFreelancerDetails = await Promise.all(
      myProjects.map(async (project) => {
        const freelancerId = project.selectedFreelancer;
        if (!freelancerId) {
          return { ...project, freelancer: null }; // This early return is key
        }

        const freelancerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", freelancerId))
          .first();

        return { ...project, freelancer: freelancerProfile };
      })
    );

    return ordersWithFreelancerDetails;
  },
});

export const getFreelancerPublicProfile = query({
  args: { userId: v.id("users") },
  async handler(ctx, args) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    // NOTE: This assumes an index on `selectedFreelancer` and `status`.
    // You may need to create a new index in your schema:
    // .index("by_freelancer_status", ["selectedFreelancer", "status"])
    const completedProjects = await ctx.db
      .query("projectRequests")
      .filter((q) =>
        q.and(
          q.eq(q.field("selectedFreelancer"), args.userId),
          q.eq(q.field("status"), "completed")
        )
      )
      .collect();

    return { profile, completedProjects };
  },
});