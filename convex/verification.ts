import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const submitVerification = mutation({
  args: {
    collegeEmail: v.string(),
    collegeName: v.string(),
    studentIdFile: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has a freelancer profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.userType !== "freelancer") {
      throw new Error("Only freelancers can submit verification requests");
    }

    // Check if there's already a pending or approved request
    const existingRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    if (existingRequest) {
      throw new Error("You already have a verification request in progress");
    }

    // Create new verification request
    const requestId = await ctx.db.insert("verificationRequests", {
      userId,
      collegeEmail: args.collegeEmail,
      collegeName: args.collegeName,
      studentId: args.studentIdFile,
      status: "pending",
    });

    // Update profile with verification info
    await ctx.db.patch(profile._id, {
      collegeEmail: args.collegeEmail,
      collegeName: args.collegeName,
      studentId: args.studentIdFile,
    });

    return requestId;
  },
});

export const getMyVerificationStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const request = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();

    return request;
  },
});

// Admin functions
export const getPendingVerifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const adminEmails = [
      "admin@collegeskills.com",
      "owner@collegeskills.com"
    ];
    
    if (!adminEmails.includes(user.email || "")) {
      throw new Error("Access denied: Admin privileges required");
    }

    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Get user profiles for each request
    const requestsWithProfiles = await Promise.all(
      requests.map(async (request) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", request.userId))
          .unique();
        
        const user = await ctx.db.get(request.userId);
        
        return {
          ...request,
          profile,
          user,
        };
      })
    );

    return requestsWithProfiles;
  },
});

export const reviewVerification = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    // Check if user is admin
    const adminUser = await ctx.db.get(adminUserId);
    if (!adminUser) throw new Error("User not found");

    const adminEmails = [
      "admin@collegeskills.com",
      "owner@collegeskills.com"
    ];
    
    if (!adminEmails.includes(adminUser.email || "")) {
      throw new Error("Access denied: Admin privileges required");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Verification request not found");

    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    // Update the verification request
    await ctx.db.patch(args.requestId, {
      status: args.status,
      adminNotes: args.adminNotes,
      reviewedBy: adminUserId,
      reviewedAt: Date.now(),
    });

    // If approved, update the user's profile
    if (args.status === "approved") {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", request.userId))
        .unique();

      if (profile) {
        await ctx.db.patch(profile._id, {
          isVerified: true,
        });
      }
    }

    return args.requestId;
  },
});

export const getVerificationDetails = query({
  args: { requestId: v.id("verificationRequests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const adminEmails = [
      "admin@collegeskills.com",
      "owner@collegeskills.com"
    ];
    
    if (!adminEmails.includes(user.email || "")) {
      throw new Error("Access denied: Admin privileges required");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    // Get the student ID file URL if it exists
    let studentIdUrl = null;
    if (request.studentId) {
      studentIdUrl = await ctx.storage.getUrl(request.studentId);
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", request.userId))
      .unique();

    const user_data = await ctx.db.get(request.userId);

    return {
      ...request,
      studentIdUrl,
      profile,
      user: user_data,
    };
  },
});
