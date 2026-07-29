import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { enforceRateLimit } from "./rateLimiter";
import { enforceModerationOnFields } from "./moderation";
import { paginationOptsValidator } from "convex/server";

type ProfilePortfolioItem = NonNullable<Doc<"profiles">["portfolioItems"]>[number];

// Status helper: orders may have legacy "in_progress" status which maps
// to the current "active" status. Use this when displaying order status.
export function normalizeDisplayStatus(status: string): string {
  if (status === "in_progress") return "active";
  return status;
}

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

    // Server-side length validation
    if (args.title.trim().length < 10) {
      throw new Error("Project title must be at least 10 characters.");
    }
    if (args.title.length > 200) {
      throw new Error("Project title is too long. Maximum 200 characters.");
    }
    if (args.description.trim().length < 50) {
      throw new Error(
        "Project description must be at least 50 characters. " +
        "Please describe your project in more detail."
      );
    }
    if (args.description.length > 10000) {
      throw new Error(
        "Project description is too long. Maximum 10000 characters."
      );
    }
    if (args.skills.length > 20) {
      throw new Error("Maximum 20 skills allowed per project.");
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
      .take(100);

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

export const getProjects = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require auth so unauthenticated scrapers cannot enumerate all projects.
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const cap = Math.min(args.limit || 20, 50); // hard cap at 50

    if (args.category) {
      // Use by_status index first (index scan on "open"), then filter by category.
      // This avoids a full-table scan as the table grows large.
      return await ctx.db
        .query("projectRequests")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .filter((q) => q.eq(q.field("category"), args.category))
        .order("desc")
        .take(cap);
    }

    // No category — use the by_status index directly.
    return await ctx.db
      .query("projectRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(cap);
  },
});

export const searchProjects = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const projects = await ctx.db
      .query("projectRequests")
      .withSearchIndex("search_projects", (q) => {
        const search = q.search("title", args.searchTerm).eq("status", "open");
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

    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", project.clientId))
      .first();

    if (!clientProfile) {
      // Return the project with a null client rather than crashing the page.
      // This can happen if an admin account is deleted while a project remains.
      return { ...project, client: null, proposalCount: project.proposalCount };
    }

    let profilePictureUrl = null;
    if (clientProfile.profilePicture) {
      profilePictureUrl = await ctx.storage.getUrl(clientProfile.profilePicture);
    }

    return {
      ...project,
      client: { ...clientProfile, profilePictureUrl },
      proposalCount: project.proposalCount,
    };
  },
});

export const getProposalsForProject = query({
  args: { projectId: v.id("projectRequests") },
  async handler(ctx, args) {
    // SECURITY: Only the project's client or a freelancer who submitted a
    // proposal may read proposals. Any other caller gets an empty array.
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    const isClient = project.clientId === userId;

    const ownProposal = await ctx.db
      .query("proposals")
      .withIndex("by_project_and_freelancer", (q) =>
        q.eq("projectId", args.projectId).eq("freelancerId", userId)
      )
      .first();

    if (!isClient && !ownProposal) return [];

    // Clients see all proposals; freelancers see only their own.
    const proposals = isClient
      ? await ctx.db
          .query("proposals")
          .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
          .order("desc")
          .take(100)
      : ownProposal
      ? [ownProposal]
      : [];

    const proposalsWithFreelancer = await Promise.all(
      proposals.map(async (p) => {
        const freelancerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", p.freelancerId))
          .first();

        return {
          ...p,
          freelancerName: `${freelancerProfile?.firstName || ''} ${freelancerProfile?.lastName || ''}`.trim() || "A Freelancer",
          freelancerIsPayoutReady: freelancerProfile?.isPayoutReady === true,
        };
      })
    );

    return proposalsWithFreelancer;
  },
});

export const getMyClientOrders = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const clientId = await getAuthUserId(ctx);
    if (!clientId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query("orders")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (order) => {
        const freelancerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", order.freelancerId))
          .first();

        let hasReviewed = false;
        const review = await ctx.db
          .query("reviews")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .filter((q) => q.eq(q.field("reviewerId"), clientId))
          .first();
        if (review) hasReviewed = true;

        return {
          ...order,
          freelancer: freelancerProfile,
          orderId: order._id,
          hasReviewed,
        };
      })
    );

    return { ...result, page };
  },
});

