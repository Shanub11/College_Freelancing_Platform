import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { enforceRateLimit } from "./rateLimiter";
import { enforceModerationOnFields } from "./moderation";

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    deadline: v.number(),
    skills: v.array(v.string()),
  },
  returns: v.id("projectRequests"),
  handler: async (ctx, args) => {
    const clientId = await getAuthUserId(ctx);
    if (!clientId) {
      throw new Error("You must be logged in to create a project.");
    }

    await enforceModerationOnFields(ctx, clientId as Id<"users">, [
      { fieldName: "project title", value: args.title },
      { fieldName: "project description", value: args.description },
    ]);

    await enforceRateLimit(
      ctx,
      clientId as Id<"users">,
      "project_create",
      3,
      60 * 60 * 1000,
      "You can only post 3 projects per hour."
    );

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

    const projects = await ctx.db
      .query("projectRequests")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();

    return Promise.all(projects.map(async (p) => {
      if (p.status !== "open") {
        const order = await ctx.db
          .query("orders")
          .withIndex("by_client", q => q.eq("clientId", clientId))
          .filter(q => q.eq(q.field("projectId"), p._id))
          .first();
        return { ...p, orderId: order?._id, orderStatus: order?.status };
      }
      return p;
    }));
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
    if (args.category) {
      return await ctx.db
        .query("projectRequests")
        .filter((q) => q.eq(q.field("category"), args.category))
        .order("desc")
        .take(args.limit || 20);
    }
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

    let profilePictureUrl = null;
    if (clientProfile.profilePicture) {
      profilePictureUrl = await ctx.storage.getUrl(clientProfile.profilePicture);
    }

    return {
      ...project,
      client: { ...clientProfile, profilePictureUrl },
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

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .order("desc")
      .collect();

    const ordersWithFreelancerDetails = await Promise.all(
      orders.map(async (order) => {
        const freelancerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", order.freelancerId))
          .first();

        let hasReviewed = false;
        const review = await ctx.db
          .query("reviews")
          .withIndex("by_order", q => q.eq("orderId", order._id))
          .filter(q => q.eq(q.field("reviewerId"), clientId))
          .first();
        if (review) hasReviewed = true;

        return { ...order, freelancer: freelancerProfile, orderId: order._id, hasReviewed };
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

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", freelancerId))
      .order("desc")
      .collect();

    const ordersWithClientDetails = await Promise.all(
      orders.map(async (order) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", order.clientId))
          .first();

        let hasReviewed = false;
        const review = await ctx.db
          .query("reviews")
          .withIndex("by_order", q => q.eq("orderId", order._id))
          .filter(q => q.eq(q.field("reviewerId"), freelancerId))
          .first();
        if (review) hasReviewed = true;

        return { ...order, client: clientProfile, orderId: order._id, hasReviewed };
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

    const allOrders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", args.userId))
      .collect();

    let completedCount = 0;
    let onTimeCount = 0;
    for (const o of allOrders) {
      if (o.status === "completed") {
        completedCount++;
        if ((o.deadline && o.submittedAt && o.submittedAt <= o.deadline) || !o.deadline) {
          onTimeCount++;
        }
      }
    }
    const onTimeRate = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 100;

    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer_and_status", (q) => 
        q.eq("freelancerId", args.userId).eq("status", "completed")
      )
      .collect();

    const completedProjects = await Promise.all(completedOrders.map(async (order) => {
      let category = "Direct Order";
      if (order.projectId) {
         const proj = await ctx.db.get(order.projectId);
         if (proj) category = proj.category;
      } else if (order.gigId) {
         const gig = await ctx.db.get(order.gigId);
         if (gig) category = gig.category;
      }
      
      const review = await ctx.db
        .query("reviews")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .first();

      return {
        _id: order._id,
        title: order.title,
        description: order.description,
        category,
        review
      };
    }));

    const publicReviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", args.userId))
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

    return { profile: profileWithPortfolio, completedProjects, reviews: reviewsWithReviewer, activityMap, gigs, onTimeRate };
  },
});

export const getClientPublicProfile = query({
  args: { userId: v.id("users") },
  async handler(ctx, args) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;

    const postedProjects = await ctx.db
      .query("projectRequests")
      .withIndex("by_client", (q) => q.eq("clientId", args.userId))
      .collect();

    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_client_and_status", (q) => 
        q.eq("clientId", args.userId).eq("status", "completed")
      )
      .collect();

    const publicReviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", args.userId))
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

    return {
      profile,
      postedProjectsCount: postedProjects.length,
      completedHiresCount: completedOrders.length,
      reviews: reviewsWithReviewer,
    };
  },
});

export const markOrderPaid = internalMutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    
    const deadline = Date.now() + (order.deliveryTime * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.orderId, { status: "active", deadline, revisionCount: 0 });

    if (order.projectId) {
      await ctx.db.patch(order.projectId, { 
        status: "in_progress",
        selectedFreelancer: order.freelancerId,
      });

      const winningProposal = await ctx.db
        .query("proposals")
        .withIndex("by_project_and_freelancer", (q) => 
          q.eq("projectId", order.projectId!).eq("freelancerId", order.freelancerId)
        )
        .first();
      
      if (winningProposal) {
        await ctx.db.patch(winningProposal._id, { status: "accepted" });
      }

      const otherProposals = await ctx.db
        .query("proposals")
        .withIndex("by_projectId", (q) => q.eq("projectId", order.projectId!))
        .filter((q) => q.neq(q.field("freelancerId"), order.freelancerId))
        .collect();

      for (const proposal of otherProposals) {
        await ctx.db.patch(proposal._id, { status: "rejected" });
      }
    }
  },
});

