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
    const projects = await ctx.db
      .query("projectRequests")
      .withSearchIndex("search_projects", (q) => {
        const search = q.search("title", args.searchTerm);
        if (args.category) {
          return search.eq("category", args.category);
        }
        return search;
      })
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

        const order = await ctx.db
          .query("orders")
          .withIndex("by_client", q => q.eq("clientId", clientId))
          .filter(q => q.eq(q.field("projectId"), project._id))
          .first();

        let hasReviewed = false;
        if (order) {
          const review = await ctx.db
            .query("reviews")
            .withIndex("by_order", q => q.eq("orderId", order._id))
            .filter(q => q.eq(q.field("reviewerId"), clientId))
            .first();
          if (review) hasReviewed = true;
        }

        return { ...project, freelancer: freelancerProfile, orderId: order?._id, hasReviewed };
      })
    );

    return ordersWithFreelancerDetails;
  },
});

export const getMyFreelancerOrders = query({
  handler: async (ctx) => {
    const freelancerId = await getAuthUserId(ctx);
    if (!freelancerId) {
      return [];
    }

    const myProjects = await ctx.db
      .query("projectRequests")
      .filter((q) => q.eq(q.field("selectedFreelancer"), freelancerId))
      .order("desc")
      .collect();

    const ordersWithClientDetails = await Promise.all(
      myProjects.map(async (project) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", project.clientId))
          .first();

        const order = await ctx.db
          .query("orders")
          .withIndex("by_freelancer", q => q.eq("freelancerId", freelancerId))
          .filter(q => q.eq(q.field("projectId"), project._id))
          .first();

        let hasReviewed = false;
        if (order) {
          const review = await ctx.db
            .query("reviews")
            .withIndex("by_order", q => q.eq("orderId", order._id))
            .filter(q => q.eq(q.field("reviewerId"), freelancerId))
            .first();
          if (review) hasReviewed = true;
        }

        return { ...project, client: clientProfile, orderId: order?._id, hasReviewed };
      })
    );

    return ordersWithClientDetails;
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

    const portfolioItems = profile.portfolioItems ? await Promise.all(profile.portfolioItems.map(async (item: any) => ({
      ...item,
      imageUrl: item.image ? await ctx.storage.getUrl(item.image) : null,
    }))) : [];
    
    const profileWithPortfolio = {
      ...profile,
      portfolioItems,
    };

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

    const publicReviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", args.userId))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();
      
    const reviewsWithReviewer = await Promise.all(
      publicReviews.map(async (r) => {
        const reviewerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", r.reviewerId))
          .first();
        return {
          ...r,
          reviewerName: reviewerProfile ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}` : "Anonymous"
        };
      })
    );

    // Get activity logs to build the activity map
    const activityLogs = await ctx.db
      .query("activityLogs")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
      
    const activityMap: Record<string, number> = {};
    for (const log of activityLogs) {
      if (!log.timestamp) continue;
      const dateStr = new Date(log.timestamp).toISOString().split("T")[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    }

    const gigs = await ctx.db
      .query("gigs")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return { profile: profileWithPortfolio, completedProjects, reviews: reviewsWithReviewer, activityMap, gigs };
  },
});

export const markOrderPaid = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { status: "in_progress" });
  },
});

export const completeOrderAndReleaseFunds = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    
    await ctx.db.patch(args.orderId, { 
      status: "completed",
      completedAt: Date.now()
    });

    if (order.projectId) {
      await ctx.db.patch(order.projectId, { status: "completed" });
    }

    await ctx.db.insert("notifications", {
      userId: order.freelancerId,
      type: "funds_released",
      message: `Client has approved your work for "${order.title}". Funds have been released!`,
      isRead: false,
    });
  },
});