export const getMyFreelancerOrders = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const freelancerId = await getAuthUserId(ctx);
    if (!freelancerId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query("orders")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", freelancerId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (order) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", order.clientId))
          .first();

        let hasReviewed = false;
        const review = await ctx.db
          .query("reviews")
          .withIndex("by_order", (q) => q.eq("orderId", order._id))
          .filter((q) => q.eq(q.field("reviewerId"), freelancerId))
          .first();
        if (review) hasReviewed = true;

        return {
          ...order,
          client: clientProfile,
          orderId: order._id,
          hasReviewed,
        };
      })
    );

    return { ...result, page };
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

    const portfolioItems = profile.portfolioItems ? await Promise.all(profile.portfolioItems.map(async (item: ProfilePortfolioItem) => ({
      ...item,
      imageUrl: item.image ? await ctx.storage.getUrl(item.image) : null,
    }))) : [];
    
    const profileWithPortfolio = {
      ...profile,
      portfolioItems,
    };

    // FIX H3: Use the by_freelancer_and_status index to count completed orders
    // instead of fetching ALL orders with an unbounded .collect().
    const completedOrdersForStats = await ctx.db
      .query("orders")
      .withIndex("by_freelancer_and_status", (q) =>
        q.eq("freelancerId", args.userId).eq("status", "completed")
      )
      .order("desc")
      .take(200); // Hard cap — enough for accurate stats without risk of timeout

    let completedCount = completedOrdersForStats.length;
    let onTimeCount = 0;
    for (const o of completedOrdersForStats) {
      if ((o.deadline && o.submittedAt && o.submittedAt <= o.deadline) || !o.deadline) {
        onTimeCount++;
      }
    }
    const onTimeRate = completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : 100;

    // Limit to 20 most recent completed orders to prevent unbounded N+1 queries
    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer_and_status", (q) =>
        q.eq("freelancerId", args.userId).eq("status", "completed")
      )
      .order("desc")
      .take(20);

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
      .order("desc")
      .take(50);
      
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

    // FIX H3: Cap activity log scan at 365 entries.
    // An unbounded .collect() on activityLogs can time out for power users
    // who have thousands of log entries. We only need recent activity for the heatmap.
    const activityLogs = await ctx.db
      .query("activityLogs")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .take(365);
      
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
      .take(20);

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
      .take(50); // FIX Item 13: was .take(500) — fetch only what we need for a count

    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_client_and_status", (q) =>
        q.eq("clientId", args.userId).eq("status", "completed")
      )
      .take(50); // FIX Item 13: was .take(500) — fetch only what we need for a count

    const publicReviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewee", (q) => q.eq("revieweeId", args.userId))
      .order("desc")
      .take(50);
      
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

    return null;
  },
});

