import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  inMemoryPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with firestoreDatabaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
// Require a fresh login every time: keep auth state in memory only,
// so nothing is persisted across page reloads or browser sessions.
setPersistence(auth, inMemoryPersistence).catch((e: unknown) =>
  console.warn('Could not set auth persistence:', e)
);
export const googleProvider = new GoogleAuthProvider();
// Always show the account picker and consent screen on every sign-in.
googleProvider.setCustomParameters({ prompt: 'consent select_account' });

// Verify connection
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline.');
    }
  }
}
testFirestoreConnection();

// Redirect-based sign-in: replaces the whole page with the Google login flow —
// works even when browsers block popups. Complete with completeRedirectLogin().
export async function loginWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

export async function completeRedirectLogin(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;
    const fbUser = result.user;
    const email = fbUser.email || 'user@globaloils.us';
    const name = fbUser.displayName || email.split('@')[0];
    const initials = name
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    const user: User = {
      email,
      name,
      initials: initials || 'G',
      role: 'admin',
      isAdmin: true,
    };
    try {
      await setDoc(doc(db, 'users', fbUser.uid), {
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Could not persist user profile to Firestore:', e);
    }
    return user;
  } catch (error) {
    console.error('Google redirect sign-in failed:', error);
    throw error;
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    if (!fbUser) return null;

    const email = fbUser.email || 'user@globaloils.us';
    const name = fbUser.displayName || email.split('@')[0];
    const initials = name
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const user: User = {
      email,
      name,
      initials: initials || 'G',
      role: 'admin',
      isAdmin: true,
    };

    // Save profile to Firestore
    try {
      await setDoc(doc(db, 'users', fbUser.uid), {
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Could not persist user profile to Firestore:', e);
    }

    return user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function logoutUser() {
  await fbSignOut(auth);
}
