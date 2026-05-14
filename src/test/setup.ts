import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase internal module
vi.mock('../firebase', () => {
  return {
    db: { collection: vi.fn(), doc: vi.fn() },
    auth: { currentUser: null, onAuthStateChanged: vi.fn() },
    storage: {},
  };
});

// Mock Firestore
vi.mock('firebase/firestore', () => {
  return {
    getFirestore: vi.fn(),
    collection: vi.fn((db, path) => ({ db, path })),
    doc: vi.fn((db, path, id) => ({ db, path, id, _path: { segments: [path, id] } })),
    onSnapshot: vi.fn(() => vi.fn()),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    updateDoc: vi.fn().mockResolvedValue({}),
    setDoc: vi.fn().mockResolvedValue({}),
    deleteDoc: vi.fn().mockResolvedValue({}),
    query: vi.fn((q) => q),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    serverTimestamp: vi.fn(() => ({ toMillis: () => Date.now() })),
    increment: vi.fn((n) => ({ _type: 'increment', value: n })),
    deleteField: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
      fromDate: vi.fn((date) => ({ toMillis: () => date.getTime(), toDate: () => date })),
    },
    runTransaction: vi.fn(async (db, cb) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ data: () => ({}), exists: () => true }),
        update: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };
      return await cb(tx);
    }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue({}),
    })),
  };
});

// Mock Auth
vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn(),
    signInAnonymously: vi.fn().mockResolvedValue({ user: { uid: 'anonymous-uid' } }),
    signInWithPopup: vi.fn().mockResolvedValue({}),
    signInWithRedirect: vi.fn().mockResolvedValue({}),
    getRedirectResult: vi.fn().mockResolvedValue({}),
    signOut: vi.fn().mockResolvedValue({}),
    GoogleAuthProvider: class {},
  };
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserver,
});
