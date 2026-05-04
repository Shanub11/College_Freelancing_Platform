import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const submitReview = mutation({
  args: {
    orderId: v.id("orders"),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Unauthorized");
    const userId = authUserId as Id<"users">;

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    if (order.status !== "completed") {
      throw new Error("Can only review completed orders");
    }

    const isClient = order.clientId === userId;
    const isFreelancer = order.freelancerId === userId;

    if (!isClient && !isFreelancer) {
      throw new Error("You are not part of this order");
    }

    const revieweeId = isClient ? order.freelancerId : order.clientId;

    // Check if already reviewed
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.eq(q.field("reviewerId"), userId))
      .first();

    if (existingReview) {
      throw new Error("You have already submitted a review for this order");
    }

    // Insert the review. Initially hidden (isPublic: false) for double-blind mechanism
    const reviewId = await ctx.db.insert("reviews", {
      orderId: args.orderId,
      reviewerId: userId,
      revieweeId: revieweeId,
      rating: args.rating,
      comment: args.comment,
      isPublic: false,
    });

    // Check if the other party has also reviewed
    const otherReview = await ctx.db
      .query("reviews")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .filter((q) => q.eq(q.field("reviewerId"), revieweeId))
      .first();

    // If both have reviewed, make both public and update profiles
    if (otherReview) {
      await ctx.db.patch(reviewId, { isPublic: true });
      await ctx.db.patch(otherReview._id, { isPublic: true });

      // Update profiles with new ratings
      await updateProfileRating(ctx, userId);
      await updateProfileRating(ctx, revieweeId);

      if (order.gigId) {
        await updateGigRating(ctx, order.gigId);
      }
    }

    // Log activity
    await ctx.db.insert("activityLogs", {
      action: "Review Submitted",
      details: `User ${userId} submitted a review for order ${args.orderId}`,
      userId,
      timestamp: Date.now(),
      relatedId: args.orderId,
    });

    return reviewId;
  },
});

async function updateProfileRating(ctx: MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  
  if (!profile) return;

  const publicReviews = await ctx.db
    .query("reviews")
    .withIndex("by_reviewee", (q) => q.eq("revieweeId", userId))
    .filter((q) => q.eq(q.field("isPublic"), true))
    .collect();

  if (publicReviews.length > 0) {
    const sum = publicReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
    const averageRating = sum / publicReviews.length;
    await ctx.db.patch(profile._id, {
      averageRating,
      totalReviews: publicReviews.length,
    });
  }
}

async function updateGigRating(ctx: MutationCtx, gigId: Id<"gigs">) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_gig", (q) => q.eq("gigId", gigId))
    .collect();
  
  let sum = 0;
  let count = 0;

  for (const order of orders) {
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .filter((q) => q.eq(q.field("reviewerId"), order.clientId))
      .first();
    
    if (review) {
      sum += review.rating;
      count++;
    }
  }

  if (count > 0) {
    await ctx.db.patch(gigId, {
      averageRating: sum / count,
    });
  }
}

export const getOrderReviews = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx) as Id<"users"> | null;
    
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    // Safe retrieval: Hide content for other's non-public review
    return reviews.map((r) => {
      if (r.isPublic || r.reviewerId === userId) return r;
      return { ...r, rating: 0, comment: "Hidden until both parties review.", isHidden: true };
    });
  },
});