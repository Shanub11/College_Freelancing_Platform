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
    <div className="min-h-screen bg-white md:flex">
      <div className="hidden md:flex md:w-1/2 min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex-col items-center justify-center p-12 relative">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl border border-white/20 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="text-white font-bold text-xl">CG</span>
          </div>
          <h2 className="text-2xl font-bold text-white">India's Student Freelancing Platform</h2>
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
        <p className="absolute bottom-12 text-sm text-blue-200">Join 1,000+ students already earning</p>
      </div>

      <div className="w-full md:w-1/2 min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">1</div>
                <div className={`h-0.5 w-12 ${step === 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
                <div className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>2</div>
              </div>
              <span className="text-sm text-gray-500 ml-2">Profile Setup</span>
            </div>

            <div className="text-center mb-8">
              <div className="md:hidden w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-white font-bold text-xl">CG</span>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900">Welcome to CollegeGig</h1>
              <p className="text-gray-500 mt-2">Let's set up your profile</p>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-center text-gray-900">I want to...</h2>
                
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setUserType("freelancer");
                      setStep(2);
                    }}
                    className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:border-l-4 hover:border-l-green-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Offer my services</h3>
                        <p className="text-gray-500 text-sm">I'm a college student looking to freelance</p>
                        <span className="text-xs text-green-600 font-medium mt-1 block">← Most popular choice</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setUserType("client");
                      setStep(2);
                    }}
                    className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Hire students</h3>
                        <p className="text-gray-500 text-sm">I want to find talented student freelancers</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="flex space-x-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      ← Back
                    </button>
                    <h2 className="text-xl font-semibold flex-1 text-center text-gray-900">
                      {userType === "freelancer" ? "Student Profile" : "Client Profile"}
                    </h2>
                  </div>

                  {userType === "freelancer" ? (
                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-sm font-medium mb-4">
                      🎓 Setting up as Student Freelancer
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-sm font-medium mb-4">
                      💼 Setting up as Client
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder={userType === "freelancer" ? "Tell clients about yourself and your skills..." : "e.g., Building SaaS products and hiring student developers for frontend work."}
                  />
                </div>

                {userType === "client" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        I am a... (Identity) *
                      </label>
                      <select
                        required
                        value={formData.identity}
                        onChange={(e) => setFormData(prev => ({ ...prev, identity: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company / Brand Name <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="e.g., PixelForge Labs"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
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
