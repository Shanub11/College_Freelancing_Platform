"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal as internalApi } from "./_generated/api";
import Razorpay from "razorpay";

const internal = internalApi as any;

export const createRazorpayOrder = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // 1. Get the order details to ensure correct price
    const { order } = await ctx.runQuery(internal.payments.getOrderAndFreelancer, {
      orderId: args.orderId,
    });

    if (!order) throw new Error("Order not found");

    // 2. Initialize Razorpay
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay API keys are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Convex Dashboard.");
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    // 3. Create order on Razorpay
    const razorpayOrder = await razorpay.orders.create({
      amount: order.price * 100, // Amount in paise
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
  },
});

export const onboardFreelancer = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay API keys are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Convex Dashboard.");
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

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
  handler: async (ctx, args) => {
    const payment = await ctx.runQuery(internal.payments.getPayment, {
      paymentId: args.paymentId,
    });

    if (!payment) throw new Error("Payment not found");

    const { freelancerProfile } = await ctx.runQuery(internal.payments.getOrderAndFreelancer, {
      orderId: payment.orderId,
    });

    if (!freelancerProfile?.razorpayAccountId) {
      throw new Error("Freelancer has not connected a payout account");
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay API keys are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Convex Dashboard.");
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    await razorpay.transfers.create({
      account: freelancerProfile.razorpayAccountId,
      amount: payment.amount * 100,
      currency: "INR",
    });

    await ctx.runMutation(internal.payments.markAsReleased, {
      paymentId: args.paymentId,
    });
  },
});