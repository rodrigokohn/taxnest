import { create } from 'zustand';

import { userProfileRepo } from '@/data';
import { type UserProfile } from '@/domain';

type ProfileState = {
  profile: UserProfile | null;
  loaded: boolean;
  load: () => Promise<void>;
  save: (profile: UserProfile) => Promise<void>;
  update: (patch: Partial<UserProfile>) => Promise<void>;
};

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: null,
  loaded: false,

  async load() {
    const profile = await userProfileRepo.get();
    set({ profile, loaded: true });
  },

  async save(profile) {
    const saved = await userProfileRepo.save(profile);
    set({ profile: saved, loaded: true });
  },

  async update(patch) {
    const current = get().profile;
    if (!current) return;
    const updated: UserProfile = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    await userProfileRepo.save(updated);
    set({ profile: updated });
  },
}));
