import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { SignOutButton } from "../SignOutButton";

export function ProfileSetup() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<"freelancer" | "client" | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    collegeName: "",
    collegeEmail: "",
    graduationYear: new Date().getFullYear(),
    skills: [] as string[],
    company: "",
    identity: "",
    hiringPreferences: [] as string[],
    preferredCommunication: "",
    website: "",
    linkedin: "",
    industry: "",
    teamSize: "",
  });

  const createProfile = useMutation(api.profiles.createProfile);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userType) {
      toast.error("Please select your user type");
      return;
    }

    try {
      await createProfile({
        userType,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio || undefined, // Bio is optional
        skills: userType === "freelancer" && formData.skills.length > 0 ? formData.skills : undefined,
        company: userType === "client" ? formData.company || undefined : undefined,
        identity: userType === "client" ? formData.identity || undefined : undefined,
        hiringPreferences: userType === "client" && formData.hiringPreferences.length > 0 ? formData.hiringPreferences : undefined,
        preferredCommunication: userType === "client" ? formData.preferredCommunication || undefined : undefined,
        website: userType === "client" ? formData.website || undefined : undefined,
        linkedin: userType === "client" ? formData.linkedin || undefined : undefined,
        industry: userType === "client" ? formData.industry || undefined : undefined,
        teamSize: userType === "client" ? formData.teamSize || undefined : undefined,
      });

      toast.success("Profile created successfully!");
    } catch (error) {
      toast.error("Failed to create profile");
      console.error(error);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg md:flex transition-colors">
      <div className="hidden md:flex md:w-1/2 min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-accent flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-white font-bold text-2xl">CG</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">India's Student Freelancing Platform</h2>
          <div className="mt-8 space-y-4 text-left">
            {[
              "Get verified as a college student",
              "Earn ₹500–₹50,000 per project",
              "Build your portfolio while studying",
            ].map((point) => (
              <div key={point} className="flex items-center gap-3 text-white">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="absolute bottom-12 text-sm text-primary-100 font-medium z-10">Join 1,000+ students already earning</p>
      </div>

      <div className="w-full md:w-1/2 min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="card p-6 md:p-8 relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center shadow-md">1</div>
                <div className={`h-1 w-12 rounded-full ${step === 2 ? "bg-primary-600" : "bg-gray-200 dark:bg-dark-surface-2"}`}></div>
                <div className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shadow-sm transition-colors ${step === 2 ? "bg-primary-600 text-white" : "bg-gray-100 dark:bg-dark-surface-2 text-gray-400 dark:text-gray-500"}`}>2</div>
              </div>
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Profile Setup</span>
            </div>

            <div className="text-center mb-8">
              <div className="md:hidden w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white font-bold text-2xl">CG</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Welcome to CollegeGig</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Let's set up your profile</p>
            </div>

            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">I want to...</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setUserType("freelancer");
                      setStep(2);
                    }}
                    className="w-full p-5 border-2 border-gray-200 dark:border-dark-border rounded-2xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all duration-300 text-left group card-hover relative overflow-hidden"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-lg">Offer my services</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">I'm a college student looking to freelance</p>
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold mt-3 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Most popular choice
                        </span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setUserType("client");
                      setStep(2);
                    }}
                    className="w-full p-5 border-2 border-gray-200 dark:border-dark-border rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all duration-300 text-left group card-hover"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-lg">Hire students</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">I want to find talented student freelancers</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-right">
                <div>
                  <div className="flex items-center mb-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="p-2 -ml-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-2"
                      aria-label="Go back"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-xl font-bold flex-1 text-center text-gray-900 dark:text-white mr-6">
                      {userType === "freelancer" ? "Student Profile" : "Client Profile"}
                    </h2>
                  </div>

                  {userType === "freelancer" ? (
                    <div className="inline-flex items-center gap-2 badge-primary !px-4 !py-2 mb-6">
                      🎓 Setting up as Student Freelancer
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 badge !bg-emerald-50 dark:!bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-400 !border-emerald-200 dark:!border-emerald-800 !px-4 !py-2 mb-6">
                      💼 Setting up as Client
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="input-field min-h-[100px] resize-y"
                    placeholder={userType === "freelancer" ? "Tell clients about yourself and your skills..." : "e.g., Building SaaS products and hiring student developers for frontend work."}
                  />
                </div>

                {userType === "client" && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        I am a... (Identity) *
                      </label>
                      <select
                        required
                        value={formData.identity}
                        onChange={(e) => setFormData(prev => ({ ...prev, identity: e.target.value }))}
                        className="input-field"
                      >
                        <option value="">Select identity</option>
                        <option value="Startup Founder">Startup Founder</option>
                        <option value="Student Founder">Student Founder</option>
                        <option value="Small Business">Small Business</option>
                        <option value="Agency">Agency</option>
                        <option value="Individual">Individual</option>
                        <option value="Creator">Creator</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Company / Brand Name <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="input-field"
                        placeholder="e.g., PixelForge Labs"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full !py-3.5 mt-8 flex items-center justify-center gap-2"
                >
                  Create My Profile
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

              </form>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Wrong account?
            <span className="inline-block ml-1">
              <SignOutButton />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
