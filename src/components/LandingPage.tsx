import { useRef, useState, useEffect } from "react";
import { SignInForm } from "../SignInForm";
import { Helmet } from "react-helmet-async";
import { useTheme } from "../hooks/useTheme";

const TESTIMONIALS = [
  { name: "Arjun S.", college: "IIT Delhi", role: "Freelancer", text: "Earned ₹40K in my first month while studying. CollegeGig changed my college life!", rating: 5 },
  { name: "Priya M.", college: "Startup Founder", role: "Client", text: "Got my MVP built by a brilliant student at 1/3 the agency cost. Highly recommend.", rating: 5 },
  { name: "Rahul K.", college: "BITS Pilani", role: "Freelancer", text: "Built my portfolio and got a PPO through connections I made here.", rating: 5 },
];

const CATEGORIES = [
  { name: "Web Development", icon: "💻", count: "150+" },
  { name: "Design", icon: "🎨", count: "200+" },
  { name: "Writing", icon: "✍️", count: "180+" },
  { name: "Video Editing", icon: "🎬", count: "120+" },
  { name: "Tutoring", icon: "📚", count: "300+" },
  { name: "Marketing", icon: "📈", count: "90+" },
  { name: "Data Analysis", icon: "📊", count: "80+" },
  { name: "Mobile Apps", icon: "📱", count: "100+" },
];

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <p className="text-3xl md:text-4xl font-extrabold gradient-text">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{label}</p>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-surface-2 transition-colors" aria-label="Toggle dark mode">
      {resolvedTheme === "dark" ? (
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/></svg>
      ) : (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
      )}
    </button>
  );
}

