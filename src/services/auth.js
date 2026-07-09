import { supabase } from './supabase.js';

export const authService = {
  /**
   * Log in a user using email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{user: any, error: any}>}
   */
  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Auth login failed:', error.message);
      return { user: null, error };
    }
  },

  /**
   * Sign out the current user
   * @returns {Promise<{error: any}>}
   */
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Auth logout failed:', error.message);
      return { error };
    }
  },

  /**
   * Get the current authenticated user session
   * @returns {Promise<any>}
   */
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  /**
   * Get the active session object
   * @returns {Promise<any>}
   */
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  },

  /**
   * Subscribe to auth state updates
   * @param {function} callback 
   * @returns {any} subscription
   */
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  }
};
