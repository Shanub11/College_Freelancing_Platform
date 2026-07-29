import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import {
  Award, Shield, TrendingUp, Copy, ExternalLink,
  Eye, EyeOff, ToggleLeft, ToggleRight
} from "lucide-react";

// ── XP ring (owner view, larger) ─────────────────────────────────────────────
function XpRingLarge({ percent, level }: { percent: number; level: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <div className="relative w-36 h-36">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke="url(#xpGradOwner)" strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="xpGradOwner" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{level}</span>
        <span className="text-xs text-gray-400 font-medium">LEVEL</span>
      </div>
    </div>
  );
}

const BADGE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  first_project:        { label: "First Project",    icon: "🚀", color: "bg-green-50 border-green-200 text-green-800",   desc: "Complete 1 project" },
  ten_projects:         { label: "10 Projects",      icon: "🔟", color: "bg-blue-50 border-blue-200 text-blue-800",     desc: "Complete 10 projects" },
  fifty_projects:       { label: "50 Projects",      icon: "💎", color: "bg-purple-50 border-purple-200 text-purple-800", desc: "Complete 50 projects" },
  top_rated:            { label: "Top Rated",        icon: "⭐", color: "bg-yellow-50 border-yellow-200 text-yellow-800", desc: "4.8+ avg, 5+ projects" },
  on_time_streak:       { label: "On-Time Streak",   icon: "⚡", color: "bg-cyan-50 border-cyan-200 text-cyan-800",     desc: "100% on-time, 5+ projects" },
  rising_talent:        { label: "Rising Talent",    icon: "📈", color: "bg-emerald-50 border-emerald-200 text-emerald-800", desc: "4.5+ avg, 3+ projects" },
  repeat_client_magnet: { label: "Client Magnet",    icon: "🧲", color: "bg-pink-50 border-pink-200 text-pink-800",     desc: "3+ repeat clients" },
  elite_freelancer:     { label: "Elite",            icon: "👑", color: "bg-amber-50 border-amber-200 text-amber-800",   desc: "50+ projects, 4.7+ avg" },
};

const TIER_COLORS: Record<string, string> = {
  Newcomer:        "text-gray-600 bg-gray-50 border-gray-200",
  "Rising Talent": "text-blue-700 bg-blue-50 border-blue-200",
  Pro:             "text-purple-700 bg-purple-50 border-purple-200",
  Expert:          "text-amber-700 bg-amber-50 border-amber-200",
  Elite:           "text-white bg-gradient-to-r from-amber-400 to-orange-500 border-transparent",
};

const XP_SOURCES = [
  { type: "project_completed",  label: "Project Completed",  xp: 100, note: "Verified platform orders only" },
  { type: "five_star_review",   label: "5-Star Review",      xp: 50,  note: "Client gives 5 stars" },
  { type: "on_time_delivery",   label: "On-Time Delivery",   xp: 25,  note: "Submitted before deadline" },
  { type: "repeat_client",      label: "Repeat Client",      xp: 30,  note: "Same client hires again" },
  { type: "profile_completed",  label: "Profile Complete",   xp: 50,  note: "One-time bonus" },
];

