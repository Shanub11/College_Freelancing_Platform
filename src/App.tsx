import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { NetworkBanner } from "./components/NetworkBanner";

const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const ProfileSetup = lazy(() => import("./components/ProfileSetup").then(m => ({ default: m.ProfileSetup })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const SubmitProposalPage = lazy(() => import("./components/SubmitProposalPage").then(m => ({ default: m.SubmitProposalPage })));
const ProjectDetailsPage = lazy(() => import("./components/ProjectDetailsPage").then(m => ({ default: m.ProjectDetailsPage })));
const LandingPage = lazy(() => import("./components/LandingPage").then(m => ({ default: m.LandingPage })));
const ContactPage = lazy(() => import("./components/ContactPage").then(m => ({ default: m.ContactPage })));
const TermsOfServicePage = lazy(() => import("./components/TermsOfService").then(m => ({ default: m.TermsOfService })));
const PrivacyPolicyPage = lazy(() => import("./components/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const PublicProfilePage = lazy(() => import("./components/PublicProfilePage").then(m => ({ default: m.PublicProfilePage })));

function BrandedLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-dark-bg">
      <div className="relative">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center animate-pulse-soft">
          <span className="text-white font-bold text-lg">CG</span>
        </div>
        <div className="absolute inset-0 w-12 h-12 rounded-xl border-2 border-primary-300 animate-ping opacity-20"></div>
      </div>
      <p className="text-sm text-gray-400 font-medium">Loading CollegeGig...</p>
    </div>
  );
}

function PublicContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface shadow-sm border-b border-gray-100 dark:border-dark-border py-4">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CG</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">CollegeGig</span>
          </a>
          <a href="/" className="btn-secondary !py-2 !px-4 !text-sm">
            Back to Home
          </a>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow py-8">
        <ContactPage />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-dark-bg text-white py-6 border-t border-gray-800 dark:border-dark-border text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} CollegeGig. All rights reserved.
      </footer>
    </div>
  );
}

function AuthenticatedApp({ initialTab }: { initialTab?: string }) {
  const profile = useQuery(api.profiles.getCurrentProfile);
  const isAdmin = useQuery(api.profiles.checkIsAdmin);

  // Wait for both queries to settle before deciding which view to render.
  // `undefined` means still loading — show loader to prevent flash of wrong view.
  if (profile === undefined || isAdmin === undefined) {
    return <BrandedLoader />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (!profile) {
    return <ProfileSetup />;
  }

  return <Dashboard profile={profile} initialTab={initialTab} />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <NetworkBanner />
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
          <Authenticated>
            <Suspense fallback={<BrandedLoader />}>
              <Routes>
                <Route path="/dashboard" element={<AuthenticatedApp />} />
                <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
                <Route path="/projects/:projectId/propose" element={<SubmitProposalPage />} />
                <Route path="/contact" element={<AuthenticatedApp initialTab="contact" />} />
                <Route path="/u/:username" element={<PublicProfilePage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/help" element={<Navigate to="/contact" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </Authenticated>
          <Unauthenticated>
            <Suspense fallback={<BrandedLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/u/:username" element={<PublicProfilePage />} />
                <Route path="/contact" element={<PublicContactPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </Unauthenticated>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AppErrorBoundary>
  );
}
