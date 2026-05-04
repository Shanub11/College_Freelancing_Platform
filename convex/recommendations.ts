import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper: Calculate Jaccard Similarity for skills (0 to 1)
function calculateSkillMatch(required: string[], available: string[]) {
  if (!required || required.length === 0) return 1; // No specific skills required
  if (!available || available.length === 0) return 0;
  
  const requiredSet = new Set(required.map(s => s.toLowerCase().trim()));
  const availableSet = new Set(available.map(s => s.toLowerCase().trim()));
  
  let matchCount = 0;
  for (const skill of requiredSet) {
    if (availableSet.has(skill)) {
      matchCount++;
    }
  }
  
  return matchCount / requiredSet.size;
}

// 🎯 A. Recommend Freelancers to Clients
export const getRecommendedFreelancers = query({
  args: { projectId: v.id("projectRequests") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];

    // Get client profile for college matching
    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", q => q.eq("userId", project.clientId))
      .unique();

    // 1. Fetch a bounded pool of relevant freelancers using the Search Index for performance
    let freelancers = [];
    if (project.skills && project.skills.length > 0) {
      const searchTerm = project.skills.join(" ");
      freelancers = await ctx.db
        .query("profiles")
        .withSearchIndex("search_skills", (q) =>
          q.search("skills", searchTerm).eq("userType", "freelancer").eq("isVerified", true)
        )
        .take(50);
    } else {
      freelancers = await ctx.db
        .query("profiles")
        .withIndex("by_type", q => q.eq("userType", "freelancer"))
        .filter((q) => q.eq(q.field("isVerified"), true))
        .take(50);
    }

    // 2. Score the fetched freelancers using advanced metrics
    const scoredFreelancers = await Promise.all(freelancers.map(async (f) => {
      // Fetch freelancer's order history
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_freelancer", q => q.eq("freelancerId", f.userId))
        .collect();

      let completed = 0, active = 0, cancelled = 0;
      for (const o of orders) {
        if (o.status === "completed") completed++;
        else if (o.status === "in_progress" || o.status === "active" || o.status === "pending_payment") active++;
        else if (o.status === "cancelled" || o.status === "disputed") cancelled++;
      }

      const totalResolved = completed + cancelled;
      
      const successRate = totalResolved > 0 ? completed / totalResolved : 1.0; // Default 100% if no history
      const availabilityScore = Math.max(0, 1 - (active / 5)); // Penalize if >= 5 active orders
      const ratingScore = (f.averageRating || 0) / 5;
      const responseTimeScore = f.averageRating ? 0.9 : 0.8; // Note: In a fully scaled app, aggregate real chat message deltas via CRON
      const skillScore = calculateSkillMatch(project.skills, f.skills || []);
      const experienceScore = Math.min((f.totalReviews || 0), 20) / 20; // Capped at 20 reviews
      const collegeMatch = (clientProfile?.collegeName && f.collegeName && 
                            clientProfile.collegeName === f.collegeName) ? 1 : 0;

      const totalScore = 
        (skillScore * 40) +          // Core competency
        (successRate * 15) +         // Project success rate
        (ratingScore * 15) +         // Historical review score
        (availabilityScore * 10) +   // Bandwidth to accept work
        (responseTimeScore * 10) +   // Responsiveness
        (experienceScore * 5) +      // Platform experience
        (collegeMatch * 5);          // Alumni connection

      return { ...f, score: totalScore };
    }));

    // Return top 5 matches
    return scoredFreelancers
      .filter(f => f.score > 20) // Filter out very poor matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
});

// 🎯 B. Recommend Projects to Freelancers
export const getRecommendedProjects = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const freelancerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", q => q.eq("userId", userId))
      .unique();

    if (!freelancerProfile || freelancerProfile.userType !== "freelancer") return [];

    // Fetch a bounded set of open projects using Search Index
    let projects = [];
    if (freelancerProfile.skills && freelancerProfile.skills.length > 0) {
      const searchTerm = freelancerProfile.skills.join(" ");
      projects = await ctx.db
        .query("projectRequests")
        .withSearchIndex("search_projects", q => 
          q.search("title", searchTerm).eq("status", "open")
        )
        .take(50);
    } else {
      projects = await ctx.db
        .query("projectRequests")
        .withIndex("by_status", q => q.eq("status", "open"))
        .order("desc")
        .take(50);
    }

    const scoredProjects = await Promise.all(projects.map(async p => {
      // 1. Skill Match (Weight: 50%)
      const skillScore = calculateSkillMatch(p.skills, freelancerProfile.skills || []);
      
      // 2. Recency (Weight: 20%) - Decay over 7 days
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const timeDiff = Date.now() - p._creationTime;
      const recencyScore = Math.max(0, (oneWeek - timeDiff) / oneWeek);

      // 3. Client Reliability (Weight: 30%) - Does this client actively hire?
      const clientOrders = await ctx.db
        .query("orders")
        .withIndex("by_client", q => q.eq("clientId", p.clientId))
        .collect();
        
      const clientSuccessScore = clientOrders.length > 0 ? 1.0 : 0.5; // Boost if they have hired before

      const totalScore = (skillScore * 50) + (recencyScore * 20) + (clientSuccessScore * 30);

      return { ...p, score: totalScore };
    }));

    // Return top 10 matches
    return scoredProjects
      .filter(p => p.score > 15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
});