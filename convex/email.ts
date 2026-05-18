"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

declare const process: any;

// Email templates for each notification type.
// All emails are sent via Brevo (formerly Sendinblue).
// BREVO_API_KEY must be set in Convex environment variables.

const FROM_EMAIL = "notifications@collegegig.in";
const FROM_NAME = "CollegeGig";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendBrevoEmail(
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  if (!process.env.CONVEX_SITE_URL) {
    console.warn(
      "[Email] CONVEX_SITE_URL is not set in Convex env vars. " +
      "Email CTA links will use the hardcoded fallback URL. " +
      "Set CONVEX_SITE_URL in Convex Dashboard → Settings → Environment Variables."
    );
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // In development without Brevo key, log the email instead of failing.
    console.log(
      `[DEV EMAIL] To: ${toEmail} | Subject: ${subject} | Body: ${htmlContent}`
    );
    return;
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Log but do not throw — email failure should never crash the main flow.
    console.error(
      `[Brevo] Failed to send email to ${toEmail}. ` +
      `Status: ${response.status}. Error: ${errorText}`
    );
  }
}

function baseTemplate(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl && ctaLabel
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${ctaUrl}" 
           style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;
                  text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
          ${ctaLabel}
        </a>
       </div>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" 
                 style="background:#fff;border-radius:12px;overflow:hidden;
                        box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
            <!-- Header -->
            <tr>
              <td style="background:#2563eb;padding:24px 32px;">
                <span style="color:#fff;font-size:22px;font-weight:700;">CollegeGig</span>
              </td>
            </tr>
            <!-- Title -->
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <h1 style="margin:0;font-size:22px;color:#111827;font-weight:700;">${title}</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:16px 32px 0 32px;font-size:15px;color:#374151;line-height:1.7;">
                ${bodyHtml}
              </td>
            </tr>
            <!-- CTA -->
            <tr><td>${cta}</td></tr>
            <!-- Footer -->
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #e5e7eb;margin-top:32px;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  You received this email because you have an account on CollegeGig.<br>
                  &copy; 2025 CollegeGig. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

// ─── Exported Email Actions ────────────────────────────────────────────────

export const sendNewProposalEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    projectTitle: v.string(),
    freelancerName: v.string(),
    proposedPrice: v.number(),
    projectId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const subject = `New proposal on "${args.projectTitle}"`;
    const body = `
      <p>Hi ${args.toName},</p>
      <p>
        <strong>${args.freelancerName}</strong> has submitted a proposal for your project
        <strong>"${args.projectTitle}"</strong>.
      </p>
      <table style="background:#f9fafb;border-radius:8px;padding:16px;width:100%;margin:16px 0;">
        <tr>
          <td style="color:#6b7280;font-size:14px;">Proposed Price</td>
          <td style="font-weight:700;color:#111827;text-align:right;">
            ₹${args.proposedPrice.toLocaleString("en-IN")}
          </td>
        </tr>
      </table>
      <p>Log in to review the proposal, read their cover letter, and accept or reject it.</p>
    `;
    const siteUrl = process.env.CONVEX_SITE_URL || "https://www.collegegig.in";
    await sendBrevoEmail(
      args.toEmail,
      args.toName,
      subject,
      baseTemplate(
        "You have a new proposal!",
        body,
        `${siteUrl}/dashboard`,
        "View Proposal"
      )
    );
    return null;
  },
});

export const sendProposalAcceptedEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    projectTitle: v.string(),
    agreedPrice: v.number(),
    orderId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const subject = `Your proposal for "${args.projectTitle}" was accepted!`;
    const body = `
      <p>Hi ${args.toName},</p>
      <p>Great news! Your proposal for <strong>"${args.projectTitle}"</strong> has been accepted.</p>
      <table style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                    padding:16px;width:100%;margin:16px 0;">
        <tr>
          <td style="color:#166534;font-size:14px;">Agreed Price</td>
          <td style="font-weight:700;color:#166534;text-align:right;">
            ₹${args.agreedPrice.toLocaleString("en-IN")}
          </td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:14px;padding-top:8px;">Your Payout</td>
          <td style="font-weight:700;color:#166534;text-align:right;padding-top:8px;">
            ₹${Math.round(args.agreedPrice * 0.9).toLocaleString("en-IN")}
          </td>
        </tr>
      </table>
      <p>
        The client is completing payment. Once payment is confirmed, your order will 
        activate and the clock starts. Log in to check the status.
      </p>
    `;
    const siteUrl = process.env.CONVEX_SITE_URL || "https://www.collegegig.in";
    await sendBrevoEmail(
      args.toEmail,
      args.toName,
      subject,
      baseTemplate(
        "Proposal Accepted 🎉",
        body,
        `${siteUrl}/dashboard`,
        "View My Orders"
      )
    );
    return null;
  },
});

