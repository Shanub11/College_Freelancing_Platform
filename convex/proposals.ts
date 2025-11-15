import { v } from "convex/values";
import { query } from "./_generated/server";

export const getProposalWithDetails = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);

    if (!proposal) {
      return null;
    }

    const project = await ctx.db.get(proposal.projectId);

    if (!project) {
      throw new Error("Project not found for this proposal");
    }

    return {
      ...proposal,
      projectTitle: project.title,
      clientId: project.clientId,
      // We can enrich this with more data as needed, e.g., client/freelancer profiles
    };
  },
});