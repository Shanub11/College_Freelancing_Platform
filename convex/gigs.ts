import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createGig = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    tags: v.array(v.string()),
    basePrice: v.number(),
    deliveryTime: v.number(),
    images: v.array(v.id("_storage")),
    packages: v.optional(v.array(v.object({
      name: v.string(),
      description: v.string(),
      price: v.number(),
      deliveryTime: v.number(),
      features: v.array(v.string())
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user is a verified freelancer
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.userType !== "freelancer" || !profile.isVerified) {
      throw new Error("Only verified freelancers can create gigs");
    }

    const gigId = await ctx.db.insert("gigs", {
      freelancerId: userId,
      title: args.title,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      tags: args.tags,
      basePrice: args.basePrice,
      deliveryTime: args.deliveryTime,
      images: args.images,
      packages: args.packages,
      isActive: true,
      totalOrders: 0,
    });

    return gigId;
  },
});

export const getGigs = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let gigs;

    if (args.search) {
      gigs = await ctx.db
        .query("gigs")
        .withSearchIndex("search_gigs", (q) =>
          q.search("title", args.search!)
            .eq("isActive", true)
            .eq("category", args.category || "")
        )
        .take(args.limit || 20);
    } else if (args.category) {
      gigs = await ctx.db
        .query("gigs")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .take(args.limit || 20);
    } else {
      gigs = await ctx.db
        .query("gigs")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .take(args.limit || 20);
    }

    // Filter by price range
    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      gigs = gigs.filter(gig => {
        if (args.minPrice !== undefined && gig.basePrice < args.minPrice) return false;
        if (args.maxPrice !== undefined && gig.basePrice > args.maxPrice) return false;
        return true;
      });
    }

    // Get freelancer profiles for each gig
    const gigsWithProfiles = await Promise.all(
      gigs.map(async (gig) => {
        const freelancer = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", gig.freelancerId))
          .unique();
        return { ...gig, freelancer };
      })
    );

    return gigsWithProfiles;
  },
});

export const getGig = query({
  args: { gigId: v.id("gigs") },
  handler: async (ctx, args) => {
    const gig = await ctx.db.get(args.gigId);
    if (!gig) return null;

    const freelancer = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", gig.freelancerId))
      .unique();

    return { ...gig, freelancer };
  },
});

export const getMyGigs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const gigs = await ctx.db
      .query("gigs")
      .withIndex("by_freelancer", (q) => q.eq("freelancerId", userId))
      .collect();

    return gigs;
  },
});

export const searchGigs = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("gigs")
      .withSearchIndex("search_gigs", (q) => 
        q.search("title", args.searchTerm)
          .eq("isActive", true)
      )
      .take(20);

    if (args.category) {
      results = results.filter(gig => gig.category === args.category);
    }

    // Get freelancer profiles for each gig
    const gigsWithProfiles = await Promise.all(
      results.map(async (gig) => {
        const freelancer = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", gig.freelancerId))
          .unique();
        return { ...gig, freelancer };
      })
    );

    return gigsWithProfiles;
  },
});

export const updateGig = mutation({
  args: {
    gigId: v.id("gigs"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    deliveryTime: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const gig = await ctx.db.get(args.gigId);
    if (!gig || gig.freelancerId !== userId) {
      throw new Error("Gig not found or unauthorized");
    }

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.basePrice !== undefined) updates.basePrice = args.basePrice;
    if (args.deliveryTime !== undefined) updates.deliveryTime = args.deliveryTime;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.gigId, updates);
    return args.gigId;
  },
});
