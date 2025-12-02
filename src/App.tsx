import { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { ProfileSetup } from "./components/ProfileSetup";
import { AdminDashboard } from "./components/AdminDashboard";
import { SubmitProposalPage } from "./components/SubmitProposalPage"; // Assuming this was moved to components
import { ProjectDetailsPage } from "./components/ProjectDetailsPage";

export default function App() {
  const seedCategories = useMutation(api.categories.seedCategories);

  useEffect(() => {
    seedCategories().catch(console.error);
  }, [seedCategories]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Authenticated>
          <Routes>
            <Route path="/dashboard" element={<AuthenticatedApp />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
            <Route path="/projects/:projectId/propose" element={<SubmitProposalPage />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Authenticated>
        <Unauthenticated>
          <UnauthenticatedApp />
        </Unauthenticated>
        <Toaster />
      </div>
    </Router>
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CS</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CollegeSkills</span>
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Empowering Students.<br />
              <span className="text-blue-600">Connecting Talent to Opportunity.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The exclusive freelancing platform where college students showcase their skills 
              and clients discover fresh talent. From web development to tutoring, 
              find verified student freelancers ready to bring your projects to life.
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
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose CollegeSkills?</h2>
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
              <div key={category.name} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="text-3xl mb-2">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={signInRef} className="py-20 bg-blue-600 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of students and clients already using CollegeSkills</p>
          
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
                  <span className="text-white font-bold text-sm">CS</span>
                </div>
                <span className="text-xl font-bold">CollegeSkills</span>
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
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CollegeSkills. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
