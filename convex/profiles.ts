import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx } from "./_generated/server";

/**
 * Internal helper to check if the current user is an admin.
 * @param ctx - The query or mutation context.
 * @returns {Promise<boolean>} - True if the user is an admin, false otherwise.
 */
async function isAdminUser(ctx: QueryCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return false;

  const user = await ctx.db.get(userId);
  if (!user) return false;

  const adminEmails = ["admin@collegeskills.com", "owner@collegeskills.com", "admin123@gmail.com"];

  return adminEmails.includes(user.email || "");
}

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    return {
      ...profile,
      profilePictureUrl: profile.profilePicture ? await ctx.storage.getUrl(profile.profilePicture) : null,
    };
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) return null;

    return {
      ...profile,
      profilePictureUrl: profile.profilePicture ? await ctx.storage.getUrl(profile.profilePicture) : null,
    };
  },
});

export const createProfile = mutation({
  args: {
    userType: v.union(v.literal("freelancer"), v.literal("client")),
    firstName: v.string(),
    lastName: v.string(),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.id("_storage")),
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

    const user = await ctx.db.get(userId);
    const adminEmails = ["admin@collegeskills.com", "owner@collegeskills.com", "admin123@gmail.com"];
    const isAdmin = adminEmails.includes(user?.email || "");

    // If user is admin, set userType to 'admin'.
    const userType = isAdmin ? "admin" : args.userType;

    const profileId = await ctx.db.insert("profiles", {
      userId,
      userType: userType,
      firstName: args.firstName,
      lastName: args.lastName,
      bio: args.bio,
      profilePicture: args.profilePicture,
      collegeName: args.collegeName,
      collegeEmail: args.collegeEmail,
      graduationYear: args.graduationYear,
      skills: args.skills,
      company: args.company,
      isAdmin: isAdmin,
      isVerified: isAdmin,
      totalReviews: 0,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      action: "Profile Created",
      details: `New ${userType} profile created: ${args.firstName} ${args.lastName}`,
      userId,
      timestamp: Date.now(),
      relatedId: profileId,
    });

    return profileId;
  },
});

export const submitForVerification = mutation({
  args: {
    collegeName: v.string(),
    collegeEmail: v.string(),
    course: v.string(),
    department: v.string(),
    graduationYear: v.number(),
    studentId: v.id("_storage"),
    govtId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter(q => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error("You already have a pending verification request.");
    }

    const requestId = await ctx.db.insert("verificationRequests", {
      userId,
      status: "pending",
      ...args,
    });

    // Log activity
    await ctx.db.insert("activityLogs", {
      action: "Verification Requested",
      details: `Verification requested by user`,
      userId,
      timestamp: Date.now(),
      relatedId: requestId,
    });
  },
});


export const updateProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.id("_storage")),
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
    if (args.profilePicture !== undefined) updates.profilePicture = args.profilePicture;
    if (args.skills !== undefined) updates.skills = args.skills;
    if (args.company !== undefined) updates.company = args.company;

    await ctx.db.patch(profile._id, updates);

    // Log activity
    await ctx.db.insert("activityLogs", {
      action: "Profile Updated",
      details: `Profile updated for ${profile.firstName} ${profile.lastName}`,
      userId,
      timestamp: Date.now(),
      relatedId: profile._id,
    });

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
    return await isAdminUser(ctx);
  },
});

export const getPendingVerifications = query({
  handler: async (ctx) => {
    const isAdmin = await isAdminUser(ctx);
    if (!isAdmin) {
      throw new Error("You are not authorized to perform this action.");
    }

    const requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Enrich requests with profile information
    return Promise.all(
      requests.map(async (request) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", request.userId))
          .unique();

        const studentIdUrl = request.studentId
          ? await ctx.storage.getUrl(request.studentId)
          : null;
        const govtIdUrl = request.govtId
          ? await ctx.storage.getUrl(request.govtId)
          : null;

        return {
          ...request,
          profileId: profile?._id, // Pass profileId to the frontend
          profileName: profile?.firstName + " " + profile?.lastName,
          studentIdUrl,
          govtIdUrl,
        };
      })
    );
  },
});

export const approveVerification = mutation({
  args: {
    requestId: v.id("verificationRequests"),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, { requestId, profileId }) => {
    const isAdmin = await isAdminUser(ctx);
    if (!isAdmin) {
      throw new Error("You are not authorized to perform this action.");
    }

    // Update profile to be verified
    await ctx.db.patch(profileId, { isVerified: true });

    // Update request status
    await ctx.db.patch(requestId, { status: "approved" });

    // Log activity
    const adminId = await getAuthUserId(ctx);
    if (adminId) {
      await ctx.db.insert("activityLogs", {
        action: "Verification Approved",
        details: `Verification approved for profile ${profileId}`,
        userId: adminId,
        timestamp: Date.now(),
        relatedId: requestId,
      });
    }
  },
});

export const rejectVerification = mutation({
  args: {
    requestId: v.id("verificationRequests"),
  },
  handler: async (ctx, { requestId }) => {
    const isAdmin = await isAdminUser(ctx);
    if (!isAdmin) {
      throw new Error("You are not authorized to perform this action.");
    }

    // Update request status
    await ctx.db.patch(requestId, { status: "rejected" });

    // Log activity
    const adminId = await getAuthUserId(ctx);
    if (adminId) {
      await ctx.db.insert("activityLogs", {
        action: "Verification Rejected",
        details: `Verification rejected for request ${requestId}`,
        userId: adminId,
        timestamp: Date.now(),
        relatedId: requestId,
      });
    }
  },
});

export const getVerificationStatus = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});
