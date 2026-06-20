import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'taxnest.theme';

type ThemeState = {
  preference: ThemePreference;
  loaded: boolean;
  init: () => Promise<void>;
  setPreference: (p: ThemePreference) => void;
};

/** User's Appearance choice (System / Light / Dark), persisted across launches. */
export const useThemeStore = create<ThemeState>()((set) => ({
  preference: 'system',
  loaded: false,

  async init() {
    const raw = await AsyncStorage.getItem(KEY);
    const preference = raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
    set({ preference, loaded: true });
  },

  setPreference(preference) {
    set({ preference });
    void AsyncStorage.setItem(KEY, preference);
  },
}));
