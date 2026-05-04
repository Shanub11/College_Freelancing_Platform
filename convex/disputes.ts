import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const openDispute = mutation({
  args: {
    projectId: v.id("projectRequests"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    if (project.clientId !== userId && project.selectedFreelancer !== userId) {
      throw new Error("You are not part of this project");
    }

    if (project.status === "completed" || project.status === "cancelled" || project.status === "open") {
      throw new Error("Cannot dispute a project in this status");
    }

    const existingDispute = await ctx.db
      .query("disputes")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .first();

    if (existingDispute) {
      throw new Error("A dispute is already open for this project");
    }

    const disputeId = await ctx.db.insert("disputes", {
      projectId: args.projectId,
      creatorId: userId,
      reason: args.reason,
      description: args.reason,
      status: "open",
    });

    await ctx.db.patch(args.projectId, {
      status: "disputed" as any,
    });

    await ctx.db.insert("activityLogs", {
      action: "Dispute Opened",
      details: `Dispute opened for project ${args.projectId} by user ${userId}. Reason: ${args.reason}`,
      userId,
      timestamp: Date.now(),
      relatedId: args.projectId,
    });

    return disputeId;
  },
});

export const getOpenDisputes = query({
  handler: async (ctx) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) return [];

    const user = await ctx.db.get(adminId);
    const adminEmails = ["admin@collegeskills.com", "owner@collegeskills.com", "admin123@gmail.com"];
    if (!adminEmails.includes(user?.email || "")) {
      return [];
    }

    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return Promise.all(disputes.map(async (d) => {
      const project = await ctx.db.get(d.projectId);
      const creatorProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", d.creatorId))
        .unique();
      return { 
        ...d, 
        project, 
        creatorName: creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : "Unknown"
      };
    }));
  }
});

export const resolveDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    resolution: v.union(v.literal("resolved_refund"), v.literal("resolved_release")),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new Error("Unauthorized");

    const user = await ctx.db.get(adminId);
    const adminEmails = ["admin@collegeskills.com", "owner@collegeskills.com", "admin123@gmail.com"];
    if (!adminEmails.includes(user?.email || "")) {
      throw new Error("Access denied: Admin privileges required");
    }

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) throw new Error("Dispute not found");

    if (dispute.status !== "open") throw new Error("Dispute is already resolved");

    await ctx.db.patch(args.disputeId, {
      status: args.resolution,
      resolutionNotes: args.notes,
      resolvedBy: adminId,
      resolvedAt: Date.now(),
    });

    const projectStatus = args.resolution === "resolved_refund" ? "cancelled" : "completed";
    await ctx.db.patch(dispute.projectId, { status: projectStatus as any });

    await ctx.db.insert("activityLogs", {
      action: "Dispute Resolved",
      details: `Dispute ${args.disputeId} resolved as ${args.resolution}. Notes: ${args.notes}`,
      userId: adminId,
      timestamp: Date.now(),
      relatedId: dispute.projectId,
    });

    return args.disputeId;
  },
});