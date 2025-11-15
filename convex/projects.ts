import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    return {
      ...project,
      client: clientProfile,
      proposalCount: proposals.length,
    };
  },
});