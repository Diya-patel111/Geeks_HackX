import api from './api';
import { GOOGLE_AUTH_URL } from '@utils/constants';

/**
 * All calls return the `data` field from the ApiResponse envelope.
 * The response interceptor in api.js unwraps `response.data`, so
 * `result.data` below refers to ApiResponse.data (the actual payload).
 */

export const authService = {
  /**
   * Register a new user.
   * Backend returns ApiResponse.data = { token, user }.
   * We store the JWT in-memory (never localStorage) and return only the user.
   * @param {{ name, email, password, confirmPassword, role? }} payload
   */
  register: async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { token, user } = res.data ?? {};
    // Primary auth: httpOnly cookie (set by backend).
    // Fallback: in-memory Bearer token for environments where cookies may be blocked.
    if (token) api.setToken(token);
    return user;
  },

  /**
   * Login with email + password.
   * Backend returns ApiResponse.data = { token, user }.
   * @param {{ email, password }} payload
   */
  login: async (payload) => {
    const res = await api.post('/auth/login', payload);
    const { token, user } = res.data ?? {};
    if (token) api.setToken(token);
    return user;
  },

  /**
   * Logout — clears httpOnly cookie on the server.
   * Uses try/finally so the in-memory token is ALWAYS cleared even on network failure.
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.clearToken();
    }
  },

  /**
   * Get the currently authenticated user (restores session from cookie).
   * Throws if not authenticated — callers should handle gracefully.
   */
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  /**
   * Update profile fields (name, avatar, location).
   * @param {FormData|object} payload
   */
  updateProfile: async (payload) => {
    const isFormData = payload instanceof FormData;
    const res = await api.patch('/auth/me', payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  /**
   * Change password.
   * Backend rotates the JWT after a password change — update the in-memory token.
   * @param {{ currentPassword, newPassword, confirmPassword }} payload
   */
  changePassword: async (payload) => {
    const res = await api.patch('/auth/change-password', payload);
    const { token } = res.data ?? {};
    if (token) api.setToken(token); // rotate in-memory token
  },

  /**
   * Soft-delete the account.
   */
  deleteAccount: async () => {
    await api.delete('/auth/account');
    api.clearToken();
  },

  /**
   * Redirect to Google OAuth.
   * Not an API call — navigates the browser to the backend OAuth route.
   */
  loginWithGoogle: () => {
    window.location.href = GOOGLE_AUTH_URL;
  },
};
