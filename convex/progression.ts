import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id, Doc } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// ─── XP Curve Constants ──────────────────────────────────────────────────────
// XP required to reach level N: XP_LEVEL_BASE * (XP_LEVEL_MULTIPLIER ^ (N-1))
// Level 1: 100 XP, Level 2: 150 XP, Level 3: 225 XP, Level 10: ~3844 XP
const XP_LEVEL_BASE = 100;
const XP_LEVEL_MULTIPLIER = 1.5;
const XP_MAX_LEVEL = 50;

// ─── XP Award Amounts ────────────────────────────────────────────────────────
export const XP_AWARDS = {
  project_completed: 100,
  five_star_review: 50,
  on_time_delivery: 25,
  repeat_client: 30,
  profile_completed: 50,
} as const;

// ─── Skill Verification Thresholds ───────────────────────────────────────────
const SKILL_VERIFIED_MIN_PROJECTS = 3;
const SKILL_VERIFIED_MIN_RATING = 4.0;

// ─── Tier Thresholds (by level) ──────────────────────────────────────────────
function levelToTier(level: number): Doc<"profiles">["tier"] {
  if (level >= 40) return "Elite";
  if (level >= 25) return "Expert";
  if (level >= 15) return "Pro";
  if (level >= 5) return "Rising Talent";
  return "Newcomer";
}

// ─── XP → Level Calculation ──────────────────────────────────────────────────
export function xpToLevel(totalXp: number): { level: number; xpForCurrentLevel: number; xpForNextLevel: number; progressPercent: number } {
  let level = 1;
  let xpConsumed = 0;

  for (let n = 1; n <= XP_MAX_LEVEL; n++) {
    const xpRequired = Math.round(XP_LEVEL_BASE * Math.pow(XP_LEVEL_MULTIPLIER, n - 1));
    if (xpConsumed + xpRequired > totalXp) {
      const xpIntoCurrentLevel = totalXp - xpConsumed;
      return {
        level,
        xpForCurrentLevel: xpIntoCurrentLevel,
        xpForNextLevel: xpRequired,
        progressPercent: Math.round((xpIntoCurrentLevel / xpRequired) * 100),
      };
    }
    xpConsumed += xpRequired;
    level = n + 1;
    if (level > XP_MAX_LEVEL) {
      return { level: XP_MAX_LEVEL, xpForCurrentLevel: 0, xpForNextLevel: 0, progressPercent: 100 };
    }
  }

  return { level: 1, xpForCurrentLevel: 0, xpForNextLevel: XP_LEVEL_BASE, progressPercent: 0 };
}

// ─── Badge Rule Definitions (data-driven) ────────────────────────────────────
type BadgeStats = {
  projectCount: number;
  avgRating: number;
  onTimeRate: number;
  repeatClientCount: number;
};

type BadgeType = Doc<"badges">["badgeType"];

const BADGE_RULES: Array<{ type: BadgeType; check: (s: BadgeStats) => boolean }> = [
  { type: "first_project",        check: (s) => s.projectCount >= 1 },
  { type: "ten_projects",         check: (s) => s.projectCount >= 10 },
  { type: "fifty_projects",       check: (s) => s.projectCount >= 50 },
  { type: "rising_talent",        check: (s) => s.projectCount >= 3 && s.avgRating >= 4.5 },
  { type: "top_rated",            check: (s) => s.avgRating >= 4.8 && s.projectCount >= 5 },
  { type: "on_time_streak",       check: (s) => s.onTimeRate === 100 && s.projectCount >= 5 },
  { type: "repeat_client_magnet", check: (s) => s.repeatClientCount >= 3 },
  { type: "elite_freelancer",     check: (s) => s.projectCount >= 50 && s.avgRating >= 4.7 },
];

// ─── Internal: Award XP ──────────────────────────────────────────────────────
export const awardXp = internalMutation({
  args: {
    userId: v.id("users"),
    eventType: v.union(
      v.literal("project_completed"),
      v.literal("five_star_review"),
      v.literal("on_time_delivery"),
      v.literal("repeat_client"),
      v.literal("profile_completed")
    ),
    sourceId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Prevent duplicate profile_completed XP events
    if (args.eventType === "profile_completed") {
      const existing = await ctx.db
        .query("xpEvents")
        .withIndex("by_user_and_event", (q) =>
          q.eq("userId", args.userId).eq("eventType", "profile_completed")
        )
        .first();
      if (existing) return null;
    }

    const xpAmount = XP_AWARDS[args.eventType];

    await ctx.db.insert("xpEvents", {
      userId: args.userId,
      eventType: args.eventType,
      xpAmount,
      sourceId: args.sourceId,
      createdAt: Date.now(),
    });

    await recalculateLevel(ctx, args.userId);
    return null;
  },
});

