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

    // Fetch freelancers (In production, use a search index or limit this query)
    const freelancers = await ctx.db
      .query("profiles")
      .withIndex("by_type", q => q.eq("userType", "freelancer"))
      .collect();

    const scoredFreelancers = freelancers.map(f => {
      // 1. Skill Match (Weight: 50%)
      const skillScore = calculateSkillMatch(project.skills, f.skills || []);
      
      // 2. Rating (Weight: 20%) - Normalize 5 stars to 1.0
      const ratingScore = (f.averageRating || 0) / 5;
      
      // 3. Experience (Weight: 15%) - Cap at 10 reviews
      const experienceScore = Math.min((f.totalReviews || 0), 10) / 10;
      
      // 4. College Match (Weight: 15%) - Bonus for same college
      const collegeMatch = (clientProfile?.collegeName && f.collegeName && 
                            clientProfile.collegeName === f.collegeName) ? 1 : 0;

      const totalScore = 
        (skillScore * 50) + 
        (ratingScore * 20) + 
        (experienceScore * 15) + 
        (collegeMatch * 15);

      return { ...f, score: totalScore, matchDetails: { skillScore, collegeMatch } };
    });

    // Return top 5 matches
    return scoredFreelancers
      .filter(f => f.score > 10) // Filter out very poor matches
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

    // Fetch open projects
    const projects = await ctx.db
      .query("projectRequests")
      .withIndex("by_status", q => q.eq("status", "open"))
      .collect();

    const scoredProjects = projects.map(p => {
      // 1. Skill Match (Weight: 70%) - Most important for finding work
      const skillScore = calculateSkillMatch(p.skills, freelancerProfile.skills || []);
      
      // 2. Recency (Weight: 30%) - Newer projects are better
      // Decay over 7 days
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const timeDiff = Date.now() - p._creationTime;
      const recencyScore = Math.max(0, (oneWeek - timeDiff) / oneWeek);

      const totalScore = (skillScore * 70) + (recencyScore * 30);

      return { ...p, score: totalScore };
    });

    // Return top 10 matches
    return scoredProjects
      .filter(p => p.score > 15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
});