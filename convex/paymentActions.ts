"use node";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal as internalApi } from "./_generated/api";
import Razorpay from "razorpay";
import { getAuthUserId } from "@convex-dev/auth/server";

declare const process: any;

const internal = internalApi as any;

const DEFAULT_ROUTE_BUSINESS_MODEL =
  "Freelance student services provided through the CollegeGig marketplace.";

function createRazorpayClient(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay API keys are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Convex Dashboard.");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

async function releaseEscrowByPaymentId(ctx: any, paymentId: string) {
  const payment = await ctx.runQuery(internal.payments.getPayment, {
    paymentId,
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "funded") {
    throw new Error("Payment is not funded or has already been released");
  }

  const { freelancerProfile, order } = await ctx.runQuery(internal.payments.getOrderAndFreelancer, {
    orderId: payment.orderId,
  });

  if (!freelancerProfile?.razorpayAccountId) {
    throw new Error("Freelancer has not connected a payout account");
  }

  if (!freelancerProfile.isPayoutReady) {
    throw new Error("Freelancer payout account is still pending Razorpay approval");
  }

  if (!order.freelancerPayout) {
    throw new Error("Freelancer payout is missing for this order");
  }

  const razorpay = createRazorpayClient();

  await razorpay.transfers.create({
    account: freelancerProfile.razorpayAccountId,
    amount: Math.round(order.freelancerPayout * 100),
    currency: "INR",
  });

  await ctx.runMutation(internal.payments.markAsReleased, {
    paymentId,
  });
}

export const createRazorpayOrder = action({
  args: { orderId: v.id("orders") },
  returns: v.string(),
  handler: async (ctx, args) => {
    // 1. Get the order details to ensure correct price
    const { order, freelancerProfile } = await ctx.runQuery(internal.payments.getOrderAndFreelancer, {
      orderId: args.orderId,
    });

    if (!order) throw new Error("Order not found");
    if (!freelancerProfile?.isPayoutReady) {
      throw new Error("This freelancer is still completing Razorpay payout verification. Please choose a payout-ready freelancer.");
    }

    // 2. Initialize Razorpay
    const razorpay = createRazorpayClient();

    try {
      // 3. Create order on Razorpay
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.price * 100), // Amount in paise must be a strict integer
        currency: "INR",
        receipt: args.orderId,
      });
  
      // 4. Save the payment record in DB
      await ctx.runMutation(internal.payments.createPaymentRecord, {
        orderId: args.orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: order.price,
      });
  
      return razorpayOrder.id;
    } catch (error: any) {
      console.error("Razorpay Error:", error);
      throw new Error(`Razorpay failed: ${JSON.stringify(error)}`);
    }
  },
});

export const onboardFreelancer = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const razorpay = createRazorpayClient();

    const account: any = await razorpay.accounts.create({
      email: args.email,
      legal_business_name: args.name,
      type: "route",
    } as any);

    await ctx.runMutation(internal.payments.saveFreelancerAccountId, {
      userId: args.userId,
      razorpayAccountId: account.id,
    });

    return account.id;
  },
});

export const releaseEscrow = action({
  args: { paymentId: v.id("payments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const payment = await ctx.runQuery(internal.payments.getPayment, {
      paymentId: args.paymentId,
    });

    if (!payment) throw new Error("Payment not found");

    const { freelancerProfile, order } = await ctx.runQuery(internal.payments.getOrderAndFreelancer, {
      orderId: payment.orderId,
    });

    const isAdmin = await ctx.runQuery(internal.adminHelpers.checkIsAdminById, {
      userId,
    });
    if (order.clientId !== userId && !isAdmin) {
      throw new Error("Unauthorized: only the client or an admin can release escrow");
    }

    await releaseEscrowByPaymentId(ctx, args.paymentId);
    return null;
  },
});