export const completeOrderAndReleaseFunds = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    // Only the client who placed the order can release funds.
    if (order.clientId !== userId) {
      throw new Error("Unauthorized: only the client can release funds.");
    }

    const freelancerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", order.freelancerId))
      .unique();
    if (!freelancerProfile?.isPayoutReady) {
      throw new Error("Freelancer payout account is still pending Razorpay approval.");
    }

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
      message: `Client has approved your work for "${order.title}". Funds are being released!`,
      isRead: false,
    });

    // Trigger the actual Razorpay escrow transfer — uses the NORMAL COMPLETION
    // path (not the dispute path) so they can diverge independently in future.
    await ctx.scheduler.runAfter(
      0,
      internal.paymentActions.releaseEscrowForNormalCompletion,
      { orderId: args.orderId }
    );

    // ── Progression: Award XP for verified project completion ──
    // CRITICAL: XP is only awarded here (verified, paid, client-confirmed).
    // Never award from self-reported or unverified data.
    await ctx.scheduler.runAfter(0, internal.progression.awardXp, {
      userId: order.freelancerId,
      eventType: "project_completed",
      sourceId: args.orderId,
    });

    // Award on-time delivery bonus if submitted before deadline
    if (order.deadline && order.submittedAt && order.submittedAt <= order.deadline) {
      await ctx.scheduler.runAfter(0, internal.progression.awardXp, {
        userId: order.freelancerId,
        eventType: "on_time_delivery",
        sourceId: args.orderId,
      });
    }

    // Check repeat client bonus (same client has 2+ completed orders with this freelancer)
    const priorOrders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer_and_status", (q) =>
        q.eq("freelancerId", order.freelancerId).eq("status", "completed")
      )
      .filter((q) => q.eq(q.field("clientId"), order.clientId))
      .take(5);
    if (priorOrders.length >= 2) {
      await ctx.scheduler.runAfter(0, internal.progression.awardXp, {
        userId: order.freelancerId,
        eventType: "repeat_client",
        sourceId: args.orderId,
      });
    }

    // Re-evaluate badges and skills after the new completion
    await ctx.scheduler.runAfter(0, internal.progression.evaluateBadges, {
      userId: order.freelancerId,
    });
    await ctx.scheduler.runAfter(0, internal.progression.aggregateSkills, {
      userId: order.freelancerId,
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

    // Prevent a client from hiring themselves.
    if (clientId === args.freelancerId) {
      throw new Error("You cannot hire yourself.");
    }

    // Item 22: Require email verification before placing orders.
    // This prevents fake-email signups from spamming orders and ensures all
    // transactional emails reach a real inbox.
    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", clientId))
      .unique();
    if (!clientProfile?.emailVerified) {
      throw new Error(
        "Please verify your email address before placing an order. " +
        "Go to your dashboard → Settings → Verify Email."
      );
    }

    // Validate price and delivery time.
    if (!Number.isFinite(args.price) || args.price < 50) {
      throw new Error("Order price must be at least ₹50.");
    }
    if (args.price > 500000) {
      throw new Error("Order price cannot exceed ₹5,00,000. Contact support for larger orders.");
    }
    if (!Number.isInteger(args.deliveryTime) || args.deliveryTime < 1) {
      throw new Error("Delivery time must be at least 1 day.");
    }
    if (args.deliveryTime > 365) {
      throw new Error("Delivery time cannot exceed 365 days.");
    }

    const freelancerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.freelancerId))
      .unique();

    if (!freelancerProfile?.isPayoutReady) {
      throw new Error(
        "This freelancer is still completing Razorpay payout verification and cannot be hired yet."
      );
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
      details: `Direct order created for gig. Price: \u20b9${args.price}`,
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.freelancerId !== userId) throw new Error("Unauthorized");

    // Validate the delivery link to prevent javascript: / data: XSS vectors.
    if (args.link !== undefined && args.link !== "") {
      const trimmed = args.link.trim();
      if (!/^https?:\/\/.+/i.test(trimmed)) {
        throw new Error("Delivery link must be a valid URL starting with http:// or https://");
      }
    }

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

    // Send email notification to the client
    const clientUser = await ctx.db.get(order.clientId);
    if (clientUser?.email && userId) {
      const freelancerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
        .unique();

      await ctx.scheduler.runAfter(
        0,
        internal.email.sendOrderSubmittedEmail,
        {
          toEmail: clientUser.email,
          toName: clientUser.email,
          orderTitle: order.title,
          freelancerName: freelancerProfile
            ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
            : "Your freelancer",
          orderId: args.orderId,
        }
      );
    }

    return null;
  }
});

/**
 * Soft-deletes an order by setting deletedAt timestamp.
 * Admin only. Use instead of hard deletion to preserve financial records.
 */
export const softDeleteOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(args.orderId, {
      deletedAt: Date.now(),
    });

    await ctx.db.insert("activityLogs", {
      action: "Order Soft Deleted",
      details: `Order ${args.orderId} soft-deleted. Reason: ${args.reason}`,
      userId: order.clientId,
      timestamp: Date.now(),
      relatedId: args.orderId,
    });

    return null;
  },
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
    if (order.projectId) await ctx.db.patch(order.projectId, { status: "cancelled" });

    // FIX H9: Trigger Razorpay refund so the client's escrow funds are returned.
    // Previously the order was marked "cancelled" in the DB but the money stayed
    // locked in Razorpay indefinitely. Now we schedule the same refund path used
    // by admin dispute resolution (resolved_refund).
    await ctx.scheduler.runAfter(
      0,
      internal.paymentActions.refundPaymentForDispute,
      { orderId: args.orderId }
    );

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
        completedAt: Date.now(),
      });
      if (order.projectId) {
        await ctx.db.patch(order.projectId, { status: "completed" });
      }
      await ctx.db.insert("notifications", {
        userId: order.freelancerId,
        type: "funds_released",
        message: `Order "${order.title}" was auto-completed. Funds are being released to your account!`,
        isRead: false,
      });

      // FIX C1: Actually trigger the Razorpay transfer so funds reach the freelancer.
      // Without this call the DB showed "completed" but Razorpay never paid anyone.
      await ctx.scheduler.runAfter(
        0,
        internal.paymentActions.releaseEscrowForDispute,
        { orderId: args.orderId }
      );
    }
  },
});
