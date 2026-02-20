import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import Navbar from '@components/layout/Navbar';
import Footer from '@components/layout/Footer';
import ActivityItem from '@components/issues/ActivityItem';
import Loader from '@components/common/Loader';
import { issueService } from '@services/issueService';
import { timeAgo } from '@utils/formatters';

/* ── Stat pill ──────────────────────────────────────────────────────────────── */
function ProfileStat({ icon, value, label, color = 'text-[#1e3b8a]' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`size-11 rounded-xl bg-slate-50 flex items-center justify-center ${color}`}>
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ── Badge chip ─────────────────────────────────────────────────────────────── */
function BadgeChip({ icon, label }) {
  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold rounded-full">
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </span>
  );
}

export default function Profile() {
  const { user } = useAuth();

  const [activity,      setActivity]      = useState([]);
  const [stats,         setStats]         = useState(null);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [loadingAct,    setLoadingAct]    = useState(true);

  useEffect(() => {
    if (!user) return;

    /* Fetch user stats */
    issueService
      .getUserStats()
      .then((data) => setStats(data))
      .catch(() => setStats({ issueCount: 0, verificationCount: 0, resolvedCount: 0 }))
      .finally(() => setLoadingStats(false));

    /* Fetch recent activity */
    issueService
      .getUserActivity()
      .then((data) => setActivity(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => setActivity([]))
      .finally(() => setLoadingAct(false));
  }, [user]);

  if (!user) return null; // ProtectedRoute handles redirect

  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <div className="min-h-screen bg-[#f6f6f8] font-display flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">

        {/* ── Profile header card ── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Cover strip */}
          <div className="h-28 bg-gradient-to-br from-[#1e3b8a] to-blue-600" />

          <div className="px-6 pb-6">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-12 mb-4 flex-wrap gap-4">
              <div className="size-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="size-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-[#1e3b8a]">{initials}</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings</span>
                  Settings
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3b8a] text-white rounded-lg text-sm font-semibold hover:bg-[#1e3b8a]/90 transition-colors shadow-sm shadow-[#1e3b8a]/20">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Name + email + badges row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                <p className="text-slate-500 text-sm mt-0.5">{user.email}</p>
                {user.location && (
                  <p className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                    {user.location}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <BadgeChip icon="verified" label="Verified Citizen" />
                {user.role === 'official' && <BadgeChip icon="shield" label="Official" />}
                <BadgeChip icon="emoji_events" label="Top Reporter" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats row ── */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">Your Impact</h2>
          {loadingStats ? (
            <div className="flex justify-center py-8"><Loader /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ProfileStat icon="campaign" value={stats?.issueCount ?? 0}        label="Issues Reported" />
              <ProfileStat icon="verified" value={stats?.verificationCount ?? 0} label="Verifications"    color="text-emerald-600" />
              <ProfileStat icon="task_alt" value={stats?.resolvedCount ?? 0}     label="Issues Resolved"  color="text-blue-500" />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Activity timeline ── */}
          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Recent Activity</h2>

            {loadingAct ? (
              <div className="flex justify-center py-8"><Loader /></div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="material-symbols-outlined text-slate-200 block mb-2" style={{ fontSize: 48 }}>history</span>
                <p className="text-slate-400 text-sm">No activity yet. Start by reporting an issue.</p>
              </div>
            ) : (
              <ul className="relative">
                {activity.map((item, i) => (
                  <ActivityItem
                    key={item._id ?? i}
                    type={item.type}
                    text={item.text}
                    issueId={item.issueId}
                    issueTitle={item.issueTitle}
                    badge={item.badge}
                    badgeDesc={item.badgeDesc}
                    status={item.status}
                    createdAt={item.createdAt}
                    isLast={i === activity.length - 1}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* ── Sidebar cards ── */}
          <aside className="space-y-5">
            {/* Impact milestone */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>emoji_events</span>
                <h3 className="font-semibold text-slate-800">Impact Milestone</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                You're {15 - (stats?.issueCount ?? 0 % 15)} reports away from the{' '}
                <span className="font-semibold text-[#1e3b8a]">Community Champion</span> badge.
              </p>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#1e3b8a] rounded-full transition-all"
                  style={{ width: `${Math.min(((stats?.issueCount ?? 0) % 15) / 15 * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Location impact */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#1e3b8a]" style={{ fontSize: 20 }}>location_on</span>
                <h3 className="font-semibold text-slate-800">Local Impact</h3>
              </div>
              <p className="text-sm text-slate-500">
                Your reports contribute to improving your area. Keep reporting to raise community awareness.
              </p>
              <Link
                to="/dashboard"
                className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#1e3b8a] hover:underline"
              >
                Browse local issues
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
