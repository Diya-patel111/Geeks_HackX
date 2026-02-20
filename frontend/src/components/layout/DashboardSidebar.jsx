import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

const CATEGORIES = [
  { icon: 'grid_view', label: 'All Issues', value: '' },
  { icon: 'engineering', label: 'Infrastructure', value: 'Infrastructure' },
  { icon: 'water_drop', label: 'Utilities', value: 'Utilities' },
  { icon: 'shield', label: 'Public Safety', value: 'Public Safety' },
  { icon: 'park', label: 'Environment', value: 'Environment' },
];

/**
 * Dashboard sidebar — categories nav, status filters, quick report CTA.
 *
 * Props:
 *  - activeCategory  {string}   current category filter
 *  - setCategory     {fn}       setter
 *  - statusFilters   {object}   { open, inProgress, resolved }
 *  - toggleStatus    {fn}       toggleStatus('open' | 'inProgress' | 'resolved')
 */
export default function DashboardSidebar({
  activeCategory = '',
  setCategory,
  statusFilters = { open: true, inProgress: true, resolved: false },
  toggleStatus,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto hidden lg:flex flex-col">
      <div className="p-6 space-y-8 flex-1">
        {/* Categories */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Categories
          </h3>
          <nav className="space-y-1">
            {CATEGORIES.map(({ icon, label, value }) => (
              <button
                key={value}
                onClick={() => setCategory?.(value)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-left transition-colors ${
                  activeCategory === value
                    ? 'bg-[#1e3b8a]/10 text-[#1e3b8a]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Status filters */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Status Filter
          </h3>
          <div className="space-y-3">
            {[
              { key: 'open', label: 'Open Reports' },
              { key: 'inProgress', label: 'In Progress' },
              { key: 'resolved', label: 'Resolved' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilters[key] ?? false}
                  onChange={() => toggleStatus?.(key)}
                  className="rounded text-[#1e3b8a] focus:ring-[#1e3b8a] bg-slate-100 dark:bg-slate-800 border-none"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 space-y-2 border-t border-slate-100 dark:border-slate-800">
        <Link
          to="/issues/new"
          className="w-full flex items-center justify-center gap-2 bg-[#1e3b8a] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#1e3b8a]/90 transition-all shadow-lg shadow-[#1e3b8a]/20"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
          Report New Issue
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
