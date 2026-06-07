import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  MessageSquare,
  ChevronDown,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// lucide-react v1.17+ does not ship brand icons; use generic alternatives
import { Globe, ExternalLink, Share2 } from "lucide-react";

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export function ContactPage() {
  const user = useQuery(api.auth.loggedInUser);
  const submitContactForm = useMutation(api.contact.submitContactForm);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Pre-fill from logged-in user
  useEffect(() => {
    if (user) {
      if (user.name && !name) setName(user.name);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = "Full name is required.";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!subject) newErrors.subject = "Please select a subject.";

    if (!message.trim()) {
      newErrors.message = "Message is required.";
    } else if (message.trim().length < 20) {
      newErrors.message = "Message must be at least 20 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await submitContactForm({
        name: name.trim(),
        email: email.trim(),
        subject,
        message: message.trim(),
        projectId: projectId.trim() || undefined,
        source: user ? "dashboard" : "landing",
      });
      setIsSubmitted(true);
    } catch {
      setSubmitError(
        "Something went wrong. Please try again or email us directly at support@collegegig.in"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setSubject("");
    setMessage("");
    setProjectId("");
    setErrors({});
    setSubmitError("");
    setIsSubmitted(false);
  };

  const faqItems = [
    {
      question: "How do I withdraw my earnings?",
      answer:
        "Earnings can be withdrawn to your bank account via NEFT/IMPS. Withdrawals process within 2–3 business days. Minimum withdrawal is ₹500.",
    },
    {
      question: "What payment methods are accepted?",
      answer:
        "CollegeGig supports UPI, credit/debit cards, and netbanking via Razorpay. All transactions are secured and encrypted.",
    },
    {
      question: "How do I raise a dispute?",
      answer:
        "Go to the project page and click 'Raise Dispute'. Our team reviews all disputes within 3 business days.",
    },
    {
      question: "Is my data safe on CollegeGig?",
      answer:
        "Yes. We use industry-standard encryption and all payments are processed securely through Razorpay.",
    },
    {
      question: "Can clients join if they're not students?",
      answer:
        "Yes — anyone can join as a client. Freelancers must be currently enrolled students at an Indian college or university.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Contact Us
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          We're here to help. Reach out and we'll get back to you within 1
          business day.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Form */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Send us a message
            </h2>

            {isSubmitted ? (
              <div className="space-y-6 py-8">
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-800 dark:text-green-300">
                    We've received your message! You'll hear back within 1
                    business day (Mon–Sat, IST).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="contact-name"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  {errors.name && (
                    <p
                      className="text-xs text-red-600 dark:text-red-400 mt-1"
                      role="alert"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label
                    htmlFor="contact-email"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email)
                        setErrors({ ...errors, email: undefined });
                    }}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  {errors.email && (
                    <p
                      className="text-xs text-red-600 dark:text-red-400 mt-1"
                      role="alert"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label
                    htmlFor="contact-subject"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Subject
                  </label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (errors.subject)
                        setErrors({ ...errors, subject: undefined });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  >
                    <option value="" disabled>
                      Select a topic...
                    </option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Payment & Billing">Payment & Billing</option>
                    <option value="Project Dispute">Project Dispute</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.subject && (
                    <p
                      className="text-xs text-red-600 dark:text-red-400 mt-1"
                      role="alert"
                    >
                      {errors.subject}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label
                    htmlFor="contact-message"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (errors.message)
                        setErrors({ ...errors, message: undefined });
                    }}
                    placeholder="Describe your issue or question in detail..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-y"
                  />
                  {errors.message && (
                    <p
                      className="text-xs text-red-600 dark:text-red-400 mt-1"
                      role="alert"
                    >
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Project ID */}
                <div className="space-y-1">
                  <label
                    htmlFor="contact-projectId"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Project / Order ID{" "}
                    <span className="text-gray-400 dark:text-gray-500 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="contact-projectId"
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="e.g. PRJ-2024-XXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                {/* Payment note */}
                <div className="flex gap-2.5 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>
                    For payment queries, please include your Transaction or
                    Project ID for faster resolution.
                  </p>
                </div>

                {/* Error */}
                {submitError && (
                  <div
                    className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {submitError}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Get in touch
            </h2>
            <div className="space-y-3">
              {/* Mail */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <a
                    href="mailto:support@collegegig.in"
                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    support@collegegig.in
                  </a>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <a
                    href="tel:+919876543210"
                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    +91 98765 43210
                  </a>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Support Hours
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Mon–Sat, 9 AM – 6 PM IST
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Based in
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Ahmedabad, Gujarat, India
                  </p>
                </div>
              </div>

              {/* Response Time */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Response Time
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Within 1 business day
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Quick answers
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {faqItems.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex items-center justify-between w-full py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <span className="pr-4">{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transform transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 pb-3 leading-relaxed">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Stay connected
            </h2>
            <div className="flex flex-wrap gap-2">
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Instagram
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Twitter
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                LinkedIn
              </a>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Follow us for platform updates, freelancing tips, and student
              opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
