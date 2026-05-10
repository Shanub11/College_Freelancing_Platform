import { mutation } from "./_generated/server";

export const fixBudgets = mutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projectRequests").collect();
    let count = 0;
    
    for (const project of projects) {
      // Check if budget is an object containing min/max
      if (project.budget && typeof project.budget === "object") {
        const flatBudget = project.budget.max || project.budget.min || 0;
        await ctx.db.patch(project._id, { budget: flatBudget });
        count++;
      }
    }
    return `Successfully updated ${count} old projects.`;
  },
});