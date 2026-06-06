import type { Id } from "../../convex/_generated/dataModel";

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  link?: string;
  image?: Id<"_storage"> | string;
  imageUrl?: string | null;
}

export interface AppProfile {
  _id?: Id<"profiles">;
  userId: Id<"users">;
  userType: "freelancer" | "client" | "admin";
  firstName: string;
  lastName: string;
  profilePicture?: Id<"_storage"> | string | null;
  profilePictureUrl?: string | null;
  bio?: string;
  tagline?: string;
  collegeName?: string;
  collegeEmail?: string;
  graduationYear?: number;
  skills?: string[];
  portfolioItems?: PortfolioItem[];
  isVerified?: boolean;
  isAdmin?: boolean;
  averageRating?: number;
  totalReviews?: number;
  company?: string;
  identity?: string;
  hiringPreferences?: string[];
  preferredCommunication?: string;
  website?: string;
  linkedin?: string;
  industry?: string;
  teamSize?: string;
  paymentVerified?: boolean;
  razorpayAccountId?: string;
  isPayoutReady?: boolean;
  payoutOnboardingStatus?: "not_started" | "pending" | "activated" | "failed";
  bankAccountHolderName?: string;
  bankIfsc?: string;
  bankAccountLast4?: string;
  bankDetailsUpdatedAt?: number;
}

export interface ChatOpenData {
  projectId?: Id<"projectRequests">;
  clientId: Id<"users">;
  freelancerId: Id<"users">;
}