// ─── Internal: Recalculate Level ─────────────────────────────────────────────
async function recalculateLevel(ctx: MutationCtx, userId: Id<"users">) {
  const events = await ctx.db
    .query("xpEvents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const totalXp = events.reduce((sum, e) => sum + e.xpAmount, 0);
  const { level } = xpToLevel(totalXp);
  const tier = levelToTier(level);

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (profile) {
    await ctx.db.patch(profile._id, { xp: totalXp, level, tier });
  }
}

// ─── Internal: Evaluate & Grant Badges ───────────────────────────────────────
export const evaluateBadges = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Gather stats for badge evaluation — only from verified (completed) orders
    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer_and_status", (q) =>
        q.eq("freelancerId", args.userId).eq("status", "completed")
      )
      .take(500);

    const projectCount = completedOrders.length;
    if (projectCount === 0) return null;

    // On-time rate
    let onTimeCount = 0;
    for (const o of completedOrders) {
      if (!o.deadline || (o.submittedAt && o.submittedAt <= o.deadline)) onTimeCount++;
    }
    const onTimeRate = Math.round((onTimeCount / projectCount) * 100);

    // Average rating
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    const avgRating = profile?.averageRating ?? 0;

    // Repeat clients
    const clientIds = completedOrders.map((o) => o.clientId.toString());
    const clientCounts: Record<string, number> = {};
    for (const cid of clientIds) clientCounts[cid] = (clientCounts[cid] || 0) + 1;
    const repeatClientCount = Object.values(clientCounts).filter((c) => c >= 2).length;

    const stats: BadgeStats = { projectCount, avgRating, onTimeRate, repeatClientCount };

    // Already-earned badge types for this user
    const existingBadges = await ctx.db
      .query("badges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const earned = new Set(existingBadges.map((b) => b.badgeType));

    // Evaluate each rule; insert badge if not already earned
    for (const rule of BADGE_RULES) {
      if (!earned.has(rule.type) && rule.check(stats)) {
        await ctx.db.insert("badges", {
          userId: args.userId,
          badgeType: rule.type,
          earnedAt: Date.now(),
          criteriaMeta: {
            projectCount,
            avgRating,
            onTimeRate,
            repeatClientCount,
          },
        });
      }
    }

    return null;
  },
});

// ─── Internal: Aggregate Skills ──────────────────────────────────────────────
export const aggregateSkills = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Only aggregate skills from VERIFIED (completed + paid) orders
    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_freelancer_and_status", (q) =>
        q.eq("freelancerId", args.userId).eq("status", "completed")
      )
      .take(500);

    // Build skill → { verifiedCount, ratings[] } map
    type SkillData = { verifiedCount: number; ratings: number[] };
    const skillMap: Record<string, SkillData> = {};

    for (const order of completedOrders) {
      // Collect skills from the linked project request or gig
      let skills: string[] = [];
      if (order.projectId) {
        const proj = await ctx.db.get(order.projectId);
        if (proj) skills = proj.skills || [];
      } else if (order.gigId) {
        const gig = await ctx.db.get(order.gigId);
        if (gig) skills = gig.tags || [];
      }

      // Get the client review rating for this order
      const review = await ctx.db
        .query("reviews")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .filter((q) => q.eq(q.field("revieweeId"), args.userId))
        .first();

      for (const skill of skills) {
        const s = skill.trim().toLowerCase();
        if (!skillMap[s]) skillMap[s] = { verifiedCount: 0, ratings: [] };
        skillMap[s].verifiedCount++;
        if (review?.rating) skillMap[s].ratings.push(review.rating);
      }
    }

    const now = Date.now();

    for (const [skillName, data] of Object.entries(skillMap)) {
      const avgRating =
        data.ratings.length > 0
          ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
          : 0;

      const isVerified =
        data.verifiedCount >= SKILL_VERIFIED_MIN_PROJECTS &&
        avgRating >= SKILL_VERIFIED_MIN_RATING;

      // Proficiency score: blend of count (capped at 10) and rating (out of 5)
      const countScore = Math.min(data.verifiedCount / 10, 1) * 60; // max 60 pts
      const ratingScore = avgRating > 0 ? (avgRating / 5) * 40 : 20; // max 40 pts
      const proficiencyScore = Math.round(countScore + ratingScore);

      // Upsert into skillProfiles
      const existing = await ctx.db
        .query("skillProfiles")
        .withIndex("by_user_and_skill", (q) =>
          q.eq("userId", args.userId).eq("skillName", skillName)
        )
        .first();

      const doc = {
        userId: args.userId,
        skillName,
        totalProjectCount: data.verifiedCount,
        verifiedProjectCount: data.verifiedCount,
        avgVerifiedRating: avgRating > 0 ? avgRating : undefined,
        isVerified,
        proficiencyScore,
        lastUpdatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, doc);
      } else {
        await ctx.db.insert("skillProfiles", doc);
      }
    }

    return null;
  },
});