export function LandingPage() {
  const signInRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const categoriesRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTestimonial(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => (e?: React.MouseEvent) => {
    e?.preventDefault();
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg transition-colors">
      <Helmet>
        <title>CollegeGig — Hire Verified Student Freelancers in India</title>
        <meta name="description" content="Hire verified college students for web development, design, and more at affordable prices. India's #1 student freelance marketplace." />
      </Helmet>

      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl shadow-md border-b border-gray-200/50 dark:border-dark-border/50" : "bg-white dark:bg-dark-bg border-b border-transparent"}`}>
        <div className="section-container">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">CG</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">CollegeGig</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <a href="#categories" onClick={scrollTo(categoriesRef)} className="btn-ghost text-sm">Browse Services</a>
              <a href="#how-it-works" onClick={scrollTo(howItWorksRef)} className="btn-ghost text-sm">How It Works</a>
              <ThemeToggle />
              <button onClick={scrollTo(signInRef)} className="btn-primary ml-2 text-sm !py-2.5 !px-6">Get Started</button>
            </nav>
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-surface-2" onClick={() => setMobileMenuOpen(o => !o)} aria-label="Open menu" aria-expanded={mobileMenuOpen}>
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white dark:bg-dark-surface w-72 h-full p-6 flex flex-col gap-4 shadow-2xl animate-slide-in-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">CG</span></div><span className="font-bold text-gray-900 dark:text-white">CollegeGig</span></div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg" aria-label="Close menu">✕</button>
            </div>
            <a href="#categories" onClick={e => { setMobileMenuOpen(false); scrollTo(categoriesRef)(e); }} className="text-gray-700 dark:text-gray-200 hover:text-primary-600 font-medium py-2">Browse Services</a>
            <a href="#how-it-works" onClick={e => { setMobileMenuOpen(false); scrollTo(howItWorksRef)(e); }} className="text-gray-700 dark:text-gray-200 hover:text-primary-600 font-medium py-2">How It Works</a>
            <button onClick={() => { setMobileMenuOpen(false); scrollTo(signInRef)(); }} className="btn-primary text-sm mt-2">Get Started</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-mesh dark:opacity-30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="section-container relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="badge-primary mb-6 animate-fade-in-down">🚀 India's #1 Student Freelance Marketplace</div>
            <h1 className="text-4xl md:text-display-lg font-extrabold text-gray-900 dark:text-white mb-6 animate-fade-in-up text-balance">
              Hire Verified College Students.{" "}
              <span className="gradient-text">Pay Only When Satisfied.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "200ms" }}>
              Get web development, design, content & tutoring from talented students at startup-friendly prices. Secured with escrow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "400ms" }}>
              <button onClick={scrollTo(signInRef)} className="btn-accent !text-base !py-4 !px-10 group">
                Hire a Student <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </button>
              <button onClick={scrollTo(signInRef)} className="btn-secondary !text-base !py-4 !px-10 dark:!bg-dark-surface dark:!text-white dark:!border-dark-border">
                Start Freelancing
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm">
              {[
                { icon: "🛡️", text: "Verified students", color: "text-green-600" },
                { icon: "🔒", text: "Escrow payments", color: "text-blue-600" },
                { icon: "💳", text: "UPI · Cards · NetBanking", color: "text-purple-600" },
                { icon: "⭐", text: "Double-blind reviews", color: "text-amber-600" },
              ].map(t => (
                <div key={t.text} className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <span className="text-lg">{t.icon}</span><span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white dark:bg-dark-surface border-y border-gray-100 dark:border-dark-border">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <AnimatedStat value="1,000+" label="Verified Students" />
            <AnimatedStat value="500+" label="Projects Completed" />
            <AnimatedStat value="₹50L+" label="Paid to Students" />
            <AnimatedStat value="4.8★" label="Average Rating" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-dark-bg">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-heading-lg font-bold text-gray-900 dark:text-white mb-4">Why Choose CollegeGig?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Verified students, quality work, competitive prices</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "🎓", title: "Verified Students Only", desc: "All freelancers are verified college students with valid .edu emails or student IDs", color: "from-blue-500 to-indigo-600" },
              { icon: "💰", title: "Competitive Rates", desc: "Get quality work at student-friendly prices while supporting their education", color: "from-emerald-500 to-teal-600" },
              { icon: "🔒", title: "Secure Payments", desc: "Protected escrow system ensures safe transactions for both parties", color: "from-purple-500 to-violet-600" },
            ].map(f => (
              <div key={f.title} className="card-hover p-8 text-center group">
                <div className={`w-16 h-16 bg-gradient-to-br ${f.color} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-2xl">{f.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white dark:bg-dark-surface">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="text-heading-lg font-bold text-gray-900 dark:text-white mb-4">What Our Users Say</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Real stories from students and clients</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 md:p-10 text-center relative overflow-hidden">
              <div className="absolute top-4 left-6 text-6xl text-primary-100 dark:text-primary-900 font-serif">"</div>
              <div className="relative z-10">
                <p className="text-lg text-gray-700 dark:text-gray-300 italic mb-6 leading-relaxed">
                  {TESTIMONIALS[currentTestimonial].text}
                </p>
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[...Array(TESTIMONIALS[currentTestimonial].rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <p className="font-bold text-gray-900 dark:text-white">{TESTIMONIALS[currentTestimonial].name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{TESTIMONIALS[currentTestimonial].college} · {TESTIMONIALS[currentTestimonial].role}</p>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setCurrentTestimonial(i)} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentTestimonial ? "bg-primary-600 w-8" : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"}`} aria-label={`Testimonial ${i+1}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howItWorksRef} className="py-20 bg-gray-50 dark:bg-dark-bg scroll-mt-16">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-heading-lg font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">A simple process for both clients and students</p>
          </div>
          <div className="grid md:grid-cols-2 gap-16">
            {[
              { title: "For Clients", color: "primary", steps: [
                { t: "Post a Project", d: "Describe your project, budget, and required skills. Free and takes 2 minutes." },
                { t: "Receive Proposals", d: "Get proposals from talented, verified college students eager to work." },
                { t: "Hire & Collaborate", d: "Choose the best student. Use secure payments and easy collaboration." }
              ]},
              { title: "For Students", color: "success", steps: [
                { t: "Create Your Profile", d: "Showcase skills, experience, and portfolio to attract clients." },
                { t: "Find Projects", d: "Browse projects matching your skills. Send compelling proposals." },
                { t: "Earn & Build Experience", d: "Get paid, receive feedback, build your portfolio for future career." }
              ]}
            ].map(col => (
              <div key={col.title}>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{col.title}</h3>
                <div className="space-y-8">
                  {col.steps.map((s, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${col.color === "primary" ? "bg-primary-600" : "bg-success-600"}`}>{i+1}</div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">{s.t}</h4>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section ref={categoriesRef} className="py-20 bg-white dark:bg-dark-surface scroll-mt-16">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-heading-lg font-bold text-gray-900 dark:text-white mb-4">Popular Categories</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Discover talented students across various skills</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {CATEGORIES.map(c => (
              <div key={c.name} className="card-hover p-5 md:p-6 group" onClick={scrollTo(signInRef)}>
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{c.icon}</div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{c.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.count} students</p>
                <div className="mt-3 text-xs text-primary-600 dark:text-primary-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Browse →</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Sign In */}
      <section ref={signInRef} className="py-20 relative overflow-hidden scroll-mt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="section-container relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Join 1,000+ Students & Clients</h2>
          <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">Verified students earn ₹5,000–₹50,000/month. Clients get quality work at 60% less.</p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {["🎓 Free for students", "⚡ Post in 2 mins", "🔒 Escrow protected"].map(t => (
              <div key={t} className="bg-white/10 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white/20">{t}</div>
            ))}
          </div>
          <div className="max-w-md mx-auto">
            <SignInForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-dark-bg text-white py-12 border-t border-gray-800 dark:border-dark-border">
        <div className="section-container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">CG</span></div><span className="text-xl font-bold">CollegeGig</span></div>
              <p className="text-gray-400 text-sm">Empowering students. Connecting talent to opportunity.</p>
            </div>
            {[
              { title: "For Clients", links: [{ t: "Browse Services", h: "#categories" }, { t: "Post a Project", h: "#" }, { t: "How It Works", h: "#how-it-works" }] },
              { title: "For Students", links: [{ t: "Start Freelancing", h: "#" }, { t: "Success Stories", h: "#" }, { t: "Resources", h: "#" }] },
              { title: "Support", links: [{ t: "Help Center", h: "#" }, { t: "Contact Us", h: "#" }, { t: "Terms of Service", h: "#" }] },
            ].map(col => (
              <div key={col.title}>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{col.title}</h3>
                <ul className="space-y-2.5">{col.links.map(l => <li key={l.t}><a href={l.h} className="text-gray-400 hover:text-white transition-colors text-sm">{l.t}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-gray-400 text-sm">&copy; 2025 CollegeGig. All rights reserved.</p>
            <p className="text-gray-500 text-xs">Made with ❤️ for Indian college students</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
