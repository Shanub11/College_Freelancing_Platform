import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal as internalApi } from "./_generated/api";
import { enforceRateLimit } from "./rateLimiter";
import { Id } from "./_generated/dataModel";

const internal = internalApi as any;

export const openDispute = mutation({
  args: {
    projectId: v.optional(v.id("projectRequests")),
    orderId: v.optional(v.id("orders")),
    reason: v.string(),
  },
  returns: v.id("disputes"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await enforceRateLimit(
      ctx,
      userId as Id<"users">,
      "dispute_open",
      2,
      24 * 60 * 60 * 1000,
      "You can only open 2 support tickets per day."
    );

    if (args.orderId) {
      const order = await ctx.db.get(args.orderId);
      if (!order) throw new Error("Order not found");
      if (order.clientId !== userId && order.freelancerId !== userId) {
        throw new Error("You are not part of this order");
      }
      
      const existingDispute = await ctx.db
        .query("disputes")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
        .filter((q) => q.eq(q.field("status"), "open"))
        .first();

      if (existingDispute) throw new Error("A dispute is already open for this order");
      
      const disputeId = await ctx.db.insert("disputes", {
        projectId: args.projectId || order.projectId,
        orderId: args.orderId,
        creatorId: userId,
        reason: args.reason,
        description: args.reason,
        status: "open",
      });

      await ctx.db.patch(args.orderId, { status: "disputed" });
      if (order.projectId) {
         await ctx.db.patch(order.projectId, { status: "disputed" as any });
      }

      await ctx.db.insert("activityLogs", {
        action: "Dispute Opened",
        details: `Dispute opened for order ${args.orderId} by user ${userId}. Reason: ${args.reason}`,
        userId,
        timestamp: Date.now(),
        relatedId: args.orderId,
      });

      return disputeId;
    } else if (args.projectId) {
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
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId!))
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
    } else {
      // General support ticket
      const disputeId = await ctx.db.insert("disputes", {
        creatorId: userId,
        reason: args.reason,
        description: args.reason,
        status: "open",
      });

      await ctx.db.insert("activityLogs", {
        action: "Support Ticket Opened",
        details: `Support ticket opened by user ${userId}. Reason: ${args.reason}`,
        userId,
        timestamp: Date.now(),
        relatedId: disputeId,
      });

      // Send email to the user confirming their ticket was received
      const creatorUser = await ctx.db.get(userId);
      if (creatorUser?.email) {
        const creatorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();

        await ctx.scheduler.runAfter(
          0,
          internal.email.sendDisputeOpenedEmail,
          {
            toEmail: creatorUser.email,
            toName: creatorProfile
              ? `${creatorProfile.firstName} ${creatorProfile.lastName}`
              : creatorUser.email,
            disputeReason: args.reason,
            projectTitle: undefined,
          }
        );
      }

      return disputeId;
    }
  },
});

export const getOpenDisputes = query({
  handler: async (ctx) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) return [];

    const isAdmin = await ctx.runQuery(internal.adminHelpers.checkIsAdminById, { userId: adminId });
    if (!isAdmin) {
      return [];
    }

    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    return Promise.all(disputes.map(async (d) => {
      let project = null;
      let order = null;
      if (d.projectId) {
        project = await ctx.db.get(d.projectId);
      }
      if (d.orderId) {
        order = await ctx.db.get(d.orderId);
      }
      const creatorProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", d.creatorId))
        .unique();
      return { 
        ...d, 
        project, 
        order,
        creatorName: creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : "Unknown"
      };
    }));
  }
});

export const resolveDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    resolution: v.union(v.literal("resolved_refund"), v.literal("resolved_release"), v.literal("resolved_general")),
    notes: v.string(),
  },
  returns: v.id("disputes"),
  handler: async (ctx, args) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new Error("Unauthorized");

    const isAdmin = await ctx.runQuery(internal.adminHelpers.checkIsAdminById, { userId: adminId });
    if (!isAdmin) {
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

    if (args.resolution !== "resolved_general") {
      if (dispute.projectId) {
        const projectStatus = args.resolution === "resolved_refund" ? "cancelled" : "completed";
        await ctx.db.patch(dispute.projectId, { status: projectStatus as any });
      }
      if (dispute.orderId) {
        const orderStatus = args.resolution === "resolved_refund" ? "cancelled" : "completed";
        await ctx.db.patch(dispute.orderId, { status: orderStatus as any });

        if (args.resolution === "resolved_release") {
          await ctx.scheduler.runAfter(
            0,
            internal.paymentActions.releaseEscrowForDispute,
            { orderId: dispute.orderId }
          );
        }

        if (args.resolution === "resolved_refund") {
          await ctx.scheduler.runAfter(
            0,
            internal.paymentActions.refundPaymentForDispute,
            { orderId: dispute.orderId }
          );
        }
      }
    }

    await ctx.db.insert("activityLogs", {
      action: "Dispute Resolved",
      details: `Dispute ${args.disputeId} resolved as ${args.resolution}. Notes: ${args.notes}`,
      userId: adminId,
      timestamp: Date.now(),
      relatedId: dispute.projectId || args.disputeId,
    });

    return args.disputeId;
  },
});
