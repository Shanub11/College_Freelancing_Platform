import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return profile;
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return profile;
  },
});

export const createProfile = mutation({
  args: {
    userType: v.union(v.literal("freelancer"), v.literal("client")),
    firstName: v.string(),
    lastName: v.string(),
    bio: v.optional(v.string()),
    // Freelancer fields
    collegeName: v.optional(v.string()),
    collegeEmail: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    skills: v.optional(v.array(v.string())),
    // Client fields
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if profile already exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      throw new Error("Profile already exists");
    }

    const profileId = await ctx.db.insert("profiles", {
      userId,
      userType: args.userType,
      firstName: args.firstName,
      lastName: args.lastName,
      bio: args.bio,
      collegeName: args.collegeName,
      collegeEmail: args.collegeEmail,
      graduationYear: args.graduationYear,
      skills: args.skills,
      company: args.company,
      isVerified: false,
      totalReviews: 0,
    });

    // If freelancer with college email, create verification request
    if (args.userType === "freelancer" && args.collegeEmail && args.collegeName) {
      await ctx.db.insert("verificationRequests", {
        userId,
        collegeEmail: args.collegeEmail,
        collegeName: args.collegeName,
        status: "pending",
      });
    }

    return profileId;
  },
});

export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    company: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    const updates: any = {};
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.skills !== undefined) updates.skills = args.skills;
    if (args.company !== undefined) updates.company = args.company;

    await ctx.db.patch(profile._id, updates);
    return profile._id;
  },
});

export const getFreelancers = query({
  args: {
    limit: v.optional(v.number()),
    college: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("profiles")
      .withIndex("by_type", (q) => q.eq("userType", "freelancer"));

    if (args.college) {
      query = ctx.db
        .query("profiles")
        .withIndex("by_college", (q) => q.eq("collegeName", args.college));
    }

    const freelancers = await query
      .filter((q) => q.eq(q.field("isVerified"), true))
      .take(args.limit || 20);

    // Filter by skills if provided
    if (args.skills && args.skills.length > 0) {
      return freelancers.filter(freelancer => 
        freelancer.skills?.some(skill => 
          args.skills!.some(searchSkill => 
            skill.toLowerCase().includes(searchSkill.toLowerCase())
          )
        )
      );
    }

    return freelancers;
  },
});

export const checkIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const user = await ctx.db.get(userId);
    if (!user) return false;

    // Check if user is admin - you can modify this logic as needed
    // For now, checking if email matches admin email
    const adminEmails = [
      "admin@collegeskills.com",
      "owner@collegeskills.com"
    ];
    
    return adminEmails.includes(user.email || "");
  },
});
