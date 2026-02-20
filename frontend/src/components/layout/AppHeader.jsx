import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';

/**
 * Top header bar for interior app pages (Dashboard, Admin).
 *
 * Props:
 *  - title     {string}  breadcrumb / back-label
 *  - logoTo    {string}  where logo links to
 *  - logoText  {string}  brand text
 *  - navLinks  {Array}   [{ label, to, active? }]
 */
export default function AppHeader({
  logoTo = '/dashboard',
  logoText = 'JanAwaaz',
  navLinks = [],
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 shrink-0 z-20">
      {/* Left: logo + nav */}
      <div className="flex items-center gap-8">
        <Link to={logoTo} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3b8a] text-white">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>account_balance</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{logoText}</h2>
        </Link>

        {navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ label, to, active }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-${active ? 'semibold text-[#1e3b8a]' : 'medium text-slate-600 dark:text-slate-400 hover:text-[#1e3b8a]'} transition-colors`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: 18 }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search issues..."
            className="h-10 w-64 rounded-lg border-none bg-slate-100 dark:bg-slate-800 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#1e3b8a]/50 transition-all outline-none"
          />
        </div>

        <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 relative">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>notifications</span>
        </button>

        <Link
          to="/profile"
          className="h-10 w-10 rounded-full border-2 border-[#1e3b8a]/20 bg-[#1e3b8a]/10 flex items-center justify-center overflow-hidden"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[#1e3b8a] text-xs font-bold uppercase">
              {user?.name?.[0] ?? 'U'}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
