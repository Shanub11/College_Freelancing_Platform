import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return categories;
  },
});

export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if categories already exist
    const existing = await ctx.db.query("categories").first();
    if (existing) return existing;

    const categories = [
      {
        name: "Web Development",
        description: "Frontend, backend, and full-stack development services",
        icon: "💻",
        subcategories: ["Frontend Development", "Backend Development", "Full-Stack Development", "WordPress", "E-commerce"],
        isActive: true,
      },
      {
        name: "Design",
        description: "Graphic design, UI/UX, and creative services",
        icon: "🎨",
        subcategories: ["Logo Design", "UI/UX Design", "Graphic Design", "Brand Identity", "Print Design"],
        isActive: true,
      },
      {
        name: "Writing & Content",
        description: "Content writing, copywriting, and editing services",
        icon: "✍️",
        subcategories: ["Content Writing", "Copywriting", "Technical Writing", "Editing & Proofreading", "Creative Writing"],
        isActive: true,
      },
      {
        name: "Video & Animation",
        description: "Video editing, animation, and multimedia services",
        icon: "🎬",
        subcategories: ["Video Editing", "Animation", "Motion Graphics", "Explainer Videos", "Social Media Videos"],
        isActive: true,
      },
      {
        name: "Tutoring & Education",
        description: "Academic tutoring and educational support",
        icon: "📚",
        subcategories: ["Math Tutoring", "Science Tutoring", "Language Tutoring", "Test Prep", "Assignment Help"],
        isActive: true,
      },
      {
        name: "Digital Marketing",
        description: "Social media, SEO, and online marketing services",
        icon: "📈",
        subcategories: ["Social Media Marketing", "SEO", "Content Marketing", "Email Marketing", "PPC Advertising"],
        isActive: true,
      },
      {
        name: "Data & Analytics",
        description: "Data analysis, research, and statistical services",
        icon: "📊",
        subcategories: ["Data Analysis", "Research", "Statistical Analysis", "Data Visualization", "Survey Design"],
        isActive: true,
      },
      {
        name: "Mobile Development",
        description: "iOS, Android, and cross-platform app development",
        icon: "📱",
        subcategories: ["iOS Development", "Android Development", "React Native", "Flutter", "App Design"],
        isActive: true,
      },
    ];

    for (const category of categories) {
      await ctx.db.insert("categories", category);
    }

    return categories.length;
  },
});