export const saveBankDetailsAndStartRouteOnboarding = action({
  args: {
    accountHolderName: v.string(),
    ifsc: v.string(),
    accountNumber: v.string(),
    stakeholderPhone: v.string(),
    stakeholderPan: v.string(),
  },
  returns: v.object({
    razorpayAccountId: v.string(),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const accountHolderName = args.accountHolderName.trim();
    const ifsc = args.ifsc.trim().toUpperCase();
    const accountNumber = args.accountNumber.replace(/\s+/g, "");
    const stakeholderPhone = args.stakeholderPhone.replace(/\D/g, "");
    const stakeholderPan = args.stakeholderPan.trim().toUpperCase();

    if (accountHolderName.length < 3 || accountHolderName.length > 120) {
      throw new Error("Account holder name must be between 3 and 120 characters.");
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new Error("Enter a valid 11-character IFSC code.");
    }
    if (!/^\d{5,35}$/.test(accountNumber)) {
      throw new Error("Enter a valid bank account number.");
    }
    if (!/^\d{8,15}$/.test(stakeholderPhone)) {
      throw new Error("Enter a valid phone number without country code.");
    }
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(stakeholderPan)) {
      throw new Error("Enter a valid PAN.");
    }

    const { profile, user } = await ctx.runQuery(
      internal.payments.getFreelancerPayoutProfile,
      { userId }
    );

    if (!profile) throw new Error("Profile not found");
    if (profile.userType !== "freelancer") {
      throw new Error("Only freelancers can configure payout details");
    }
    if (!user?.email) {
      throw new Error("Your account email is required before payout onboarding can start.");
    }

    const razorpay = createRazorpayClient();
    const businessName = accountHolderName;
    const displayName = `${profile.firstName} ${profile.lastName}`.trim() || businessName;
    const accountPayload = {
      email: user.email,
      phone: stakeholderPhone,
      type: "route",
      legal_business_name: businessName,
      customer_facing_business_name: displayName,
      business_type: process.env.RAZORPAY_ROUTE_BUSINESS_TYPE || "individual",
      contact_name: displayName,
      profile: {
        category: process.env.RAZORPAY_ROUTE_CATEGORY || "education",
        subcategory: process.env.RAZORPAY_ROUTE_SUBCATEGORY || "e-learning",
        business_model: process.env.RAZORPAY_ROUTE_BUSINESS_MODEL || DEFAULT_ROUTE_BUSINESS_MODEL,
      },
      notes: {
        userId,
        platform: "CollegeGig",
      },
    };

    let accountId = profile.razorpayAccountId as string | undefined;
    try {
      if (accountId) {
        await razorpay.accounts.edit(accountId, accountPayload as any);
      } else {
        const account: any = await razorpay.accounts.create(accountPayload as any);
        accountId = account.id;
      }
      if (!accountId) {
        throw new Error("Razorpay did not return a linked account ID.");
      }

      let stakeholderId = profile.razorpayStakeholderId as string | undefined;
      const stakeholderPayload = {
        name: accountHolderName,
        email: user.email,
        phone: {
          primary: stakeholderPhone,
        },
        kyc: {
          pan: stakeholderPan,
        },
        relationship: {
          executive: true,
          director: true,
        },
        percentage_ownership: 100,
        notes: {
          userId,
          platform: "CollegeGig",
        },
      };

      if (!stakeholderId) {
        try {
          const stakeholders: any = await razorpay.stakeholders.all(accountId);
          stakeholderId = stakeholders?.items?.[0]?.id;
        } catch (error) {
          console.warn("Could not fetch existing Razorpay stakeholders:", error);
        }
      }

      if (stakeholderId) {
        await razorpay.stakeholders.edit(accountId, stakeholderId, stakeholderPayload as any);
      } else {
        const stakeholder: any = await razorpay.stakeholders.create(
          accountId,
          stakeholderPayload as any
        );
        stakeholderId = stakeholder.id;
      }

      let productId = profile.razorpayProductId as string | undefined;
      if (!productId) {
        const product: any = await razorpay.products.requestProductConfiguration(
          accountId,
          {
            product_name: "route",
            tnc_accepted: true,
          } as any
        );
        productId = product.id;
      }
      if (!productId) {
        throw new Error("Razorpay did not return a Route product ID.");
      }

      await razorpay.products.edit(
        accountId,
        productId,
        {
          settlements: {
            account_number: accountNumber,
            ifsc_code: ifsc,
            beneficiary_name: accountHolderName,
          },
          tnc_accepted: true,
        } as any
      );

      const status = "pending";

      await ctx.runMutation(internal.payments.saveFreelancerPayoutOnboarding, {
        userId,
        accountHolderName,
        ifsc,
        accountNumberLast4: accountNumber.slice(-4),
        razorpayAccountId: accountId,
        razorpayStakeholderId: stakeholderId,
        razorpayProductId: productId,
        status,
      });

      return {
        razorpayAccountId: accountId,
        status,
      };
    } catch (error: any) {
      if (accountId) {
        await ctx.runMutation(internal.payments.saveFreelancerPayoutOnboarding, {
          userId,
          accountHolderName,
          ifsc,
          accountNumberLast4: accountNumber.slice(-4),
          razorpayAccountId: accountId,
          status: "failed",
        });
      }

      console.error("Razorpay Route onboarding failed:", error);
      const description =
        error?.error?.description ||
        error?.description ||
        error?.message ||
        "Razorpay Route onboarding failed.";
      throw new Error(description);
    }
  },
});

export const releaseEscrowForDispute = internalAction({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.runQuery(internal.payments.getPaymentByOrderId, {
      orderId: args.orderId,
    });
    if (!payment) throw new Error("Payment not found for order");

    await releaseEscrowByPaymentId(ctx, payment._id);
    return null;
  },
});

export const refundPaymentForDispute = internalAction({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.runQuery(internal.payments.getPaymentByOrderId, {
      orderId: args.orderId,
    });
    if (!payment) throw new Error("Payment not found for order");
    if (payment.status !== "funded") {
      throw new Error("Only funded payments can be refunded from a dispute");
    }
    if (!payment.razorpayPaymentId) {
      throw new Error("Razorpay payment ID is missing; cannot issue refund");
    }

    const razorpay = createRazorpayClient();
    const refund: any = await razorpay.payments.refund(
      payment.razorpayPaymentId,
      {
        amount: Math.round(payment.amount * 100),
      } as any
    );

    await ctx.runMutation(internal.payments.markAsRefunded, {
      paymentId: payment._id,
      razorpayRefundId: refund?.id,
    });

    return null;
  },
});
