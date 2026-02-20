import { useEffect, useState, useCallback } from 'react';
import AppHeader from '@components/layout/AppHeader';
import AdminSidebar from '@components/layout/AdminSidebar';
import AdminIssueRow from '@components/issues/AdminIssueRow';
import StatCard from '@components/ui/StatCard';
import Loader from '@components/common/Loader';
import { useAuth } from '@hooks/useAuth';
import { issueService } from '@services/issueService';

const TABS = [
  { key: 'pending',    label: 'Pending Review' },
  { key: 'open',       label: 'Open'            },
  { key: 'resolved',   label: 'Resolved'        },
  { key: 'all',        label: 'All Issues'      },
];

const ADMIN_HEADER_NAV = [
  { label: 'Overview', to: '/admin',          active: true  },
  { label: 'Reports',  to: '/admin/reports'               },
  { label: 'Settings', to: '/admin/settings'              },
];

/* Bar chart row */
function CategoryBar({ label, pct, color = 'bg-[#1e3b8a]' }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-slate-600 w-32 shrink-0">{label}</p>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold text-slate-500 w-8 text-right">{pct}%</p>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();

  const [activeTab,     setActiveTab]     = useState('pending');
  const [adminStats,    setAdminStats]    = useState(null);
  const [issues,        setIssues]        = useState([]);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  /* Load admin stats once */
  useEffect(() => {
    issueService
      .getAdminStats()
      .then((d) => setAdminStats(d))
      .catch(() =>
        setAdminStats({ totalPending: 0, newToday: 0, avgResolutionDays: 0, categoryBreakdown: [] }),
      )
      .finally(() => setLoadingStats(false));
  }, []);

  /* Load issues when tab or page changes */
  const loadIssues = useCallback(() => {
    setLoadingIssues(true);
    const status = activeTab === 'all' ? undefined : activeTab;
    issueService
      .getIssues({ status, page, limit: 10 })
      .then((data) => {
        setIssues(data.issues ?? data);
        setTotalPages(data.pagination?.totalPages ?? 1);
      })
      .catch(() => setIssues([]))
      .finally(() => setLoadingIssues(false));
  }, [activeTab, page]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const handleResolve = async (id) => {
    setActionLoading(id);
    try {
      await issueService.updateStatus(id, { status: 'resolved' });
      loadIssues();
    } catch { /* swallow */ } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this issue?')) return;
    setActionLoading(id);
    try {
      await issueService.deleteIssue(id);
      loadIssues();
    } catch { /* swallow */ } finally {
      setActionLoading(null);
    }
  };

  const stats = [
    { label: 'Total Pending',   value: adminStats?.totalPending   ?? '—', icon: 'pending_actions', color: 'text-amber-600'    },
    { label: 'New Today',       value: adminStats?.newToday       ?? '—', icon: 'today',           color: 'text-[#1e3b8a]'   },
    { label: 'Avg Resolution',  value: adminStats?.avgResolutionDays ? `${adminStats.avgResolutionDays}d` : '—', icon: 'avg_pace', color: 'text-emerald-600' },
  ];

  const categoryBreakdown = adminStats?.categoryBreakdown ?? [
    { label: 'Infrastructure',  pct: 38 },
    { label: 'Utilities',       pct: 24 },
    { label: 'Public Safety',   pct: 18 },
    { label: 'Environment',     pct: 12 },
    { label: 'Other',           pct: 8  },
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] font-display flex flex-col">
      <AppHeader
        logoTo="/admin"
        logoText="JanAwaaz Admin"
        navLinks={ADMIN_HEADER_NAV}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Admin sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0">
          <AdminSidebar admin={{ name: user?.name ?? 'Admin', role: 'Administrator', avatar: user?.avatar }} />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8">

          {/* Summary stat cards */}
          {loadingStats ? (
            <div className="flex justify-center py-8"><Loader /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map(({ label, value, icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
                  <div className={`size-11 rounded-xl bg-slate-50 flex items-center justify-center ${color}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Analytics row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-5">Issues by Category</h3>
              <div className="space-y-4">
                {categoryBreakdown.map((c) => (
                  <CategoryBar key={c.label} label={c.label} pct={c.pct} />
                ))}
              </div>
            </div>

            {/* Hotspot map placeholder */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h3 className="font-semibold text-slate-800 mb-3">Issue Hotspot Map</h3>
              <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 min-h-[160px]">
                <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 40 }}>map</span>
                <p className="text-sm text-slate-400">Map integration coming soon</p>
              </div>
            </div>
          </div>

          {/* Issues table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table header with tabs */}
            <div className="px-6 pt-5 pb-0 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Issue Management</h3>
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setActiveTab(t.key); setPage(1); }}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                      activeTab === t.key
                        ? 'border-[#1e3b8a] text-[#1e3b8a]'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingIssues ? (
              <div className="flex justify-center py-16"><Loader /></div>
            ) : issues.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="material-symbols-outlined text-slate-200" style={{ fontSize: 48 }}>inbox</span>
                <p className="text-slate-400 mt-3 text-sm">No issues in this category.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f6f6f8] text-left">
                      <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Issue ID</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date / Time</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Category</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Reported By</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {issues.map((issue) => (
                      <AdminIssueRow
                        key={issue._id}
                        issue={issue}
                        onResolve={handleResolve}
                        onDelete={handleDelete}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
