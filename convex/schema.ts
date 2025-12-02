import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles extending auth
  profiles: defineTable({
    userId: v.id("users"),
    userType: v.union(v.literal("freelancer"), v.literal("client")),
    // Common fields
    firstName: v.string(),
    lastName: v.string(),
    profilePicture: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    // Freelancer specific fields
    collegeName: v.optional(v.string()),
    collegeEmail: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    studentId: v.optional(v.id("_storage")), // uploaded student ID for verification
    isVerified: v.boolean(),
    skills: v.optional(v.array(v.string())),
    portfolio: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
      image: v.optional(v.id("_storage")),
      url: v.optional(v.string())
    }))),
    // Client specific fields
    company: v.optional(v.string()),
    // Ratings
    averageRating: v.optional(v.number()),
    totalReviews: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_type", ["userType"])
    .index("by_verified", ["isVerified"])
    .index("by_college", ["collegeName"]),

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
    budget: v.object({
      min: v.number(),
      max: v.number()
    }),
    deadline: v.number(), // timestamp
    skills: v.array(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
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
      v.literal("rejected")
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
    deliveryTime: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("in_progress"),
      v.literal("delivered"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed")
    ),
    deliverables: v.optional(v.array(v.id("_storage"))),
    deliveryMessage: v.optional(v.string()),
    deliveredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_freelancer", ["freelancerId"])
    .index("by_status", ["status"])
    .index("by_gig", ["gigId"]),

  // Real-time messaging
  conversations: defineTable({
    participants: v.array(v.id("users")),
    orderId: v.optional(v.id("orders")),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    unreadCount: v.object({
      // userId -> count
    }),
  })
    .index("by_participants", ["participants"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
    isRead: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),

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
    studentId: v.optional(v.id("_storage")),
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

  // Categories for organization
  categories: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
    subcategories: v.array(v.string()),
    isActive: v.boolean(),
  })
    .index("by_active", ["isActive"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