export const sendOrderSubmittedEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    orderTitle: v.string(),
    freelancerName: v.string(),
    orderId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const subject = `Work submitted for "${args.orderTitle}" — your review needed`;
    const body = `
      <p>Hi ${args.toName},</p>
      <p>
        <strong>${args.freelancerName}</strong> has submitted their work for your order
        <strong>"${args.orderTitle}"</strong>.
      </p>
      <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;
                  padding:16px;margin:16px 0;">
        <p style="margin:0;color:#713f12;font-weight:600;">⏰ Action required within 3 days</p>
        <p style="margin:8px 0 0 0;color:#92400e;font-size:14px;">
          If you do not respond within 3 days the order will be automatically approved 
          and funds will be released to the freelancer.
        </p>
      </div>
      <p>Log in to review the delivery, request revisions, or approve and release funds.</p>
    `;
    const siteUrl = process.env.CONVEX_SITE_URL || "https://www.collegegig.in";
    await sendBrevoEmail(
      args.toEmail,
      args.toName,
      subject,
      baseTemplate(
        "Work has been submitted for your review",
        body,
        `${siteUrl}/dashboard`,
        "Review Delivery"
      )
    );
    return null;
  },
});

export const sendDisputeOpenedEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    disputeReason: v.string(),
    projectTitle: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const subject = "A support ticket has been opened on your account";
    const body = `
      <p>Hi ${args.toName},</p>
      <p>
        A support ticket has been opened 
        ${args.projectTitle ? `for project <strong>"${args.projectTitle}"</strong>` : ""}.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;
                  padding:16px;margin:16px 0;">
        <p style="margin:0;color:#7f1d1d;font-weight:600;">Reason provided:</p>
        <p style="margin:8px 0 0 0;color:#991b1b;font-size:14px;">${args.disputeReason}</p>
      </div>
      <p>
        Our admin team will review this ticket and contact both parties. 
        Please log in to check for updates.
      </p>
    `;
    const siteUrl = process.env.CONVEX_SITE_URL || "https://www.collegegig.in";
    await sendBrevoEmail(
      args.toEmail,
      args.toName,
      subject,
      baseTemplate(
        "Support Ticket Opened",
        body,
        `${siteUrl}/dashboard`,
        "View Dashboard"
      )
    );
    return null;
  },
});

export const sendPaymentReceivedEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    orderTitle: v.string(),
    amount: v.number(),
    clientName: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const subject = `Payment confirmed — "${args.orderTitle}" is now active`;
    const payout = Math.round(args.amount * 0.9);
    const body = `
      <p>Hi ${args.toName},</p>
      <p>
        Payment has been confirmed for your order 
        <strong>"${args.orderTitle}"</strong> from 
        <strong>${args.clientName}</strong>. Your order is now active!
      </p>
      <table style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                    padding:16px;width:100%;margin:16px 0;">
        <tr>
          <td style="color:#166534;font-size:14px;">Order Value</td>
          <td style="font-weight:700;color:#166534;text-align:right;">
            ₹${args.amount.toLocaleString("en-IN")}
          </td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:14px;padding-top:8px;">
            Your Payout (after 10% fee)
          </td>
          <td style="font-weight:700;color:#166534;text-align:right;padding-top:8px;">
            ₹${payout.toLocaleString("en-IN")}
          </td>
        </tr>
      </table>
      <p>Log in to view the full order requirements and start working.</p>
    `;
    const siteUrl = process.env.CONVEX_SITE_URL || "https://www.collegegig.in";
    await sendBrevoEmail(
      args.toEmail,
      args.toName,
      subject,
      baseTemplate(
        "Payment Received — Start Working! 🚀",
        body,
        `${siteUrl}/dashboard`,
        "View My Orders"
      )
    );
    return null;
  },
});
