import { v } from "convex/values";
import { query, mutation, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

declare const process: any;

export const submitVerification = mutation({
  args: {
    collegeEmail: v.string(),
    collegeName: v.string(),
    studentIdFile: v.id("_storage"),
    course: v.string(),
    department: v.string(),
    graduationYear: v.number(),
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

    // Verify email was actually verified via OTP
    const emailRecord = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.collegeEmail))
      .first();

    if (!emailRecord || !emailRecord.verified) {
      throw new Error("College email has not been verified via OTP yet.");
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
      course: args.course,
      department: args.department,
      graduationYear: args.graduationYear,
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

export const sendOtpEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await ctx.runMutation(internal.verification.saveOtp, {
      email: args.email,
      otp,
      expiresAt,
    });

    const apiKey = process.env.BREVO_API_KEY;

    if (apiKey) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "CollegeGig", email: "verify@collegeskills.com" }, // You should verify this email/domain in Brevo
          to: [{ email: args.email }],
          subject: "CollegeGig Verification OTP",
          htmlContent: `<p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
        }),
      });
      if (!res.ok) {
        console.error("Brevo error", await res.text());
        throw new Error("Failed to send OTP email via Brevo.");
      }
    } else {
      console.warn(`[DEV MODE] Mock OTP for ${args.email}: ${otp}. Please set BREVO_API_KEY in your Convex dashboard to send real emails.`);
    }
  },
});

export const saveOtp = internalMutation({
  args: { email: v.string(), otp: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    for (const record of existing) {
      await ctx.db.delete(record._id);
    }
    await ctx.db.insert("emailVerifications", {
      email: args.email,
      otp: args.otp,
      expiresAt: args.expiresAt,
      verified: false,
    });
  },
});

export const verifyOtp = mutation({
  args: { email: v.string(), otp: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("emailVerifications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!record) throw new Error("No OTP requested for this email.");
    if (record.otp !== args.otp) throw new Error("Invalid OTP.");
    if (Date.now() > record.expiresAt) throw new Error("OTP has expired.");

    await ctx.db.patch(record._id, { verified: true });
    return true;
  },
});
