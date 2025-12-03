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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">CS</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">Welcome to CollegeSkills</h1>
          <p className="text-gray-600 mt-2">Let's set up your profile</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">I want to...</h2>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  setUserType("freelancer");
                  setStep(2);
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Offer my services</h3>
                    <p className="text-gray-600 text-sm">I'm a college student looking to freelance</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setUserType("client");
                  setStep(2);
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💼</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Hire students</h3>
                    <p className="text-gray-600 text-sm">I want to find talented student freelancers</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-blue-600 hover:text-blue-700"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold flex-1 text-center">
                {userType === "freelancer" ? "Student Profile" : "Client Profile"}
              </h2>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={userType === "freelancer" ? "Tell clients about yourself and your skills..." : "Tell freelancers about your business..."}
              />
            </div>

            {userType === "freelancer" && (
              <>
              </>
            )}

            {userType === "client" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your company name"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Profile
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
