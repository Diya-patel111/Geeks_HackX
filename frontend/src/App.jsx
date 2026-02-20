import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@components/common/ProtectedRoute';
import PublicRoute    from '@components/common/PublicRoute';
import ErrorBoundary from '@components/common/ErrorBoundary';

// Pages — lazy-loaded for code-splitting
import { lazy, Suspense } from 'react';
import Loader from '@components/common/Loader';

const Home               = lazy(() => import('@pages/Home'));
const Login              = lazy(() => import('@pages/Login'));
const Register           = lazy(() => import('@pages/Register'));
const Dashboard          = lazy(() => import('@pages/Dashboard'));
const Profile            = lazy(() => import('@pages/Profile'));
const AdminPanel         = lazy(() => import('@pages/AdminPanel'));
const IssueDetail        = lazy(() => import('@pages/IssueDetail'));
const CreateIssue        = lazy(() => import('@pages/CreateIssue'));
const NotFound           = lazy(() => import('@pages/NotFound'));
const GoogleOAuthSuccess = lazy(() => import('@pages/GoogleOAuthSuccess'));
const MyIssues               = lazy(() => import('@pages/MyIssues'));
const VerificationRequests   = lazy(() => import('@pages/VerificationRequests'));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader fullScreen />}>
        <Routes>
          {/* ── Fully public ─────────────────────────────────────────────── */}
          <Route path="/" element={<Home />} />

          {/* OAuth callback — handles Google redirect, no auth guard needed */}
          <Route path="/auth/google/success" element={<GoogleOAuthSuccess />} />

          {/* ── Public-only (redirect away if already logged in) ─────────── */}
          <Route element={<PublicRoute />}>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* ── Protected — any authenticated user ───────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"         element={<Dashboard />} />
            <Route path="/issues/new"         element={<CreateIssue />} />
            <Route path="/issues/:id"         element={<IssueDetail />} />
            <Route path="/profile"            element={<Profile />} />
            <Route path="/my-issues"          element={<MyIssues />} />
            <Route path="/verify-requests"    element={<VerificationRequests />} />
          </Route>

          {/* ── Admin / official only ─────────────────────────────────────── */}
          <Route element={<ProtectedRoute roles={['admin', 'official']} />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          {/* ── Catch-all ─────────────────────────────────────────────────── */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
