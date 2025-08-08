import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase';

// --- Constantes locales ---
const db = getFirestore();
const LOCAL_PANIER_KEY = 'panier';
const LOCAL_PENDING_SYNC_KEY = 'pendingSync';

// --- Fonctions utilitaires ---
export const isOnline = () => navigator.onLine;

export const saveLocalData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur sauvegarde locale:', e);
  }
};

export const loadLocalData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Erreur chargement local:', e);
    return null;
  }
};

// --- Gestion panier offline ---
export const addProductOffline = (produit) => {
  // Panier local
  const panier = loadLocalData(LOCAL_PANIER_KEY) || [];
  panier.push(produit);
  saveLocalData(LOCAL_PANIER_KEY, panier);

  // File d’attente sync
  const pending = loadLocalData(LOCAL_PENDING_SYNC_KEY) || [];
  pending.push(produit);
  saveLocalData(LOCAL_PENDING_SYNC_KEY, pending);

  console.log('Produit stocké localement et en attente de sync:', produit);
};

// --- Synchronisation avec Firestore ---
export const syncPendingData = async () => {
  const user = auth.currentUser;
  if (!user || !isOnline()) return;

  const pending = loadLocalData(LOCAL_PENDING_SYNC_KEY) || [];
  if (pending.length === 0) return;

  try {
    const ref = doc(db, 'paniers', user.uid);
    const snap = await getDoc(ref);
    const anciens = snap.exists() ? snap.data().articles || [] : [];

    await setDoc(ref, { articles: [...anciens, ...pending] });
    saveLocalData(LOCAL_PENDING_SYNC_KEY, []);

    console.log('Synchronisation réussie avec Firestore');
  } catch (err) {
    console.error('Erreur de synchronisation Firestore:', err);
  }
};

// --- Initialisation automatique ---
export const initOfflineSync = () => {
  window.addEventListener('online', syncPendingData);
  syncPendingData(); // tentative au démarrage
};

// --- Fonctions spécifiques liste (inchangées) ---
export const loadListeFromStorage = () => loadLocalData('liste') || [];
export const saveListeToStorage = (liste) => saveLocalData('liste', liste);
