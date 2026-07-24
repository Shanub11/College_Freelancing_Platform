import { useEffect } from "react";
import { Link } from "react-router-dom";

export function TermsOfService() {
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-2">Terms of Service</h1>
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
              Welcome to <strong>CollegeGig</strong> ("Platform", "we", "us", "our"), operated by CollegeGig
              (India). By accessing or using our website at <strong>collegegig.in</strong> or any related
              services, you ("User", "Client", "Freelancer") agree to be bound by these Terms of Service
              ("Terms"). Please read them carefully before using the Platform.
            </p>
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
              <strong>Important:</strong> If you do not agree to these Terms, you must not use CollegeGig.
            </p>
          </section>

          {/* 1. Eligibility */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Eligibility</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>You must be at least <strong>18 years of age</strong> to use the Platform. If you are under 18, you must obtain verifiable parental or guardian consent before registering.</li>
              <li>You must be currently enrolled in, or a recent graduate of, a recognized college or university in India to register as a Freelancer.</li>
              <li>You must provide accurate, current, and complete information during registration and keep your account information up to date.</li>
              <li>You may not use the Platform if you are barred from using it under applicable law.</li>
            </ul>
          </section>

          {/* 2. Account Registration */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Account Registration & Verification</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Freelancers must submit a valid government-issued ID and student ID for identity verification. Approval is at CollegeGig's sole discretion.</li>
              <li>You are solely responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</li>
              <li>You must immediately notify us of any unauthorized access to your account at <strong>support@collegegig.in</strong>.</li>
              <li>We reserve the right to reject, suspend, or terminate accounts that provide false information.</li>
            </ul>
          </section>

          {/* 3. Platform Rules */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Platform Rules & Prohibited Conduct</h2>
            <p className="text-sm mb-3">You agree <strong>not</strong> to:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Circumvent the Platform by communicating contact information (phone, email, WhatsApp, etc.) to conduct transactions off-platform.</li>
              <li>Post fraudulent projects, false reviews, or misleading information.</li>
              <li>Harass, threaten, or abuse other users.</li>
              <li>Upload or transmit malware, spam, or unauthorized advertising.</li>
              <li>Violate any applicable Indian or international laws including the IT Act 2000, PMLA, or IP laws.</li>
              <li>Create multiple accounts or misrepresent your identity.</li>
              <li>Attempt to manipulate the review or rating system.</li>
            </ul>
            <p className="text-sm mt-3">Violations may result in immediate account suspension and forfeiture of any funds held in escrow.</p>
          </section>

          {/* 4. Payments & Escrow */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Payments, Escrow & Platform Fees</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>All payments on CollegeGig are processed through <strong>Razorpay</strong> and held in escrow until the Client approves the delivered work.</li>
              <li>CollegeGig charges a <strong>10% platform service fee</strong> on each transaction, deducted from the Freelancer's payout.</li>
              <li>Clients pay the full agreed amount upfront. Funds are released to the Freelancer only upon explicit Client approval or after the 3-day auto-completion window.</li>
              <li>Refunds are issued only in cases of verified fraud or failed delivery as determined by CollegeGig's dispute resolution process.</li>
              <li>CollegeGig is not responsible for any taxes owed by Freelancers on their earnings. Freelancers are solely responsible for tax compliance.</li>
              <li>Payout processing is subject to Razorpay's terms and may take 2–5 business days.</li>
            </ul>
          </section>

          {/* 5. Disputes */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Dispute Resolution</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Disputes between Clients and Freelancers must be raised through the Platform's support ticket system within <strong>7 days</strong> of the delivery deadline.</li>
              <li>CollegeGig will review disputes and make a final decision within 14 business days. This decision is binding.</li>
              <li>CollegeGig reserves the right to refund the Client, release funds to the Freelancer, or split the escrow based on evidence provided.</li>
              <li>For unresolved disputes, parties may pursue resolution under the Indian Arbitration and Conciliation Act, 1996, in the jurisdiction of Bengaluru, Karnataka.</li>
            </ul>
          </section>

          {/* 6. IP */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Intellectual Property</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Upon full payment and release of escrow, ownership of all deliverables created by the Freelancer transfers to the Client, unless otherwise agreed in writing.</li>
              <li>Freelancers warrant that their work does not infringe any third-party intellectual property rights.</li>
              <li>The CollegeGig name, logo, and Platform code are owned by CollegeGig. You may not use our branding without prior written consent.</li>
            </ul>
          </section>

          {/* 7. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">7. Limitation of Liability</h2>
            <p className="text-sm">
              To the maximum extent permitted by law, CollegeGig's total liability to you for any claim arising
              out of or relating to these Terms or the Platform shall not exceed the amount of fees paid by you
              to CollegeGig in the 3 months preceding the claim. CollegeGig is not liable for indirect,
              incidental, consequential, or punitive damages.
            </p>
          </section>

          {/* 8. Termination */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">8. Termination</h2>
            <p className="text-sm">
              We may suspend or terminate your account at any time, with or without notice, for conduct that we
              believe violates these Terms or is harmful to other users, us, or third parties, or for any other
              reason at our discretion. You may delete your account at any time by contacting support. Active
              escrow funds will be handled according to our dispute resolution policy.
            </p>
          </section>

          {/* 9. Governing Law */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">9. Governing Law</h2>
            <p className="text-sm">
              These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
              jurisdiction of courts in <strong>Bengaluru, Karnataka, India</strong>.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">10. Contact Us</h2>
            <p className="text-sm">
              For any questions about these Terms, please contact us at:
            </p>
            <div className="mt-3 bg-gray-50 dark:bg-dark-surface-2 rounded-lg p-4 text-sm space-y-1">
              <p><strong>CollegeGig</strong></p>
              <p>Email: <a href="mailto:legal@collegegig.in" className="text-primary-600 hover:underline">legal@collegegig.in</a></p>
              <p>Support: <a href="mailto:support@collegegig.in" className="text-primary-600 hover:underline">support@collegegig.in</a></p>
            </div>
          </section>

          <div className="border-t border-gray-200 dark:border-dark-border pt-6 flex flex-col sm:flex-row gap-4">
            <Link to="/privacy" className="text-primary-600 hover:underline text-sm font-medium">
              Privacy Policy →
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
