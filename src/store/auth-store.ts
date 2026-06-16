import { type Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/services/supabase';

type AuthState = {
  session: Session | null;
  /** True once the initial getSession() has resolved (auth state is known). */
  initialized: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  initialized: false,

  async init() {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, initialized: true });
    // Keep the store in sync with sign-in / sign-out / token refresh.
    supabase.auth.onAuthStateChange((_event, session) => set({ session }));
  },

  async signOut() {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