// ─── Public Query: Get Public Profile by Slug ─────────────────────────────────
export const getPublicProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Find profile by publicSlug using a filter scan (slug is low-cardinality enough for this)
    const allProfiles = await ctx.db
      .query("profiles")
      .withIndex("by_type", (q) => q.eq("userType", "freelancer"))
      .filter((q) => q.eq(q.field("publicSlug"), args.slug))
      .first();

    if (!allProfiles) return null;
    if (!allProfiles.isPublicProfile) return null;

    return buildPublicProfile(ctx, allProfiles);
  },
});

// ─── Public Query: Get Public Profile by UserId ────────────────────────────────
export const getPublicProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile) return null;
    return buildPublicProfile(ctx, profile);
  },
});

// ─── Helper: Build Public Profile Object ─────────────────────────────────────
async function buildPublicProfile(ctx: QueryCtx, profile: Doc<"profiles">) {
  const privacy = profile.privacySettings ?? { showEarnings: false, anonymizeClients: false };

  // Avatar URL
  const profilePictureUrl = profile.profilePicture
    ? await ctx.storage.getUrl(profile.profilePicture)
    : null;

  // XP + level data
  const xpEvents = await ctx.db
    .query("xpEvents")
    .withIndex("by_user", (q) => q.eq("userId", profile.userId))
    .collect();
  const totalXp = xpEvents.reduce((sum, e) => sum + e.xpAmount, 0);
  const levelData = xpToLevel(totalXp);

  // Badges
  const badges = await ctx.db
    .query("badges")
    .withIndex("by_user", (q) => q.eq("userId", profile.userId))
    .collect();

  // Skills
  const skills = await ctx.db
    .query("skillProfiles")
    .withIndex("by_user", (q) => q.eq("userId", profile.userId))
    .collect();

  // Completed orders (verified work)
  const completedOrders = await ctx.db
    .query("orders")
    .withIndex("by_freelancer_and_status", (q) =>
      q.eq("freelancerId", profile.userId).eq("status", "completed")
    )
    .order("desc")
    .take(200);

  const projectCount = completedOrders.length;

  // On-time rate
  let onTimeCount = 0;
  for (const o of completedOrders) {
    if (!o.deadline || (o.submittedAt && o.submittedAt <= o.deadline)) onTimeCount++;
  }
  const onTimeRate = projectCount > 0 ? Math.round((onTimeCount / projectCount) * 100) : 100;

  // Repeat client rate
  const clientIds = completedOrders.map((o) => o.clientId.toString());
  const clientCounts: Record<string, number> = {};
  for (const cid of clientIds) clientCounts[cid] = (clientCounts[cid] || 0) + 1;
  const repeatClientCount = Object.values(clientCounts).filter((c) => c >= 2).length;
  const repeatClientRate = projectCount > 0 ? Math.round((repeatClientCount / Object.keys(clientCounts).length) * 100) : 0;

  // Recent completed projects (for portfolio section)
  const recentOrders = completedOrders.slice(0, 20);
  const completedProjects = await Promise.all(
    recentOrders.map(async (order) => {
      let category = "Direct Order";
      let skills: string[] = [];
      if (order.projectId) {
        const proj = await ctx.db.get(order.projectId);
        if (proj) { category = proj.category; skills = proj.skills || []; }
      } else if (order.gigId) {
        const gig = await ctx.db.get(order.gigId);
        if (gig) { category = gig.category; skills = gig.tags || []; }
      }

      const review = await ctx.db
        .query("reviews")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .filter((q) => q.eq(q.field("revieweeId"), profile.userId))
        .first();

      let clientName = "Client";
      if (!privacy.anonymizeClients) {
        const clientProf = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", order.clientId))
          .unique();
        if (clientProf) clientName = `${clientProf.firstName} ${clientProf.lastName}`;
      }

      return {
        _id: order._id,
        title: order.title,
        description: order.description,
        category,
        skills,
        completedAt: order.completedAt,
        isVerified: true, // only pulling completed (verified) orders
        review: review?.isPublic ? {
          rating: review.rating,
          comment: review.comment,
          clientName: privacy.anonymizeClients ? "Verified Client" : clientName,
        } : null,
      };
    })
  );

  // Public reviews
  const publicReviews = await ctx.db
    .query("reviews")
    .withIndex("by_reviewee", (q) => q.eq("revieweeId", profile.userId))
    .filter((q) => q.eq(q.field("isPublic"), true))
    .order("desc")
    .take(50);

  const reviews = await Promise.all(
    publicReviews.map(async (r) => {
      let reviewerName = "Verified Client";
      if (!privacy.anonymizeClients) {
        const rp = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", r.reviewerId))
          .unique();
        if (rp) reviewerName = `${rp.firstName} ${rp.lastName}`;
      }
      return { ...r, reviewerName };
    })
  );

  // Activity map (for contribution heatmap)
  const activityLogs = await ctx.db
    .query("activityLogs")
    .withIndex("by_user", (q) => q.eq("userId", profile.userId))
    .order("desc")
    .take(365);

  const activityMap: Record<string, number> = {};
  for (const log of activityLogs) {
    if (!log.timestamp) continue;
    const dateStr = new Date(log.timestamp).toISOString().split("T")[0];
    activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
  }

  // Strip sensitive fields — never expose financial data on public profile
  const {
    razorpayAccountId: _ra,
    razorpayStakeholderId: _rs,
    razorpayProductId: _rp,
    bankAccountHolderName: _bahn,
    bankIfsc: _bi,
    bankAccountLast4: _bl,
    payoutOnboardingStatus: _pos,
    bankDetailsUpdatedAt: _bdu,
    paypalMerchantId: _pm,
    ...safeProfile
  } = profile;

  return {
    profile: { ...safeProfile, profilePictureUrl },
    levelData: { ...levelData, totalXp },
    badges,
    skills: skills.sort((a, b) => b.proficiencyScore - a.proficiencyScore),
    stats: {
      projectCount,
      onTimeRate,
      repeatClientRate,
      avgRating: profile.averageRating ?? 0,
      totalReviews: profile.totalReviews ?? 0,
    },
    completedProjects,
    reviews,
    activityMap,
    privacy,
  };
}

