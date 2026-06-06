import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { sanitizeText } from "@/lib/sanitize";
import type { AppProfile, PortfolioItem } from "@/lib/profileTypes";
import { 
  Star, 
  Briefcase, 
  TrendingUp, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  X, 
  CreditCard 
} from "lucide-react";

export function UserProfile({ profile, onEditPhoto }: { profile: AppProfile, onEditPhoto: () => void }) {
  const profileData = useQuery(api.projects.getFreelancerPublicProfile, { userId: profile.userId });
  const clientProfileData = useQuery(api.projects.getClientPublicProfile, profile.userType === "client" ? { userId: profile.userId } : "skip");

  const [bio, setBio] = useState(profile.bio || "");
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(profile.portfolioItems || []);
  const [company, setCompany] = useState(profile.company || "");
  const [identity, setIdentity] = useState(profile.identity || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [linkedin, setLinkedin] = useState(profile.linkedin || "");
  const [industry, setIndustry] = useState(profile.industry || "");
  const [teamSize, setTeamSize] = useState(profile.teamSize || "");
  const [hiringPreferences, setHiringPreferences] = useState<string[]>(profile.hiringPreferences || []);
  const [preferredCommunication, setPreferredCommunication] = useState(profile.preferredCommunication || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const startPayoutOnboarding = useAction(api.paymentActions.saveBankDetailsAndStartRouteOnboarding);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const [bankAccountHolderName, setBankAccountHolderName] = useState(profile.bankAccountHolderName || "");
  const [bankIfsc, setBankIfsc] = useState(profile.bankIfsc || "");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [stakeholderPhone, setStakeholderPhone] = useState("");
  const [stakeholderPan, setStakeholderPan] = useState("");
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false);

  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    description: "",
    link: "",
    image: null as string | null,
    imageUrl: null as string | null,
  });
  const [isUploadingPortfolioImage, setIsUploadingPortfolioImage] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  useEffect(() => {
    setBio(profile.bio || "");
    setSkills(profile.skills || []);
    setPortfolioItems(profile.portfolioItems || []);
    setCompany(profile.company || "");
    setIdentity(profile.identity || "");
    setWebsite(profile.website || "");
    setLinkedin(profile.linkedin || "");
    setIndustry(profile.industry || "");
    setTeamSize(profile.teamSize || "");
    setHiringPreferences(profile.hiringPreferences || []);
    setPreferredCommunication(profile.preferredCommunication || "");
    setBankAccountHolderName(profile.bankAccountHolderName || "");
    setBankIfsc(profile.bankIfsc || "");
    setBankAccountNumber("");
    setStakeholderPan("");
  }, [profile]);

  const hasChanges =
    bio !== (profile.bio || "") ||
    JSON.stringify(skills) !== JSON.stringify(profile.skills || []) ||
    JSON.stringify(portfolioItems.map((i: any) => ({ id: i.id, title: i.title, description: i.description, link: i.link || undefined, image: i.image || undefined }))) !== JSON.stringify(profile.portfolioItems || []) ||
    company !== (profile.company || "") ||
    identity !== (profile.identity || "") ||
    website !== (profile.website || "") ||
    linkedin !== (profile.linkedin || "") ||
    industry !== (profile.industry || "") ||
    teamSize !== (profile.teamSize || "") ||
    JSON.stringify(hiringPreferences) !== JSON.stringify(profile.hiringPreferences || []) ||
    preferredCommunication !== (profile.preferredCommunication || "");

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        bio,
        skills: profile.userType === "freelancer" ? skills : undefined,
        portfolioItems: profile.userType === "freelancer" ? portfolioItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          link: item.link || undefined,
          image: item.image || undefined,
        })) : undefined,
        company: profile.userType === "client" ? company : undefined,
        identity: profile.userType === "client" ? identity : undefined,
        website: profile.userType === "client" ? website : undefined,
        linkedin: profile.userType === "client" ? linkedin : undefined,
        industry: profile.userType === "client" ? industry : undefined,
        teamSize: profile.userType === "client" ? teamSize : undefined,
        hiringPreferences: profile.userType === "client" ? hiringPreferences : undefined,
        preferredCommunication: profile.userType === "client" ? preferredCommunication : undefined,
      });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBankDetails = async () => {
    setIsSavingBankDetails(true);
    try {
      const result = await startPayoutOnboarding({
        accountHolderName: bankAccountHolderName,
        ifsc: bankIfsc,
        accountNumber: bankAccountNumber,
        stakeholderPhone,
        stakeholderPan,
      });
      setBankAccountNumber("");
      setStakeholderPan("");
      toast.success(
        result.status === "activated"
          ? "Payout account activated."
          : "Payout onboarding sent to Razorpay for review."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update bank details");
    } finally {
      setIsSavingBankDetails(false);
    }
  };

  const bankDetailsSection = profile.userType === "freelancer" ? (
    <div className="border-t pt-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bank Details</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
            We store only IFSC, account holder name, and last 4 digits. PAN and full bank details are sent to Razorpay for Route KYC.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {profile.bankAccountLast4 && (
            <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full">
              Saved ****{profile.bankAccountLast4}
            </span>
          )}
          <span className={`text-xs border px-2 py-1 rounded-full ${profile.isPayoutReady
            ? "bg-green-50 text-green-700 border-green-100"
            : profile.payoutOnboardingStatus === "failed"
              ? "bg-red-50 text-red-700 border-red-100"
              : "bg-yellow-50 text-yellow-700 border-yellow-100"
            }`}>
            {profile.isPayoutReady
              ? "Payout ready"
              : profile.payoutOnboardingStatus === "failed"
                ? "Onboarding failed"
                : profile.razorpayAccountId
                  ? "Razorpay review pending"
                  : "Not payout ready"}
          </span>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          type="text"
          value={bankAccountHolderName}
          onChange={(e) => setBankAccountHolderName(e.target.value)}
          className="input-field !py-2.5 !px-3"
          placeholder="Account holder name"
        />
        <input
          type="text"
          value={bankIfsc}
          onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
          className="input-field !py-2.5 !px-3 uppercase"
          placeholder="IFSC code"
        />
        <input
          type="password"
          value={bankAccountNumber}
          onChange={(e) => setBankAccountNumber(e.target.value)}
          className="input-field !py-2.5 !px-3"
          placeholder={profile.bankAccountLast4 ? "Re-enter to update" : "Account number"}
        />
        <input
          type="tel"
          value={stakeholderPhone}
          onChange={(e) => setStakeholderPhone(e.target.value)}
          className="input-field !py-2.5 !px-3"
          placeholder="Phone without country code"
        />
        <input
          type="password"
          value={stakeholderPan}
          onChange={(e) => setStakeholderPan(e.target.value.toUpperCase())}
          className="input-field !py-2.5 !px-3 uppercase"
          placeholder="PAN"
        />
      </div>
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSaveBankDetails}
          disabled={isSavingBankDetails || !bankAccountHolderName || !bankIfsc || !bankAccountNumber || !stakeholderPhone || !stakeholderPan}
          className="btn-primary mt-6"
        >
          {isSavingBankDetails ? "Submitting..." : "Start Razorpay KYC"}
        </button>
      </div>
    </div>
  ) : null;

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s: string) => s !== skill));
  };

  if (profile.userType === "freelancer") {
    if (!profileData) return <div className="text-center p-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading profile...</div>;

    const { completedProjects, reviews, activityMap = {} } = profileData;

    // Calculate completeness
    let completeness = 0;
    if (profile.firstName) completeness += 20;
    if (profile.bio) completeness += 20;
    if (profile.skills && profile.skills.length > 0) completeness += 20;
    if (profile.collegeName) completeness += 20;
    if (profile.profilePictureUrl) completeness += 20;

    // Determine Level
    let level = "Novice";
    if (completedProjects.length >= 10) level = "Top Talent";
    else if (completedProjects.length >= 3) level = "Rising Star";

    const successRate = 100; // Can be enhanced later via order history metrics

    return (
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-8 max-w-5xl mx-auto mt-4 relative">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Column: Basic Info & Avatar */}
          <div className="md:w-1/3 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={onEditPhoto}>
              {profile.profilePictureUrl ? (
                <img
                  src={profile.profilePictureUrl}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity"
                  onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity">
                  <span className="text-4xl font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">Change Photo</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.firstName} {profile.lastName}</h1>
            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 font-medium capitalize">{profile.tagline || "Student Freelancer"}</p>

            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <p>{profile.collegeName || "College not specified"}</p>
              {profile.graduationYear && <p>Class of {profile.graduationYear}</p>}
            </div>

            {profile.isVerified && (
              <div className="mt-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Verified Student
              </div>
            )}

            <div className="mt-4 bg-primary-50 dark:bg-primary-900/10 text-blue-800 px-4 py-2 rounded-lg w-full">
              <p className="text-sm font-semibold mb-1">Freelancer Tier</p>
              <p className="text-lg font-bold">{level}</p>
            </div>
          </div>

          {/* Right Column: Stats & LeetCode Style Progress */}
          <div className="md:w-2/3 space-y-6">
            {/* Gamification & Progress */}
            <div className="bg-gray-50 dark:bg-dark-surface-2 p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Profile Completeness</span>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{completeness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${completeness}%` }}></div>
              </div>
              {completeness < 100 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">Add more details like a bio or profile picture to reach 100%.</p>
              )}
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-dark-surface border rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Rating</p>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{profile.averageRating ? profile.averageRating.toFixed(1) : "New"}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </div>
              </div>
              <div className="bg-white dark:bg-dark-surface border rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Completed</p>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{completedProjects.length}</span>
                  <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
              <div className="bg-white dark:bg-dark-surface border rounded-lg p-4 text-center shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Success</p>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{profileData?.onTimeRate !== undefined ? profileData.onTimeRate + '%' : 'N/A'}</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">On-Time Delivery</p>
              </div>
            </div>

            {/* About Me */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">About Me</h3>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field min-h-[100px] resize-y"
                placeholder="Tell us about yourself..."
              />
            </div>

            {bankDetailsSection}

            {/* Skills */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {skills.map((skill: string) => (
                  <span key={skill} className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm flex items-center space-x-1.5 border border-primary-100 dark:border-primary-800/40">
                    <span>{skill}</span>
                    <button type="button" onClick={() => removeSkill(skill)} className="text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-200 transition-colors flex items-center">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add a skill and press Enter"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
                className="input-field"
              />
            </div>

            {/* Portfolio Editing */}
            <div className="mt-8 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Portfolio</h3>
                <button
                  onClick={() => setIsAddingPortfolio(true)}
                  className="text-sm bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400 px-3 py-1 rounded hover:bg-primary-100 dark:bg-primary-900/20 font-medium"
                >
                  + Add Project
                </button>
              </div>

              {isAddingPortfolio && (
                <div className="bg-gray-50 dark:bg-dark-surface-2 p-4 rounded-lg border mb-4">
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Project Title *"
                      value={newPortfolioItem.title}
                      onChange={e => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                      className="input-field !py-2.5 !px-3"
                    />
                    <textarea
                      placeholder="Description *"
                      value={newPortfolioItem.description}
                      onChange={e => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                      className="input-field min-h-[80px] resize-y"
                      rows={3}
                    />
                    <input
                      type="text"
                      placeholder="Link (e.g. GitHub or Live Demo)"
                      value={newPortfolioItem.link}
                      onChange={e => setNewPortfolioItem({ ...newPortfolioItem, link: e.target.value })}
                      className="input-field !py-2.5 !px-3"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-surface border px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 dark:bg-dark-surface-2 transition-colors">
                        {isUploadingPortfolioImage ? "Uploading..." : newPortfolioItem.image ? "Change Image" : "Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // Validate file size (max 5MB for portfolio images)
                            const MAX_PORTFOLIO_SIZE = 5 * 1024 * 1024;
                            if (file.size > MAX_PORTFOLIO_SIZE) {
                              toast.error("Portfolio image must be smaller than 5MB.");
                              e.target.value = "";
                              return;
                            }

                            try {
                              setIsUploadingPortfolioImage(true);
                              const compressedFile = await compressImage(file, 800, 800, 0.8);
                              const postUrl = await generateUploadUrl();
                              const result = await fetch(postUrl, {
                                method: "POST",
                                headers: { "Content-Type": compressedFile.type },
                                body: compressedFile,
                              });
                              const { storageId } = await result.json();
                              const objectUrl = URL.createObjectURL(file);
                              setNewPortfolioItem(prev => ({ ...prev, image: storageId, imageUrl: objectUrl }));
                            } catch (err) {
                              toast.error("Failed to upload image");
                            } finally {
                              setIsUploadingPortfolioImage(false);
                            }
                          }}
                          disabled={isUploadingPortfolioImage}
                        />
                      </label>
                      {newPortfolioItem.imageUrl && (
                        <img
                          src={newPortfolioItem.imageUrl}
                          alt="Preview"
                          className="h-10 w-10 object-cover rounded border"
                          onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                        />
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setIsAddingPortfolio(false);
                          setNewPortfolioItem({ title: "", description: "", link: "", image: null, imageUrl: null });
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-dark-surface-2 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!newPortfolioItem.title.trim() || !newPortfolioItem.description.trim()) {
                            toast.error("Title and description are required.");
                            return;
                          }
                          setPortfolioItems([...portfolioItems, {
                            id: crypto.randomUUID(),
                            title: newPortfolioItem.title.trim(),
                            description: newPortfolioItem.description.trim(),
                            link: newPortfolioItem.link.trim() || undefined,
                            image: newPortfolioItem.image || undefined,
                            imageUrl: newPortfolioItem.imageUrl || undefined,
                          }]);
                          setNewPortfolioItem({ title: "", description: "", link: "", image: null, imageUrl: null });
                          setIsAddingPortfolio(false);
                        }}
                        className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        Save Project
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {portfolioItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolioItems.map((item: any) => (
                    <div key={item.id} className="border rounded-lg overflow-hidden bg-white dark:bg-dark-surface shadow-sm flex flex-col relative group">
                      <button
                        onClick={() => {
                          setNewPortfolioItem({ title: item.title, description: item.description, link: item.link || "", image: item.image || null, imageUrl: item.imageUrl || null });
                          setPortfolioItems(portfolioItems.filter(i => i.id !== item.id));
                          setIsAddingPortfolio(true);
                        }}
                        className="absolute top-2 right-11 bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-blue-600 transition-colors"
                        title="Edit project"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setPortfolioItems(portfolioItems.filter(i => i.id !== item.id))}
                        className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-red-600 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-32 object-cover"
                          onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-dark-surface-2 flex items-center justify-center border-b">
                          <ImageIcon className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-1 line-clamp-2 flex-1">{item.description}</p>
                        {item.link && (
                          <a href={item.link.startsWith('http') ? item.link : `https://${item.link}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 text-sm hover:underline mt-3 flex items-center gap-1 font-medium">
                            <ExternalLink className="w-4 h-4" />
                            Link
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 italic">No portfolio items added yet.</p>
              )}
            </div>

            {hasChanges && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSubmitting}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LeetCode Style Activity Graph */}
        <div className="border-t pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Activity Map</h3>
          <div className="bg-gray-50 dark:bg-dark-surface-2 p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-6">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              </button>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h4>
              <button
                onClick={handleNextMonth}
                disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
              </button>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const firstDayOfMonth = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  const days = [];
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push(null);
                  }
                  for (let i = 1; i <= daysInMonth; i++) {
                    days.push(new Date(year, month, i));
                  }
                  while (days.length % 7 !== 0) {
                    days.push(null);
                  }

                  return days.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="h-10 sm:h-12"></div>;

                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    const count = activityMap[dateStr] || 0;

                    let intensity = 0;
                    if (count > 0 && count <= 2) intensity = 1;
                    else if (count > 2 && count <= 5) intensity = 2;
                    else if (count > 5 && count <= 10) intensity = 3;
                    else if (count > 10) intensity = 4;

                    const colors = ["bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border", "bg-green-100 border-green-200", "bg-green-300 border-green-400", "bg-green-500 border-green-600", "bg-green-700 border-green-800"];

                    return (
                      <div
                        key={dateStr}
                        className={`h-10 sm:h-12 rounded-md flex items-center justify-center text-xs font-medium border transition-all hover:scale-105 cursor-default ${colors[intensity]} ${intensity > 2 ? 'text-white' : 'text-gray-700 dark:text-gray-300'} shadow-sm`}
                        title={`${count} activities on ${date.toLocaleDateString()}`}
                      >
                        {date.getDate()}
                      </div>
                    )
                  });
                })()}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-6 pt-4 border-t">
              <span>Less Activity</span>
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded shadow-sm border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-200 bg-green-100"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-400 bg-green-300"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-600 bg-green-500"></div>
                <div className="w-4 h-4 rounded shadow-sm border border-green-800 bg-green-700"></div>
              </div>
              <span>More Activity</span>
            </div>
          </div>
        </div>

        {/* Client Reviews */}
        <div className="border-t pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Client Reviews ({reviews?.length || 0})</h3>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review._id} className="bg-white dark:bg-dark-surface border rounded-lg p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full flex items-center justify-center font-bold text-sm">
                        {review.reviewerName.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{review.reviewerName}</span>
                    </div>
                    <div className="flex gap-0.5 text-yellow-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-surface-2 p-6 rounded-lg text-center border border-dashed">
              No reviews yet. Complete projects to get reviews!
            </p>
          )}
        </div>

        {/* Completed Projects Catalog */}
        <div className="border-t pt-8 mt-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Completed Projects</h3>
          {completedProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {completedProjects.map((project: any) => (
                <div key={project._id} className="border rounded-lg p-5 bg-white dark:bg-dark-surface shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{project.title}</h4>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">Completed</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-2 line-clamp-2 flex-1">{project.description}</p>

                  {project.review && (
                    <div className="mt-4 bg-gray-50 dark:bg-dark-surface-2 p-3 rounded-lg border border-gray-100 dark:border-dark-border">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="flex gap-0.5 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < project.review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-600'}`} />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">Client Review</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 italic">"{project.review.comment}"</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end border-t pt-3">
                    <span className="text-xs bg-gray-100 dark:bg-dark-surface-2 text-gray-600 dark:text-gray-400 dark:text-gray-500 px-2 py-1 rounded">{project.category}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-surface-2 p-6 rounded-lg text-center border border-dashed">
              You haven't completed any platform projects yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  const clientData = clientProfileData || { postedProjectsCount: 0, completedHiresCount: 0 };

  // Fallback for Client or Admin view
  return (
    <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm p-8 max-w-4xl mx-auto mt-4 relative">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Basic Info & Avatar */}
        <div className="md:w-1/3 flex flex-col items-center text-center">
          <div className="relative group cursor-pointer" onClick={onEditPhoto}>
            {profile.profilePictureUrl ? (
              <img
                src={profile.profilePictureUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity"
                onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
              />
            ) : (
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-white shadow-md mb-4 group-hover:opacity-75 transition-opacity">
                <span className="text-4xl font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">Change Photo</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.firstName} {profile.lastName}</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 font-medium capitalize">{profile.userType}</p>

          {profile.isVerified && (
            <div className="mt-4 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Verified User
            </div>
          )}

          {profile.paymentVerified && (
            <div className="mt-2 bg-primary-100 dark:bg-primary-900/20 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Payment Verified
            </div>
          )}

          {profile.userType === "client" && (
            <div className="mt-6 w-full text-left bg-gray-50 dark:bg-dark-surface-2 p-4 rounded-lg border">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Client Stats</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                <div className="flex justify-between">
                  <span>Projects Posted</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{clientData.postedProjectsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed Hires</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{clientData.completedHiresCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Rating</span>
                  <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    {profile.averageRating ? profile.averageRating.toFixed(1) : "New"} <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="md:w-2/3 space-y-6">
          {/* About Me */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">About Me</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field min-h-[100px] resize-y"
              placeholder="Tell us about yourself..."
            />
          </div>

          {bankDetailsSection}

          {profile.userType === "client" && (
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Company / Brand Name</h3>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="input-field"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Identity</h3>
                <select
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
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
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hiring Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {['Project-based', 'Long-term', 'Quick tasks', 'Ongoing support'].map(pref => (
                    <label key={pref} className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-surface-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors">
                      <input
                        type="checkbox"
                        checked={hiringPreferences.includes(pref)}
                        onChange={(e) => {
                          if (e.target.checked) setHiringPreferences([...hiringPreferences, pref]);
                          else setHiringPreferences(hiringPreferences.filter((p: string) => p !== pref));
                        }}
                        className="rounded text-primary-600 dark:text-primary-400 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{pref}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Preferred Communication</h3>
                <select
                  value={preferredCommunication}
                  onChange={(e) => setPreferredCommunication(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select preference</option>
                  <option value="In-app chat">In-app chat</option>
                  <option value="Email">Email</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Website</h3>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="input-field !py-2.5 !px-3" placeholder="https://..." />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">LinkedIn</h3>
                  <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="input-field !py-2.5 !px-3" placeholder="https://linkedin.com/..." />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Industry</h3>
                  <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="input-field !py-2.5 !px-3" placeholder="e.g., SaaS, EdTech" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Team Size</h3>
                  <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="input-field !py-2.5 !px-3">
                    <option value="">Select size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201+">201+</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {hasChanges && (
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSaveChanges}
                disabled={isSubmitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
