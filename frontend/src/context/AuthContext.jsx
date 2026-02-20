import { createContext, useCallback, useEffect, useMemo, useReducer } from 'react';
import { authService } from '@services/authService';

// ─── State shape ─────────────────────────────────────────────────────────────
/**
 * Token storage strategy (in priority order):
 *   1. httpOnly cookie  — set by backend on login/register/OAuth, survives page refresh,
 *                         invisible to JS (XSS-proof).  Sent automatically by the browser.
 *   2. In-memory token  — held in api.js `_inMemoryToken`, used as Authorization Bearer header.
 *                         Cleared on page refresh but useful when cookies are blocked (CORS,
 *                         cross-site embedding).  Populated by authService.login/register.
 *   Never stored in localStorage or sessionStorage — vulnerable to XSS.
 */
const initialState = {
  user:            null,
  isAuthenticated: false,
  isLoading:       true,   // true until the initial /me session-restore resolves
  authError:       null,   // last auth-level error (wrong password, etc.)
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
const AUTH_ACTIONS = {
  SET_USER:    'SET_USER',    // full user replace (login / register / getMe)
  UPDATE_USER: 'UPDATE_USER', // partial merge (profile edits)
  CLEAR_USER:  'CLEAR_USER',  // logout / session expired
  SET_LOADING: 'SET_LOADING',
  SET_ERROR:   'SET_ERROR',
};

function authReducer(state, { type, payload }) {
  switch (type) {
    case AUTH_ACTIONS.SET_USER:
      return { ...state, user: payload, isAuthenticated: true, isLoading: false, authError: null };
    case AUTH_ACTIONS.UPDATE_USER:
      return { ...state, user: { ...state.user, ...payload }, isLoading: false };
    case AUTH_ACTIONS.CLEAR_USER:
      return { ...state, user: null, isAuthenticated: false, isLoading: false, authError: null };
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, isLoading: payload };
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, authError: payload, isLoading: false };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ─── Session restore on mount ─────────────────────────────────────────────
  // Silently checks the httpOnly cookie with GET /auth/me.
  // If the cookie is valid the backend returns the user; otherwise 401 → CLEAR_USER.
  useEffect(() => {
    let cancelled = false;
    authService.getMe()
      .then((user) => {
        if (!cancelled) dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
      })
      .catch((err) => {
        if (!cancelled) {
          // 401 = not logged in (expected).  Any other status = unexpected server issue.
          if (err?.status !== 401) {
            console.error('[AuthContext] Unexpected error during session restore:', err.message);
          }
          dispatch({ type: AUTH_ACTIONS.CLEAR_USER });
        }
      });
    return () => { cancelled = true; };
  }, []);

  // ─── Auth actions ──────────────────────────────────────────────────────────

  /**
   * Login with email + password.
   * authService.login returns just the user object (token stored in-memory via api.setToken).
   */
  const login = useCallback(async (credentials) => {
    const user = await authService.login(credentials); // throws on error
    dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
    return user;
  }, []);

  /**
   * Register a new account.
   */
  const register = useCallback(async (data) => {
    const user = await authService.register(data);
    dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
    return user;
  }, []);

  /**
   * Logout — clears httpOnly cookie on the server and wipes in-memory token.
   * Swallows network errors so the UI always transitions to logged-out state.
   */
  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    dispatch({ type: AUTH_ACTIONS.CLEAR_USER });
  }, []);

  /**
   * Update profile fields (name, avatar, location).
   * Uses UPDATE_USER so unrelated fields aren't clobbered.
   */
  const updateProfile = useCallback(async (data) => {
    const updated = await authService.updateProfile(data);
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updated });
    return updated;
  }, []);

  /**
   * Change password.  Backend rotates the JWT; authService updates the in-memory token.
   */
  const changePassword = useCallback(async (data) => {
    await authService.changePassword(data);
    // No state change needed — user object stays the same; JWT rotated in api.js
  }, []);

  /**
   * Manually refresh the user from the server (e.g. after OAuth redirect).
   */
  const refreshSession = useCallback(async () => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    try {
      const user = await authService.getMe();
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: user });
      return user;
    } catch {
      dispatch({ type: AUTH_ACTIONS.CLEAR_USER });
      return null;
    }
  }, []);

  // Memoize so consumers only re-render when state or actions change
  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshSession,
  }), [state, login, register, logout, updateProfile, changePassword, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
