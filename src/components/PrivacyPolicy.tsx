import { useEffect } from "react";
import { Link } from "react-router-dom";

export function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border py-10">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">Privacy Policy</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Last updated: July 14, 2026 &nbsp;|&nbsp; Effective: July 14, 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-8 md:p-12 space-y-10 text-gray-700 dark:text-gray-300 leading-relaxed">

          {/* Intro */}
          <section>
            <p className="text-base">
              CollegeGig ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy
              explains what personal data we collect, how we use it, and your rights regarding that data when
              you use our platform at <strong>collegegig.in</strong>. We comply with India's
              Information Technology Act, 2000 and its associated rules.
            </p>
          </section>

          {/* 1. Data We Collect */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Data We Collect</h2>
            <p className="text-sm mb-3">We collect the following categories of personal data:</p>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Account Data</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Full name, email address, profile picture</li>
                  <li>User type (Freelancer or Client), college name, graduation year</li>
                  <li>Bio, skills, portfolio items, company name</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Verification Documents (Freelancers Only)</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Student ID card (image)</li>
                  <li>Government-issued ID (Aadhaar, Passport, or Driving License — image only)</li>
                  <li>College email address (verified via OTP)</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Financial Data (Freelancers Only)</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Bank account holder name, IFSC code, last 4 digits of account number</li>
                  <li>PAN card number (shared directly with Razorpay for KYC)</li>
                  <li>Razorpay linked account identifiers</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Usage & Transaction Data</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Projects posted, proposals submitted, gigs created</li>
                  <li>Order history, payment status, delivery messages</li>
                  <li>Messages and file attachments exchanged within the platform</li>
                  <li>Reviews and ratings you submit or receive</li>
                  <li>Activity logs for security and audit purposes</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Technical Data</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>IP address, browser type, operating system (via Sentry error reporting)</li>
                  <li>Usage patterns and page interactions (via PostHog analytics)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Data */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>To operate the Platform:</strong> Creating accounts, matching freelancers with projects, processing orders and payments.</li>
              <li><strong>To verify identity:</strong> Reviewing student and government IDs to ensure freelancers are genuine college students. Documents are reviewed by administrators and then stored securely.</li>
              <li><strong>To process payments:</strong> Sharing KYC data (name, PAN, bank details) with Razorpay to facilitate escrow and payouts in compliance with RBI regulations.</li>
              <li><strong>To ensure safety:</strong> Monitoring messages and content for off-platform contact sharing, fraud, and policy violations.</li>
              <li><strong>To send communications:</strong> Transactional emails about orders, proposals, and account status. We do not send unsolicited marketing emails without your consent.</li>
              <li><strong>To improve the Platform:</strong> Aggregated, anonymized analytics to understand usage patterns.</li>
              <li><strong>To comply with law:</strong> Responding to lawful requests from Indian regulatory or law enforcement authorities.</li>
            </ul>
          </section>

          {/* 3. Data Sharing */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Data Sharing</h2>
            <p className="text-sm mb-3">We do <strong>not</strong> sell your personal data. We share data only with:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Razorpay:</strong> For payment processing, escrow, and freelancer payouts. Razorpay's privacy policy applies to data they process.</li>
              <li><strong>Convex (database/backend):</strong> Our application backend stores all platform data. Data is stored in secure cloud infrastructure.</li>
              <li><strong>Sentry:</strong> Error and performance monitoring. May capture anonymized technical data including stack traces.</li>
              <li><strong>PostHog:</strong> Product analytics (anonymized usage data only).</li>
              <li><strong>Other Users:</strong> Your public profile (name, skills, bio, portfolio, reviews) is visible to other registered users. Financial and verification document details are never visible to other users.</li>
              <li><strong>Law Enforcement:</strong> When required by applicable Indian law, court order, or government request.</li>
            </ul>
          </section>

          {/* 4. Data Retention */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Account data is retained while your account is active and for 3 years after deletion for legal/audit purposes.</li>
              <li>Verification documents are retained for the life of the account and 5 years after deletion to comply with KYC regulations.</li>
              <li>Payment and transaction records are retained for 7 years to comply with Indian financial regulations.</li>
              <li>Chat messages are retained for 2 years from creation.</li>
            </ul>
          </section>

          {/* 5. Security */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Security</h2>
            <p className="text-sm">
              We implement industry-standard security measures including encrypted data transmission (TLS),
              server-side authentication on all database operations, rate limiting on sensitive endpoints,
              and access controls restricting admin privileges. Messages are encrypted at rest.
              Despite these measures, no system is 100% secure. Please use a strong, unique password and
              report any suspected security issues to <a href="mailto:security@collegegig.in" className="text-primary-600 hover:underline">security@collegegig.in</a>.
            </p>
          </section>

          {/* 6. Your Rights */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Your Rights</h2>
            <p className="text-sm mb-3">Under applicable Indian law, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate personal data.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and personal data (subject to legal retention requirements).</li>
              <li><strong>Grievance Redressal:</strong> Lodge a complaint with our Grievance Officer (see below).</li>
            </ul>
            <p className="text-sm mt-3">
              To exercise these rights, email us at <a href="mailto:privacy@collegegig.in" className="text-primary-600 hover:underline">privacy@collegegig.in</a>.
              We will respond within 30 days.
            </p>
          </section>

          {/* 7. Cookies */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Cookies & Tracking</h2>
            <p className="text-sm">
              We use cookies and local storage for session management and authentication. We use PostHog
              for product analytics. You may disable cookies in your browser settings, but this may affect
              Platform functionality. We do not use advertising cookies or sell data to advertisers.
            </p>
          </section>

          {/* 8. Children */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Users Under 18</h2>
            <p className="text-sm">
              CollegeGig is intended for users who are 18 years of age or older. If you are under 18, you
              must obtain verifiable parental or guardian consent before using the Platform. We do not
              knowingly collect data from children under 13. If we discover we have inadvertently collected
              data from a child under 13, we will delete it promptly.
            </p>
          </section>

          {/* 9. Grievance Officer */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">9. Grievance Officer</h2>
            <p className="text-sm mb-3">
              In accordance with the Information Technology Act 2000 and associated rules, we designate a
              Grievance Officer to address any concerns or complaints:
            </p>
            <div className="bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4 text-sm space-y-1">
              <p><strong>Grievance Officer: CollegeGig Team</strong></p>
              <p>Email: <a href="mailto:grievance@collegegig.in" className="text-primary-600 hover:underline">grievance@collegegig.in</a></p>
              <p>Response time: within 30 days of receipt</p>
            </div>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">10. Changes to This Policy</h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. Material changes will be notified via
              email or a prominent notice on the Platform at least 7 days before they take effect.
              Continued use of the Platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <div className="border-t border-gray-200 dark:border-dark-border pt-6 flex flex-col sm:flex-row gap-4">
            <Link to="/terms" className="text-primary-600 hover:underline text-sm font-medium">
              Terms of Service →
            </Link>
            <Link to="/contact" className="text-primary-600 hover:underline text-sm font-medium">
              Contact Us →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
