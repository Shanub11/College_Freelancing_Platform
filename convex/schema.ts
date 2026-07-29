import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles extending auth
  profiles: defineTable({
    userId: v.id("users"),
    userType: v.union(v.literal("freelancer"), v.literal("client"), v.literal("admin")),
    // Common fields
    firstName: v.string(),
    lastName: v.string(),
    profilePicture: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    tagline: v.optional(v.string()),
    // Freelancer specific fields
    collegeName: v.optional(v.string()),
    collegeEmail: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    studentId: v.optional(v.id("_storage")), // uploaded student ID for verification
    isVerified: v.boolean(),
    skills: v.optional(v.array(v.string())),
    portfolioItems: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      image: v.optional(v.id("_storage")),
      link: v.optional(v.string())
    }))),
    // Client specific fields
    paypalMerchantId: v.optional(v.string()), // To store the freelancer's PayPal Merchant ID
    razorpayAccountId: v.optional(v.string()), // Linked Razorpay Account ID (acc_...)
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
    identity: v.optional(v.string()), // Startup Founder, Student Founder, etc.
    hiringPreferences: v.optional(v.array(v.string())),
    preferredCommunication: v.optional(v.string()),
    website: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    industry: v.optional(v.string()),
    teamSize: v.optional(v.string()),
    paymentVerified: v.optional(v.boolean()),
    // Admin flag
    isAdmin: v.optional(v.boolean()),
    // Item 22: Tracks whether the user has verified their login email address
    // via OTP. Required for clients before they can place orders.
    emailVerified: v.optional(v.boolean()),
    // Ratings
    averageRating: v.optional(v.number()),
    totalReviews: v.number(),
    // === Profile Progression System ===
    // XP / Leveling (cached from xpEvents — never mutated directly)
    xp: v.optional(v.number()),
    level: v.optional(v.number()),
    tier: v.optional(v.union(
      v.literal("Newcomer"),
      v.literal("Rising Talent"),
      v.literal("Pro"),
      v.literal("Expert"),
      v.literal("Elite")
    )),
    // Public profile URL slug (e.g. platform.com/u/john-doe-abc1)
    publicSlug: v.optional(v.string()),
    // Whether this profile's public URL is visible to unauthenticated viewers
    isPublicProfile: v.optional(v.boolean()),
    // Privacy settings: controls what appears on the public profile
    privacySettings: v.optional(v.object({
      showEarnings: v.boolean(),      // false by default
      anonymizeClients: v.boolean(),  // false by default (hides client names)
    })),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["userType"])
    .index("by_verified", ["isVerified"])
    .index("by_college", ["collegeName"])
    .index("by_razorpayAccountId", ["razorpayAccountId"])
    .searchIndex("search_skills", {
      searchField: "skills",
      filterFields: ["userType", "isVerified", "collegeName"]
    }),
    // .index("by_paypalMerchantId", ["paypalMerchantId"]), // You can add this if needed for lookups

  // Service gigs posted by freelancers
  gigs: defineTable({
    freelancerId: v.id("users"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    tags: v.array(v.string()),
    basePrice: v.number(),
    deliveryTime: v.number(), // in days
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
  })
    .index("by_freelancer", ["freelancerId"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .searchIndex("search_gigs", {
      searchField: "title",
      filterFields: ["category", "isActive"]
    }),

  // Custom project requests from clients
  projectRequests: defineTable({
    clientId: v.id("users"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    // Temporarily accepts legacy { min, max } budget objects until
    // migrations:fixBudgets has normalized all rows to a single number.
    budget: v.optional(
      v.union(
        v.number(),
        v.object({
          min: v.optional(v.number()),
          max: v.optional(v.number()),
        })
      )
    ),
    deadline: v.number(), // timestamp
    skills: v.array(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed")
    ),
    selectedFreelancer: v.optional(v.id("users")),
    proposalCount: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .searchIndex("search_projects", {
      searchField: "title",
      filterFields: ["category", "status"]
    }),

  // Proposals for project requests
  proposals: defineTable({
    projectId: v.id("projectRequests"),
    freelancerId: v.id("users"),
    coverLetter: v.string(),
    proposedPrice: v.number(),
    deliveryTime: v.number(),
    attachments: v.optional(v.array(v.id("_storage"))),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("payment_pending")
    ),
  })
    .index("by_projectId", ["projectId"])
    .index("by_freelancer", ["freelancerId"])
    .index("by_status", ["status"])
    .index("by_project_and_freelancer", ["projectId", "freelancerId"]),

  // Notifications for users
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // e.g., 'new_proposal', 'message', 'order_update'
    message: v.string(),
    isRead: v.boolean(),
    link: v.optional(v.string()), // Link to the relevant page
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"]),

  // Orders/contracts
  orders: defineTable({
    clientId: v.id("users"),
    freelancerId: v.id("users"),
    gigId: v.optional(v.id("gigs")),
    projectId: v.optional(v.id("projectRequests")),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    platformFee: v.optional(v.number()),
    freelancerPayout: v.optional(v.number()),
    deliveryTime: v.number(),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("active"),
      v.literal("in_progress"), // Legacy
      v.literal("submitted"),
      v.literal("delivered"),
      v.literal("revision_requested"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed"),
      v.literal("late")
    ),
    deadline: v.optional(v.number()),
    deliverables: v.optional(v.array(v.id("_storage"))),
    deliveryMessage: v.optional(v.string()),
    deliveryLink: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
    submittedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
    revisionNotes: v.optional(v.string()),
    autoCompleteJobId: v.optional(v.id("_scheduled_functions")),
    // Soft delete — set instead of hard-deleting financial records.
    // Queries must filter deletedAt: undefined to exclude deleted records.
    deletedAt: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_freelancer", ["freelancerId"])
    .index("by_status", ["status"])
    .index("by_gig", ["gigId"])
    .index("by_client_and_status", ["clientId", "status"])
    .index("by_freelancer_and_status", ["freelancerId", "status"]),

  // Real-time messaging
  conversations: defineTable({
    clientId: v.id("users"),
    freelancerId: v.id("users"),
    projectId: v.optional(v.id("projectRequests")),
    lastMessage: v.optional(v.string()),
    updatedAt: v.number(),
    clientUnreadCount: v.optional(v.number()),
    freelancerUnreadCount: v.optional(v.number()),
    // Deterministic participant fields for deduplication.
    // participant1Id is always the lexicographically smaller userId,
    // participant2Id is always the larger. This guarantees a unique
    // pair regardless of who initiates the conversation.
    participant1Id: v.optional(v.id("users")),
    participant2Id: v.optional(v.id("users")),
  })
    .index("by_project_client_freelancer", ["projectId", "clientId", "freelancerId"])
    .index("by_client", ["clientId"])
    .index("by_freelancer", ["freelancerId"])
    .index("by_client_and_updated", ["clientId", "updatedAt"])
    .index("by_freelancer_and_updated", ["freelancerId", "updatedAt"])
    .index("by_participants", ["participant1Id", "participant2Id"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
    seen: v.boolean(),
    attachment: v.optional(v.id("_storage")),
    // Marks whether the text field is AES-256-GCM encrypted.
    // Legacy messages (isEncrypted: undefined or false) are plaintext.
    isEncrypted: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_seen", ["conversationId", "seen"]),

  // Reviews and ratings
  reviews: defineTable({
    orderId: v.id("orders"),
    reviewerId: v.id("users"), // client reviewing freelancer
    revieweeId: v.id("users"), // freelancer being reviewed
    rating: v.number(), // 1-5
    comment: v.string(),
    isPublic: v.boolean(),
  })
    .index("by_order", ["orderId"])
    .index("by_reviewee", ["revieweeId"])
    .index("by_reviewer", ["reviewerId"]),

  // Admin verification requests
  verificationRequests: defineTable({
    userId: v.id("users"),
    collegeEmail: v.string(),
    collegeName: v.string(),
    course: v.optional(v.string()),
    department: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    studentId: v.optional(v.id("_storage")),
    govtId: v.optional(v.id("_storage")), // Add field for government ID
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    adminNotes: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Email verifications for OTP
  emailVerifications: defineTable({
    email: v.string(),
    otp: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  }).index("by_email", ["email"]),

  // Categories for organization
  categories: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
    subcategories: v.array(v.string()),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"]),

  // Disputes for orders
  disputes: defineTable({
    projectId: v.optional(v.id("projectRequests")),
    orderId: v.optional(v.id("orders")),
    creatorId: v.id("users"),
    reason: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("resolved_refund"),
      v.literal("resolved_release"),
      v.literal("resolved_general")
    ),
    resolutionNotes: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    // Soft delete — never hard-delete dispute records.
    deletedAt: v.optional(v.number()),
  })
    .index("by_projectId", ["projectId"])
    .index("by_status", ["status"])
    .index("by_orderId", ["orderId"]),

  // Add the new 'payments' table
  payments: defineTable({
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.optional(v.string()),
    razorpayTransferId: v.optional(v.string()), // Transfer ID for Escrow release
    razorpayRefundId: v.optional(v.string()),
    amount: v.number(),
    status: v.union(
      v.literal("pending"), // Client needs to pay
      v.literal("funded"),  // Payment held in escrow
      v.literal("released"), // Paid out to freelancer
      v.literal("refunded")  // Refunded to client
    ),
    // Soft delete — never hard-delete payment records.
    deletedAt: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_razorpayOrderId", ["razorpayOrderId"]),

  razorpayWebhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
  }).index("by_eventId", ["eventId"]),

  // Activity Logs for Admin
  activityLogs: defineTable({
    action: v.string(),
    details: v.string(),
    userId: v.id("users"),
    timestamp: v.number(),
    relatedId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_user_and_action", ["userId", "action"]),

  // Dedicated rate limiting table — separate from activityLogs so admin
  // logs are not polluted with ratelimit:* entries.
  // Each record represents one "token" consumed for a rate-limited action.
  // Records are cleaned up automatically when they fall outside the window.
  rateLimits: defineTable({
    userId: v.id("users"),
    action: v.string(),       // e.g. "message_send", "proposal_submit"
    timestamp: v.number(),    // when this token was consumed (ms since epoch)
  })
    .index("by_user_and_action", ["userId", "action"])
    .index("by_timestamp", ["timestamp"]),

  // Contact form submissions (public & authenticated)
  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    projectId: v.optional(v.string()),   // optional project/order reference
    userId: v.optional(v.id("users")),   // populated if user is logged in
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved")
    ),
    source: v.union(
      v.literal("landing"),        // submitted from landing page (unauthenticated)
      v.literal("dashboard")       // submitted from within the app (authenticated)
    ),
    adminNote: v.optional(v.string()),   // internal note added by admin
    resolvedAt: v.optional(v.number()), // epoch ms when marked resolved
  })
    .index("by_status", ["status"])
    .index("by_email", ["email"])
    .index("by_userId", ["userId"]),

  // === Profile Progression System Tables ===

  // XP event audit log — the single source of truth for all XP.
  // Level and tier on the profiles table are DERIVED from this table.
  // Never award XP from self-reported or unverified data.
  xpEvents: defineTable({
    userId: v.id("users"),
    // Event type driving this XP award
    eventType: v.union(
      v.literal("project_completed"),    // 100 XP — only from verified completed orders
      v.literal("five_star_review"),      // 50 XP — rating == 5 from a verified order
      v.literal("on_time_delivery"),      // 25 XP — submittedAt <= deadline
      v.literal("repeat_client"),         // 30 XP — same clientId placed 2+ orders
      v.literal("profile_completed")     // 50 XP — one-time, profile fields all filled
    ),
    xpAmount: v.number(),
    // Optional reference to the order/review that triggered this event
    sourceId: v.optional(v.string()),
    createdAt: v.number(), // epoch ms
  })
    .index("by_user", ["userId"])
    .index("by_user_and_event", ["userId", "eventType"])
    .index("by_createdAt", ["createdAt"]),

  // Earned achievement badges per user.
  // Badge rules are evaluated at the backend; never grant badges from self-reported data.
  badges: defineTable({
    userId: v.id("users"),
    badgeType: v.union(
      v.literal("first_project"),
      v.literal("ten_projects"),
      v.literal("fifty_projects"),
      v.literal("top_rated"),
      v.literal("on_time_streak"),
      v.literal("rising_talent"),
      v.literal("repeat_client_magnet"),
      v.literal("elite_freelancer")
    ),
    earnedAt: v.number(), // epoch ms
    // Snapshot of the stats that triggered the badge (for auditability)
    criteriaMeta: v.optional(v.object({
      projectCount: v.optional(v.number()),
      avgRating: v.optional(v.number()),
      onTimeRate: v.optional(v.number()),
      repeatClientCount: v.optional(v.number()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_type", ["userId", "badgeType"]),

  // Aggregated skill data per user, derived ONLY from verified completed orders.
  // A skill becomes verified when it appears in SKILL_VERIFIED_MIN_PROJECTS
  // verified projects with average rating >= SKILL_VERIFIED_MIN_RATING.
  skillProfiles: defineTable({
    userId: v.id("users"),
    skillName: v.string(),
    // Total times this skill appears across ALL completed orders (verified + unverified)
    totalProjectCount: v.number(),
    // Times this skill appears in VERIFIED (platform-paid, client-confirmed) completed orders
    verifiedProjectCount: v.number(),
    // Average rating of verified orders where this skill was used
    avgVerifiedRating: v.optional(v.number()),
    // true only when verifiedProjectCount >= SKILL_VERIFIED_MIN_PROJECTS
    // AND avgVerifiedRating >= SKILL_VERIFIED_MIN_RATING
    isVerified: v.boolean(),
    // 0–100 proficiency score derived from count and rating
    proficiencyScore: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_skill", ["userId", "skillName"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