export const completeOrderAndReleaseFunds = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    
    if (order.autoCompleteJobId) {
      try { await ctx.scheduler.cancel(order.autoCompleteJobId); } catch (e) {}
    }

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

    return null;
  },
});

export const createDirectOrder = mutation({
  args: {
    freelancerId: v.id("users"),
    gigId: v.id("gigs"),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    deliveryTime: v.number(),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const clientId = await getAuthUserId(ctx);
    if (!clientId) {
      throw new Error("You must be logged in to hire a freelancer.");
    }

    const platformFee = Math.round(args.price * 0.10);
    const freelancerPayout = args.price - platformFee;

    const orderId = await ctx.db.insert("orders", {
      clientId,
      freelancerId: args.freelancerId,
      gigId: args.gigId,
      title: args.title,
      description: args.description,
      price: args.price,
      platformFee,
      freelancerPayout,
      deliveryTime: args.deliveryTime,
      status: "pending_payment",
    });

    await ctx.db.insert("activityLogs", {
      action: "Direct Order Created",
      details: `Direct order created for gig. Price: ₹${args.price}`,
      userId: clientId,
      timestamp: Date.now(),
      relatedId: orderId,
    });

    return orderId;
  },
});

export const submitDelivery = mutation({
  args: {
    orderId: v.id("orders"),
    message: v.string(),
    link: v.optional(v.string()),
    attachment: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.freelancerId !== userId) throw new Error("Unauthorized");

    const jobId = await ctx.scheduler.runAfter(
      3 * 24 * 60 * 60 * 1000,
      internal.projects.autoCompleteOrder,
      { orderId: args.orderId }
    );

    await ctx.db.patch(args.orderId, {
      status: "submitted",
      submittedAt: Date.now(),
      deliveryMessage: args.message,
      deliveryLink: args.link,
      deliverables: args.attachment ? [args.attachment] : undefined,
      autoCompleteJobId: jobId,
    });

    await ctx.db.insert("notifications", {
      userId: order.clientId,
      type: "order_submitted",
      message: `Freelancer has submitted work for "${order.title}". You have 3 days to review.`,
      isRead: false,
      link: `/orders`,
    });

    return null;
  }
});

export const requestRevision = mutation({
  args: {
    orderId: v.id("orders"),
    notes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.clientId !== userId) throw new Error("Unauthorized");
    
    if ((order.revisionCount || 0) >= 2) throw new Error("Maximum revisions reached.");

    if (order.autoCompleteJobId) {
      try { await ctx.scheduler.cancel(order.autoCompleteJobId); } catch (e) {}
    }

    const newDeadline = Date.now() + (2 * 24 * 60 * 60 * 1000); // +2 days

    await ctx.db.patch(args.orderId, {
      status: "revision_requested",
      revisionNotes: args.notes,
      revisionCount: (order.revisionCount || 0) + 1,
      deadline: newDeadline,
    });

    await ctx.db.insert("notifications", {
      userId: order.freelancerId,
      type: "revision_requested",
      message: `Client requested a revision for "${order.title}". You have 2 days to resubmit.`,
      isRead: false,
    });

    return null;
  }
});

export const extendDeadline = mutation({
  args: { orderId: v.id("orders"), days: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.clientId !== userId) throw new Error("Unauthorized");

    const currentDeadline = order.deadline || Date.now();
    const newDeadline = currentDeadline + (args.days * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.orderId, {
      deadline: newDeadline,
      status: "active" 
    });

    return null;
  }
});

export const cancelLateOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.clientId !== userId) throw new Error("Unauthorized");

    const gracePeriodEnd = (order.deadline || 0) + (24 * 60 * 60 * 1000);
    if (Date.now() < gracePeriodEnd) {
      throw new Error("Grace period (24h) has not ended yet. Cannot cancel.");
    }

    await ctx.db.patch(args.orderId, { status: "cancelled" });
    if (order.projectId) await ctx.db.patch(order.projectId, { status: "cancelled" as any });

    return null;
  }
});

export const autoCompleteOrder = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (order?.status === "submitted") {
      await ctx.db.patch(args.orderId, { 
        status: "completed",
        completedAt: Date.now()
      });
      if (order.projectId) {
        await ctx.db.patch(order.projectId, { status: "completed" as any });
      }
      await ctx.db.insert("notifications", {
        userId: order.freelancerId,
        type: "funds_released",
        message: `Order "${order.title}" was auto-completed. Funds have been released!`,
        isRead: false,
      });
    }
  }
});