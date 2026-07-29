import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import {
  Star, CheckCircle2, Award, TrendingUp, Briefcase, Clock,
  Users, Shield, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";

// ── XP ring helper ────────────────────────────────────────────────────────────
function XpRing({ percent, level }: { percent: number; level: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="url(#xpGrad)" strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Tier badge chip ───────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  Newcomer:      "bg-gray-100 text-gray-700 border-gray-200",
  "Rising Talent": "bg-blue-50 text-blue-700 border-blue-200",
  Pro:           "bg-purple-50 text-purple-700 border-purple-200",
  Expert:        "bg-amber-50 text-amber-700 border-amber-200",
  Elite:         "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-transparent",
};

// ── Badge metadata ────────────────────────────────────────────────────────────
const BADGE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  first_project:        { label: "First Project",       icon: "🚀", color: "bg-green-50 border-green-200",   desc: "Delivered your first platform project" },
  ten_projects:         { label: "10 Projects",         icon: "🔟", color: "bg-blue-50 border-blue-200",     desc: "Completed 10 verified projects" },
  fifty_projects:       { label: "50 Projects",         icon: "💎", color: "bg-purple-50 border-purple-200", desc: "Completed 50 verified projects" },
  top_rated:            { label: "Top Rated",           icon: "⭐", color: "bg-yellow-50 border-yellow-200", desc: "4.8+ average with 5+ projects" },
  on_time_streak:       { label: "On-Time Streak",      icon: "⚡", color: "bg-cyan-50 border-cyan-200",     desc: "100% on-time delivery rate" },
  rising_talent:        { label: "Rising Talent",       icon: "📈", color: "bg-emerald-50 border-emerald-200", desc: "4.5+ rating with 3+ projects" },
  repeat_client_magnet: { label: "Client Magnet",       icon: "🧲", color: "bg-pink-50 border-pink-200",     desc: "3+ clients returned for more work" },
  elite_freelancer:     { label: "Elite Freelancer",    icon: "👑", color: "bg-amber-50 border-amber-200",   desc: "50+ projects, 4.7+ rating" },
};

// ── Skill bar ─────────────────────────────────────────────────────────────────
function SkillBar({ skill }: { skill: any }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize truncate">
            {skill.skillName}
          </span>
          {skill.isVerified && (
            <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold">
              <Shield className="w-3 h-3" /> Verified
            </span>
          )}
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
            style={{ width: `${skill.proficiencyScore}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 w-8 text-right shrink-0">{skill.proficiencyScore}</span>
    </div>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = ["Overview", "Portfolio", "Skills", "Achievements", "Reviews"] as const;
type Tab = typeof TABS[number];

// ── Main Component ────────────────────────────────────────────────────────────
export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const data = useQuery(
    api.progression.getPublicProfileBySlug,
    username ? { slug: username } : "skip"
  );

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">👤</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile not found</h1>
          <p className="text-gray-500">This profile doesn't exist or isn't public.</p>
        </div>
      </div>
    );
  }

  const { profile, levelData, badges, skills, stats, completedProjects, reviews, activityMap } = data;
  const tier = profile.tier ?? "Newcomer";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar + XP ring */}
            <div className="relative w-28 h-28 shrink-0">
              <XpRing percent={levelData.progressPercent} level={levelData.level} />
              {profile.profilePictureUrl ? (
                <img
                  src={profile.profilePictureUrl}
                  alt={profile.firstName}
                  className="absolute inset-2 w-24 h-24 rounded-full object-cover border-3 border-white shadow-lg"
                />
              ) : (
                <div className="absolute inset-2 w-24 h-24 rounded-full bg-indigo-400 flex items-center justify-center border-3 border-white shadow-lg">
                  <span className="text-3xl font-bold text-white">
                    {profile.firstName?.[0]}{profile.lastName?.[0]}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-white text-indigo-700 text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-md border border-indigo-100">
                {levelData.level}
              </div>
            </div>

            {/* Name + tier + tagline */}
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {profile.firstName} {profile.lastName}
                </h1>
                <span className={`self-center inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${TIER_COLORS[tier]}`}>
                  <Award className="w-3 h-3" /> {tier}
                </span>
                {profile.isVerified && (
                  <span className="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-white/80 mb-1">{profile.tagline || "Student Freelancer"}</p>
              {profile.collegeName && (
                <p className="text-white/60 text-sm">{profile.collegeName}{profile.graduationYear ? ` · Class of ${profile.graduationYear}` : ""}</p>
              )}

              {/* XP progress */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-white/20 rounded-full h-1.5 max-w-48">
                  <div
                    className="h-1.5 rounded-full bg-white transition-all duration-700"
                    style={{ width: `${levelData.progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-white/70">
                  {levelData.xpForCurrentLevel}/{levelData.xpForNextLevel} XP to Lv.{levelData.level + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Key stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Projects", value: stats.projectCount, icon: <Briefcase className="w-4 h-4" /> },
              { label: "Rating", value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ★` : "New", icon: <Star className="w-4 h-4" /> },
              { label: "On-Time", value: `${stats.onTimeRate}%`, icon: <Clock className="w-4 h-4" /> },
              { label: "Repeat Clients", value: `${stats.repeatClientRate}%`, icon: <Users className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
                <div className="flex items-center justify-center gap-1 text-white/70 text-xs mb-1">
                  {s.icon} {s.label}
                </div>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── OVERVIEW ── */}
        {activeTab === "Overview" && (
          <div className="space-y-8">
            {/* Bio */}
            {profile.bio && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-900 dark:text-white mb-3">About</h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Featured badges */}
            {badges.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">Achievements</h2>
                <div className="flex flex-wrap gap-3">
                  {badges.slice(0, 5).map((b: any) => {
                    const meta = BADGE_META[b.badgeType];
                    return (
                      <div key={b._id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${meta?.color}`} title={meta?.desc}>
                        <span className="text-lg">{meta?.icon}</span>
                        {meta?.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent projects */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Recent Work</h2>
              {completedProjects.length === 0 ? (
                <p className="text-gray-400 text-center py-6 border border-dashed rounded-xl">No completed projects yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {completedProjects.slice(0, 4).map((p: any) => (
                    <ProjectCard key={p._id} project={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Top skills */}
            {skills.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-900 dark:text-white mb-4">Top Skills</h2>
                <div className="space-y-3">
                  {skills.slice(0, 6).map((s: any) => <SkillBar key={s._id} skill={s} />)}
                </div>
              </div>
            )}

            {/* Contribution heatmap */}
            <ContributionHeatmap activityMap={activityMap} />
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {activeTab === "Portfolio" && (
          <div>
            {completedProjects.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No verified projects yet</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {completedProjects.map((p: any) => (
                  <ProjectCard key={p._id} project={p} expanded={expandedProject === p._id}
                    onToggle={() => setExpandedProject(expandedProject === p._id ? null : p._id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SKILLS ── */}
        {activeTab === "Skills" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Skills</h2>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-500" /> = Verified by platform work
              </span>
            </div>
            {skills.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Skills are verified as projects complete.</p>
            ) : (
              <div className="space-y-4">
                {skills.map((s: any) => <SkillBar key={s._id} skill={s} />)}
              </div>
            )}
          </div>
        )}

        {/* ── ACHIEVEMENTS ── */}
        {activeTab === "Achievements" && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.entries(BADGE_META).map(([type, meta]) => {
                const earned = badges.find((b: any) => b.badgeType === type);
                return (
                  <div
                    key={type}
                    className={`rounded-2xl p-4 border text-center transition-all ${
                      earned
                        ? `${meta.color} shadow-sm`
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-40 grayscale"
                    }`}
                  >
                    <div className="text-3xl mb-2">{meta.icon}</div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{meta.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{meta.desc}</p>
                    {earned && (
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(earned.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REVIEWS ── */}
        {activeTab === "Reviews" && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No public reviews yet</p>
              </div>
            ) : (
              reviews.map((r: any) => (
                <div key={r._id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-sm">
                        {r.reviewerName[0]}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{r.reviewerName}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, expanded, onToggle }: {
  project: any; expanded?: boolean; onToggle?: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">
            {project.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Verified
            </span>
          </div>
        </div>

        <p className={`text-gray-500 text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
          {project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
            {project.category}
          </span>
          {(project.skills || []).slice(0, 3).map((s: string) => (
            <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
              {s}
            </span>
          ))}
        </div>

        {project.review && (
          <div className="mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3">
            <div className="flex gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < project.review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">"{project.review.comment}"</p>
            <p className="text-xs text-gray-400 mt-1">— {project.review.clientName}</p>
          </div>
        )}

        {onToggle && (
          <button onClick={onToggle} className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Contribution Heatmap ──────────────────────────────────────────────────────
function ContributionHeatmap({ activityMap }: { activityMap: Record<string, number> }) {
  const today = new Date();
  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // align to Sunday

  let week: Array<{ date: string; count: number } | null> = [];
  const cur = new Date(start);
  while (cur <= today) {
    if (week.length === 7) { weeks.push(week); week = []; }
    const ds = cur.toISOString().split("T")[0];
    if (cur > today) { week.push(null); }
    else { week.push({ date: ds, count: activityMap[ds] || 0 }); }
    cur.setDate(cur.getDate() + 1);
  }
  if (week.length) weeks.push(week);

  const intensity = (c: number) => {
    if (c === 0) return "bg-gray-100 dark:bg-gray-800";
    if (c <= 2) return "bg-emerald-200 dark:bg-emerald-800";
    if (c <= 5) return "bg-emerald-400";
    return "bg-emerald-600";
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 dark:text-white">Activity</h2>
        <span className="text-xs text-gray-400">Last 12 months</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${day ? intensity(day.count) : "opacity-0"}`}
                  title={day ? `${day.date}: ${day.count} activities` : ""}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <span>Less</span>
        {["bg-gray-100 dark:bg-gray-800", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
