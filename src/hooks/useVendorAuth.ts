import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase.ts';
import type { Stand } from '../types.ts';

interface UseVendorAuthReturn {
  user: User | null | undefined; // undefined = still resolving
  loading: boolean;
  isAuthorized: boolean;
  isOwner: boolean;
  isUnclaimed: boolean;
  // Rôle admin réel : custom claim `admin` (posé via scripts/set-admin-claim.mjs),
  // lu depuis le token. Les règles Firestore l'appliquent côté serveur ; ce booléen
  // ne fait que piloter l'affichage.
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

// isUnclaimed : stand exists but has no vendor yet — first Google login claims it
// isAuthorized: user.uid matches stand.vendor_uid (or stand is unclaimed)
export function useVendorAuth(stand: Stand | null): UseVendorAuthReturn {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pick up redirect result on mobile (fired before onAuthStateChanged)
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // Résout le claim admin AVANT de lever loading (évite un flash « accès refusé »).
      if (u && !u.isAnonymous) {
        try {
          const res = await u.getIdTokenResult();
          setIsAdmin(res.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        // Mobile Safari blocks popups — fall back to redirect
        await signInWithRedirect(auth, provider);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Connexion impossible. Réessayez.');
      }
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  const isGoogle = !!user && !user.isAnonymous;
  // Unclaimed = no vendor_uid AND (no vendor_email OR email matches)
  const isUnclaimed =
    !!stand &&
    !stand.vendor_uid &&
    isGoogle &&
    (!stand.vendor_email || stand.vendor_email === user?.email);
  const isOwner = isGoogle && !!stand && stand.vendor_uid === user?.uid;
  const isAuthorized = isOwner || isUnclaimed;

  return { user, loading, isAuthorized, isOwner, isUnclaimed, isAdmin, signIn, signOut, error };
}
