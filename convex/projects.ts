import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    budget: v.object({
      min: v.number(),
      max: v.number()
    }),
    deadline: v.number(),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has a client profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.userType !== "client") {
      throw new Error("Only clients can create project requests");
    }

    const projectId = await ctx.db.insert("projectRequests", {
      clientId: userId,
      title: args.title,
      description: args.description,
      category: args.category,
      budget: args.budget,
      deadline: args.deadline,
      skills: args.skills,
      status: "open",
      proposalCount: 0,
    });

    return projectId;
  },
});

export const getProjects = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("projectRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"));

    if (args.category) {
      query = ctx.db
        .query("projectRequests")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .filter((q) => q.eq(q.field("status"), "open"));
    }

    const projects = await query
      .order("desc")
      .take(args.limit || 20);

    // Get client profiles for each project
    const projectsWithClients = await Promise.all(
      projects.map(async (project) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", project.clientId))
          .unique();
        
        return {
          ...project,
          client: clientProfile,
        };
      })
    );

    return projectsWithClients;
  },
});

export const getMyProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const projects = await ctx.db
      .query("projectRequests")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .order("desc")
      .collect();

    return projects;
  },
});

export const searchProjects = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("projectRequests")
      .withSearchIndex("search_projects", (q) => 
        q.search("title", args.searchTerm)
          .eq("status", "open")
      )
      .take(20);

    if (args.category) {
      results = results.filter(project => project.category === args.category);
    }

    // Get client profiles for each project
    const projectsWithClients = await Promise.all(
      results.map(async (project) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", project.clientId))
          .unique();
        
        return {
          ...project,
          client: clientProfile,
        };
      })
    );

    return projectsWithClients;
  },
});
