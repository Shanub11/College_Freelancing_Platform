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

function AuthenticatedApp() {
  const profile = useQuery(api.profiles.getCurrentProfile);
  const isAdmin = useQuery(api.profiles.checkIsAdmin);

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (profile === undefined) {
    return <BrandedLoader />;
  }

  if (!profile) {
    return <ProfileSetup />;
  }

  return <Dashboard profile={profile} />;
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
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </Authenticated>
          <Unauthenticated>
            <Suspense fallback={<BrandedLoader />}>
              <LandingPage />
            </Suspense>
          </Unauthenticated>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AppErrorBoundary>
  );
}
