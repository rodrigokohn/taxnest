import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { newId } from '@/lib/id';

export type ChatRole = 'user' | 'assistant';
export type ChatMessage = { id: string; role: ChatRole; text: string; createdAt: string };
export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const STORAGE_KEY = 'taxnest.chats';
const MAX_CONVERSATIONS = 50;

type ChatState = {
  conversations: Conversation[];
  activeId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  /** Start a fresh, empty chat (created lazily on the first message). */
  startNew: () => void;
  setActive: (id: string) => void;
  /** Append a message to the active chat (creating one on the first message). Returns the message id. */
  addMessage: (role: ChatRole, text: string) => string;
  remove: (id: string) => void;
};

function persist(conversations: Conversation[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)).catch(() => {});
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  activeId: null,
  loaded: false,

  async load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const conversations = raw ? (JSON.parse(raw) as Conversation[]) : [];
      set({ conversations, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  startNew() {
    set({ activeId: null });
  },

  setActive(id) {
    set({ activeId: id });
  },

  addMessage(role, text) {
    const msgId = newId();
    set((s) => {
      const now = new Date().toISOString();
      let activeId = s.activeId;
      let conversations = s.conversations;

      if (!activeId) {
        activeId = newId();
        conversations = [
          { id: activeId, title: 'New chat', updatedAt: now, messages: [] },
          ...conversations,
        ].slice(0, MAX_CONVERSATIONS);
      }

      const msg: ChatMessage = { id: msgId, role, text, createdAt: now };
      conversations = conversations.map((c) =>
        c.id === activeId
          ? {
              ...c,
              updatedAt: now,
              // Title the chat from its first user message.
              title: c.messages.length === 0 && role === 'user' ? text.slice(0, 48) : c.title,
              messages: [...c.messages, msg],
            }
          : c,
      );
      persist(conversations);
      return { conversations, activeId };
    });
    return msgId;
  },

  remove(id) {
    set((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      persist(conversations);
      return { conversations, activeId: s.activeId === id ? null : s.activeId };
    });
  },
}));