// ─── Mutation: Update Public Profile Settings ─────────────────────────────────
export const updatePublicProfileSettings = mutation({
  args: {
    isPublicProfile: v.optional(v.boolean()),
    privacySettings: v.optional(v.object({
      showEarnings: v.boolean(),
      anonymizeClients: v.boolean(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");

    const updates: Record<string, unknown> = {};
    if (args.isPublicProfile !== undefined) updates.isPublicProfile = args.isPublicProfile;
    if (args.privacySettings !== undefined) updates.privacySettings = args.privacySettings;

    // Auto-generate publicSlug if enabling public profile and slug doesn't exist
    if (args.isPublicProfile && !profile.publicSlug) {
      const base = `${profile.firstName}-${profile.lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const shortId = profile._id.toString().slice(-6);
      updates.publicSlug = `${base}-${shortId}`;
    }

    await ctx.db.patch(profile._id, updates);
    return null;
  },
});

// ─── Query: Get My Progression Data (owner view) ─────────────────────────────
export const getMyProgression = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .unique();
    if (!profile) return null;

    const xpEvents = await ctx.db
      .query("xpEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();
    const totalXp = xpEvents.reduce((sum, e) => sum + e.xpAmount, 0);
    const levelData = xpToLevel(totalXp);

    const badges = await ctx.db
      .query("badges")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    const skills = await ctx.db
      .query("skillProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    // All badge types for "locked" display
    const allBadgeTypes = BADGE_RULES.map((r) => r.type);
    const earnedTypes = new Set(badges.map((b) => b.badgeType));
    const lockedBadges = allBadgeTypes.filter((t) => !earnedTypes.has(t));

    return {
      profile: {
        ...profile,
        profilePictureUrl: profile.profilePicture
          ? await ctx.storage.getUrl(profile.profilePicture)
          : null,
      },
      levelData: { ...levelData, totalXp },
      badges,
      lockedBadges,
      skills: skills.sort((a, b) => b.proficiencyScore - a.proficiencyScore),
      publicSlug: profile.publicSlug,
      isPublicProfile: profile.isPublicProfile ?? false,
      privacySettings: profile.privacySettings ?? { showEarnings: false, anonymizeClients: false },
    };
  },
});

// ─── Query: Get All Badge Definitions (for display) ──────────────────────────
export const getBadgeDefinitions = query({
  args: {},
  handler: async () => {
    return BADGE_RULES.map((r) => r.type);
  },
});
