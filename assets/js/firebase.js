// Firebase helpers (Auth + Firestore) for HubsShop
// NOTE: Google sign-in uses the Firebase hosted auth domain (authDomain below).

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const ADMIN_EMAIL = 'm462556532@gmail.com';

export const firebaseConfig = {
  apiKey: "AIzaSyDt4id_moRroH_DkHQf-T9jx4FeFkOjHQw",
  authDomain: "hubsshopssss.firebaseapp.com",
  projectId: "hubsshopssss",
  storageBucket: "hubsshopssss.firebasestorage.app",
  messagingSenderId: "604538341659",
  appId: "1:604538341659:web:e6c2e1baa39e057a31ebbe",
  measurementId: "G-GQS4JPCRST"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const f = {
  collection, doc, addDoc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, deleteDoc, updateDoc
};

export function isAdmin(user){
  return !!(user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

export function watchAuth(cb){
  return onAuthStateChanged(auth, cb);
}

export async function tryHandleRedirectResult(){
  try {
    const res = await getRedirectResult(auth);
    return res;
  } catch (e) {
    // Most often: popup blocked / user cancelled / domain not authorized
    console.warn('Redirect result error:', e);
    return null;
  }
}

export async function signInGoogleRedirect(){
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

export async function signUpEmail(email, password){
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function signInEmail(email, password){
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email){
  return await sendPasswordResetEmail(auth, email);
}

export async function logout(){
  return await signOut(auth);
}
