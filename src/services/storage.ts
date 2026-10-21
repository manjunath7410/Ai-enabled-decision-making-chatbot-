/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecisionSession } from '../types/decision.ts';

const STORAGE_KEY = 'decideai_sessions_v1';
const ACTIVE_SESSION_KEY = 'decideai_active_session_id';

// In-memory fallback storage in case browser localStorage is restricted, disabled, or full
const memoryStore: Record<string, string> = {};

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__decideai_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function getItem(key: string): string | null {
  if (isLocalStorageAvailable()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }
  return memoryStore[key] || null;
}

function setItem(key: string, value: string): boolean {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      console.warn('LocalStorage write failed, falling back to memory store:', e);
      memoryStore[key] = value;
      return false;
    }
  }
  memoryStore[key] = value;
  return true;
}

function removeItem(key: string): void {
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      delete memoryStore[key];
    }
  }
  delete memoryStore[key];
}

export const storageService = {
  /**
   * Returns storage architecture information for complete user privacy transparency
   */
  getStorageInfo() {
    const isLocal = isLocalStorageAvailable();
    return {
      type: isLocal ? ('localStorage' as const) : ('inMemory' as const),
      isPersistentAcrossTabs: isLocal,
      isEncryptedLocally: false,
      serverStorage: false,
      cloudSync: false,
      locationDescription: isLocal
        ? 'Stored strictly on this device in your browser local storage.'
        : 'Stored in temporary browser session memory (localStorage unavailable).',
      deletionGuarantee:
        'Deleting a conversation removes it immediately and permanently from this browser. No server copies or shadow backups exist.',
    };
  },

  getSessions(): DecisionSession[] {
    try {
      const data = getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed as DecisionSession[];
    } catch (e) {
      console.warn('Failed to parse sessions from storage:', e);
      return [];
    }
  },

  saveSessions(sessions: DecisionSession[]): boolean {
    try {
      return setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions:', e);
      return false;
    }
  },

  getSession(id: string): DecisionSession | undefined {
    const sessions = this.getSessions();
    return sessions.find((s) => s.id === id);
  },

  saveSession(session: DecisionSession): boolean {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    return this.saveSessions(sessions);
  },

  renameSession(id: string, newTitle: string): boolean {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return false;

    const sessions = this.getSessions();
    const target = sessions.find((s) => s.id === id);
    if (!target) return false;

    target.title = cleanTitle;
    target.updatedAt = Date.now();
    return this.saveSessions(sessions);
  },

  deleteSession(id: string): void {
    const sessions = this.getSessions().filter((s) => s.id !== id);
    this.saveSessions(sessions);
    if (this.getActiveSessionId() === id) {
      this.setActiveSessionId(null);
    }
  },

  getActiveSessionId(): string | null {
    try {
      return getItem(ACTIVE_SESSION_KEY);
    } catch {
      return null;
    }
  },

  setActiveSessionId(id: string | null): void {
    try {
      if (id) {
        setItem(ACTIVE_SESSION_KEY, id);
      } else {
        removeItem(ACTIVE_SESSION_KEY);
      }
    } catch (e) {
      console.warn('Failed to set active session ID:', e);
    }
  },

  createNewSession(initialTitle = 'New Decision'): DecisionSession {
    const newSession: DecisionSession = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: initialTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    this.saveSession(newSession);
    this.setActiveSessionId(newSession.id);
    return newSession;
  },

  clearAllData(): void {
    try {
      removeItem(STORAGE_KEY);
      removeItem(ACTIVE_SESSION_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  },
};
