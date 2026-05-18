import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { enforceRateLimit } from "./rateLimiter";
import { Id } from "./_generated/dataModel";
import { enforceModerationOnFields } from "./moderation";

const gigShape = {
  _id: v.id("gigs"),
  _creationTime: v.number(),
  freelancerId: v.id("users"),
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
  isActive: v.boolean(),
  totalOrders: v.number(),
  averageRating: v.optional(v.number()),
};

const profileShape = {
  _id: v.id("profiles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  userType: v.union(v.literal("freelancer"), v.literal("client"), v.literal("admin")),
  firstName: v.string(),
  lastName: v.string(),
  profilePicture: v.optional(v.id("_storage")),
  bio: v.optional(v.string()),
  collegeName: v.optional(v.string()),
  collegeEmail: v.optional(v.string()),
  graduationYear: v.optional(v.number()),
  studentId: v.optional(v.id("_storage")),
  isVerified: v.boolean(),
  skills: v.optional(v.array(v.string())),
  portfolioItems: v.optional(v.array(v.object({
    id: v.string(),
    title: v.string(),
    description: v.string(),
    image: v.optional(v.id("_storage")),
    link: v.optional(v.string())
  }))),
  paypalMerchantId: v.optional(v.string()),
  razorpayAccountId: v.optional(v.string()),
  razorpayStakeholderId: v.optional(v.string()),
  razorpayProductId: v.optional(v.string()),
  isPayoutReady: v.optional(v.boolean()),
  payoutOnboardingStatus: v.optional(v.union(
    v.literal("not_started"),
    v.literal("pending"),
    v.literal("activated"),
    v.literal("failed")
  )),
  bankAccountHolderName: v.optional(v.string()),
  bankIfsc: v.optional(v.string()),
  bankAccountLast4: v.optional(v.string()),
  bankDetailsUpdatedAt: v.optional(v.number()),
  company: v.optional(v.string()),
  identity: v.optional(v.string()),
  hiringPreferences: v.optional(v.array(v.string())),
  preferredCommunication: v.optional(v.string()),
  website: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  industry: v.optional(v.string()),
  teamSize: v.optional(v.string()),
  paymentVerified: v.optional(v.boolean()),
  isAdmin: v.optional(v.boolean()),
  averageRating: v.optional(v.number()),
  totalReviews: v.number(),
};

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
  returns: v.id("gigs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await enforceModerationOnFields(ctx, userId as Id<"users">, [
      { fieldName: "gig title", value: args.title },
      { fieldName: "gig description", value: args.description },
    ]);

    await enforceRateLimit(
      ctx,
      userId as Id<"users">,
      "gig_create",
      5,
      24 * 60 * 60 * 1000,
      "You can only create 5 gigs per day."
    );

    // Verify user is a verified freelancer
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.userType !== "freelancer" || !profile.isVerified) {
      throw new Error("Only verified freelancers can create gigs");
    }

    // Server-side validation
    if (args.title.trim().length < 10) {
      throw new Error("Gig title must be at least 10 characters.");
    }
    if (args.title.length > 200) {
      throw new Error("Gig title is too long. Maximum 200 characters.");
    }
    if (args.description.trim().length < 50) {
      throw new Error(
        "Gig description must be at least 50 characters."
      );
    }
    if (args.basePrice < 50) {
      throw new Error("Minimum gig price is ₹50.");
    }
    if (args.deliveryTime < 1 || args.deliveryTime > 90) {
      throw new Error("Delivery time must be between 1 and 90 days.");
    }
    if (args.tags.length > 10) {
      throw new Error("Maximum 10 tags allowed per gig.");
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
  returns: v.array(v.object({ ...gigShape, freelancer: v.union(v.null(), v.object(profileShape)) })),
  handler: async (ctx, args) => {
    let gigs;

    if (args.search) {
      gigs = await ctx.db
        .query("gigs")
        .withSearchIndex("search_gigs", (q) => {
          // BUG FIX: Do not filter by category when it is empty string.
          // Passing .eq("category", "") to the search index returns zero results.
          const baseSearch = q.search("title", args.search!).eq("isActive", true);
          if (args.category) {
            return baseSearch.eq("category", args.category);
          }
          return baseSearch;
        })
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
  returns: v.union(v.null(), v.object({ ...gigShape, freelancer: v.union(v.null(), v.object(profileShape)) })),
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
  returns: v.array(v.object(gigShape)),
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
  returns: v.array(v.object({ ...gigShape, freelancer: v.union(v.null(), v.object(profileShape)) })),
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
  returns: v.id("gigs"),
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
