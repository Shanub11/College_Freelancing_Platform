import { useRef, useState, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Helmet } from "react-helmet-async";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { NetworkBanner } from "./components/NetworkBanner";

const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const ProfileSetup = lazy(() => import("./components/ProfileSetup").then(m => ({ default: m.ProfileSetup })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const SubmitProposalPage = lazy(() => import("./components/SubmitProposalPage").then(m => ({ default: m.SubmitProposalPage })));
const ProjectDetailsPage = lazy(() => import("./components/ProjectDetailsPage").then(m => ({ default: m.ProjectDetailsPage })));

export default function App() {
  return (
    <AppErrorBoundary>
      <Router>
        {/* Network status banner - shown at top of all pages when offline */}
        <NetworkBanner />
        <div className="min-h-screen bg-gray-50">
          <Authenticated>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <Routes>
              <Route path="/dashboard" element={<AuthenticatedApp />} />
              <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
              <Route path="/projects/:projectId/propose" element={<SubmitProposalPage />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </Authenticated>
        <Unauthenticated>
            <UnauthenticatedApp />
          </Unauthenticated>
          <Toaster />
        </div>
      </Router>
    </AppErrorBoundary>
  );
}

function AuthenticatedApp() {
  const profile = useQuery(api.profiles.getCurrentProfile);
  const isAdmin = useQuery(api.profiles.checkIsAdmin);

  if (isAdmin) {
    return <AdminDashboard />;
  }
  
  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <ProfileSetup />;
  }

  return <Dashboard profile={profile} />;
}

function UnauthenticatedApp() {
  const signInRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const categoriesRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLoginClick = () => {
    signInRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleHowItWorksClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBrowseServicesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    categoriesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>CollegeGig</title>
        <meta name="description" content="Hire verified college students for web development, design, and more at affordable prices. The best cheap web developers for startups in India." />
        <meta name="keywords" content="hire student web developer India, college students freelancing India, cheap web developer for startup India, freelancers for college projects" />
      </Helmet>
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CollegeGig</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#categories" onClick={handleBrowseServicesClick} className="text-gray-600 hover:text-gray-900">Browse Services</a>
              <a href="#how-it-works" onClick={handleHowItWorksClick} className="text-gray-600 hover:text-gray-900">How It Works</a>
              <button
                onClick={handleLoginClick}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Login
              </button>
            </nav>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <div className="w-5 h-0.5 bg-gray-700 mb-1" />
              <div className="w-5 h-0.5 bg-gray-700 mb-1" />
              <div className="w-5 h-0.5 bg-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-white w-64 h-full p-6 flex flex-col gap-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <span className="text-lg font-bold text-gray-900">CollegeGig</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-900"
                aria-label="Close navigation menu"
              >
                x
              </button>
            </div>
            <a
              href="#categories"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleBrowseServicesClick(e);
              }}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Browse Services
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleHowItWorksClick(e);
              }}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              How It Works
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLoginClick();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-left"
            >
              Login
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Hire Verified College Students.<br />
              <span className="text-blue-600">Pay Only When Satisfied.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              India's first student-verified freelance marketplace. Get web development, 
              design, content, and tutoring from talented college students at 
              startup-friendly prices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLoginClick}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Hire a Student
              </button>
              <button
                onClick={handleLoginClick}
                className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Freelancing
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                  </svg>
                </div>
                <span>Verified students only</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <span>Secure escrow payments</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </div>
                <span>UPI · Cards · NetBanking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                  </svg>
                </div>
                <span>Double-blind reviews</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-y border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">1,000+</p>
              <p className="text-sm text-gray-500 mt-1">Verified Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">500+</p>
              <p className="text-sm text-gray-500 mt-1">Projects Completed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">₹50L+</p>
              <p className="text-sm text-gray-500 mt-1">Paid to Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">4.8★</p>
              <p className="text-sm text-gray-500 mt-1">Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose CollegeGig?</h2>
            <p className="text-lg text-gray-600">Verified students, quality work, competitive prices</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Students Only</h3>
              <p className="text-gray-600">All freelancers are verified college students with valid .edu emails or student IDs</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Competitive Rates</h3>
              <p className="text-gray-600">Get quality work at student-friendly prices while supporting their education</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">Protected escrow system ensures safe transactions for both parties</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="py-20 bg-gray-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">A simple process for both clients and students.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-16">
            {/* For Clients */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">For Clients</h3>
              <ol className="relative border-l border-gray-200">
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">1</span>
                  <h4 className="font-semibold text-lg text-gray-900">Post a Project</h4>
                  <p className="text-gray-600">Describe your project, budget, and required skills. It's free and takes just a few minutes.</p>
                </li>
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">2</span>
                  <h4 className="font-semibold text-lg text-gray-900">Receive Proposals</h4>
                  <p className="text-gray-600">Get proposals from talented and verified college students who are eager to work.</p>
                </li>
                <li className="ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white">3</span>
                  <h4 className="font-semibold text-lg text-gray-900">Hire & Collaborate</h4>
                  <p className="text-gray-600">Choose the best student for the job. Use our platform for secure payments and easy collaboration.</p>
                </li>
              </ol>
            </div>
            {/* For Students */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">For Students</h3>
              <ol className="relative border-l border-gray-200">
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white">1</span>
                  <h4 className="font-semibold text-lg text-gray-900">Create Your Profile</h4>
                  <p className="text-gray-600">Showcase your skills, experience, and portfolio to attract potential clients.</p>
                </li>
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white">2</span>
                  <h4 className="font-semibold text-lg text-gray-900">Find Projects</h4>
                  <p className="text-gray-600">Browse projects that match your skills and interests. Send compelling proposals.</p>
                </li>
                <li className="ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white">3</span>
                  <h4 className="font-semibold text-lg text-gray-900">Earn & Build Experience</h4>
                  <p className="text-gray-600">Get paid for your work, receive feedback, and build a strong portfolio for your future career.</p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section ref={categoriesRef} className="py-20 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Categories</h2>
            <p className="text-lg text-gray-600">Discover talented students across various skills</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Web Development", icon: "💻", count: "150+ students" },
              { name: "Design", icon: "🎨", count: "200+ students" },
              { name: "Writing", icon: "✍️", count: "180+ students" },
              { name: "Video Editing", icon: "🎬", count: "120+ students" },
              { name: "Tutoring", icon: "📚", count: "300+ students" },
              { name: "Marketing", icon: "📈", count: "90+ students" },
              { name: "Data Analysis", icon: "📊", count: "80+ students" },
              { name: "Mobile Apps", icon: "📱", count: "100+ students" },
            ].map((category) => (
              <div 
                key={category.name} 
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                onClick={handleLoginClick}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{category.name}</h3>
                <p className="text-xs text-gray-500">{category.count}</p>
                <div className="mt-3 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Browse →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={signInRef} className="py-20 bg-blue-600 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Join 1,000+ Students & Clients on CollegeGig</h2>
          <p className="text-xl text-blue-100 mb-8">Verified students earn ₹5,000–₹50,000/month. Clients get quality work at 60% less than agency rates.</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white/20">
              🎓 Free for students
            </div>
            <div className="bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white/20">
              ⚡ Post a project in 2 mins
            </div>
            <div className="bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white/20">
              🔒 Escrow protected
            </div>
          </div>
          
          <div className="max-w-md mx-auto">
            <SignInForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CG</span>
                </div>
                <span className="text-xl font-bold">CollegeGig</span>
              </div>
              <p className="text-gray-400">Empowering students. Connecting talent to opportunity.</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">For Clients</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#categories" onClick={handleBrowseServicesClick} className="hover:text-white">Browse Services</a></li>
                <li><a href="#" className="hover:text-white">Post a Project</a></li>
                <li><a href="#" className="hover:text-white">How It Works</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">For Students</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Start Freelancing</a></li>
                <li><a href="#" className="hover:text-white">Success Stories</a></li>
                <li><a href="#" className="hover:text-white">Resources</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-gray-400 text-sm">&copy; 2025 CollegeGig. All rights reserved.</p>
              <p className="text-gray-500 text-xs flex items-center gap-1">
                Made with ❤️ for Indian college students
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