export function ProfileProgressionTab() {
  const data = useQuery(api.progression.getMyProgression);
  const updateSettings = useMutation(api.progression.updatePublicProfileSettings);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { profile, levelData, badges, lockedBadges, skills, publicSlug, isPublicProfile, privacySettings } = data;
  const tier = profile.tier ?? "Newcomer";
  const profileUrl = publicSlug ? `${window.location.origin}/u/${publicSlug}` : null;

  const handleTogglePublic = async () => {
    setSaving(true);
    try {
      await updateSettings({ isPublicProfile: !isPublicProfile });
      toast.success(isPublicProfile ? "Profile set to private" : "Public profile enabled!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handlePrivacy = async (field: "showEarnings" | "anonymizeClients", val: boolean) => {
    try {
      await updateSettings({ privacySettings: { ...privacySettings, [field]: val } });
      toast.success("Privacy settings updated");
    } catch (e: any) { toast.error(e.message); }
  };

  const copyUrl = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Level & XP Card ── */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-800/30">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <XpRingLarge percent={levelData.progressPercent} level={levelData.level} />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${TIER_COLORS[tier]}`}>
                <Award className="w-3.5 h-3.5" /> {tier}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {levelData.totalXp.toLocaleString()} <span className="text-base font-normal text-gray-500">total XP</span>
            </p>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-full h-2 shadow-inner">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${levelData.progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 shrink-0">
                {levelData.xpForCurrentLevel}/{levelData.xpForNextLevel} XP
              </span>
            </div>
            <p className="text-xs text-gray-400">{levelData.xpForNextLevel - levelData.xpForCurrentLevel} XP to Level {levelData.level + 1}</p>
          </div>
        </div>

        {/* XP source breakdown */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {XP_SOURCES.map((s) => (
            <div key={s.type} className="flex items-center justify-between bg-white dark:bg-gray-800/50 rounded-xl px-3 py-2 border border-white dark:border-gray-700">
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{s.label}</p>
                <p className="text-xs text-gray-400">{s.note}</p>
              </div>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">+{s.xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Skills ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Verified Skills</h3>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" /> = Earned from platform work
          </span>
        </div>
        {skills.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Complete projects to build your verified skill profile.</p>
        ) : (
          <div className="space-y-3">
            {skills.map((s: any) => (
              <div key={s._id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{s.skillName}</span>
                    {s.isVerified && (
                      <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold">
                        <Shield className="w-3 h-3" /> Verified
                      </span>
                    )}
                    <span className="text-xs text-gray-400">({s.verifiedProjectCount} projects)</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${s.proficiencyScore}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{s.proficiencyScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Badges ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Achievements
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Earned */}
          {badges.map((b: any) => {
            const meta = BADGE_META[b.badgeType];
            return (
              <div key={b._id} className={`rounded-xl p-3 border text-center ${meta?.color}`}>
                <div className="text-2xl mb-1">{meta?.icon}</div>
                <p className="font-semibold text-xs">{meta?.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{new Date(b.earnedAt).toLocaleDateString()}</p>
              </div>
            );
          })}
          {/* Locked */}
          {(lockedBadges || []).map((type: string) => {
            const meta = BADGE_META[type];
            return (
              <div key={type} className="rounded-xl p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center opacity-40 grayscale">
                <div className="text-2xl mb-1">{meta?.icon}</div>
                <p className="font-semibold text-xs text-gray-600 dark:text-gray-400">{meta?.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{meta?.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Public Profile Settings ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> Public Profile
        </h3>

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">Enable Public Profile</p>
            <p className="text-xs text-gray-400 mt-0.5">Recruiters can find you via a shareable link</p>
          </div>
          <button onClick={handleTogglePublic} disabled={saving} className="transition-colors">
            {isPublicProfile
              ? <ToggleRight className="w-8 h-8 text-indigo-600" />
              : <ToggleLeft className="w-8 h-8 text-gray-400" />}
          </button>
        </div>

        {/* Profile URL */}
        {isPublicProfile && profileUrl && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800/30 mb-4">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 flex-1 truncate font-mono">{profileUrl}</span>
            <button onClick={copyUrl} className="text-indigo-600 hover:text-indigo-700 transition-colors shrink-0" title="Copy">
              <Copy className="w-4 h-4" />
            </button>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </a>
            {copiedSlug && <span className="text-xs text-emerald-600 font-semibold">Copied!</span>}
          </div>
        )}

        {/* Privacy toggles */}
        <div className="space-y-3">
          {[
            { field: "showEarnings" as const,      label: "Show Earnings",       desc: "Display total earnings on public profile", icon: <Eye className="w-4 h-4" /> },
            { field: "anonymizeClients" as const,  label: "Anonymize Clients",   desc: "Hide client names on public profile",      icon: <EyeOff className="w-4 h-4" /> },
          ].map((setting) => (
            <div key={setting.field} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{setting.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{setting.label}</p>
                  <p className="text-xs text-gray-400">{setting.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handlePrivacy(setting.field, !privacySettings[setting.field])}
                className="transition-colors"
              >
                {privacySettings[setting.field]
                  ? <ToggleRight className="w-7 h-7 text-indigo-600" />
                  : <ToggleLeft className="w-7 h-7 text-gray-400" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
