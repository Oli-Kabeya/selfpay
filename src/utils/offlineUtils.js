// utils/offlineUtils.js
import { getFirestore, collection, doc, getDoc, addDoc, setDoc } from "firebase/firestore";
import { auth } from "../firebase";

const db = getFirestore();

// 🔑 Clés locales
export const KEYS = {
  panier: "selfpay_panier",
  liste: "selfpay_liste",
  historique: "selfpay_historique",
  profil: "selfpay_profil",
  pending: {
    panier: "selfpay_pending_panier",
    liste: "selfpay_pending_liste",
    historique: "selfpay_pending_historique"
  }
};

// ⏱ Gestion batch sync
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1h
let lastSync = 0;

// 📌 Charger des données locales génériques
export function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

// 📌 Sauvegarder en local générique
export function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// 🔹 Spécifique liste de courses
export const loadListeFromStorage = () => loadLocal(KEYS.liste);
export const saveListeToStorage = (items) => saveLocal(KEYS.liste, items);

// 📌 Détection connexion
export function isOnline() {
  return navigator.onLine;
}

// 📌 Ajouter à la file de sync
export function addPending(key, item) {
  const pending = loadLocal(key);
  pending.push(item);
  saveLocal(key, pending);
}

// 📌 Fusionner données Firestore et LocalStorage (sans doublons)
export function mergeData(localData, remoteData, idField = "id") {
  const map = new Map();
  [...localData, ...remoteData].forEach(item => {
    map.set(item[idField], { ...map.get(item[idField]), ...item });
  });
  return Array.from(map.values());
}

// 🔄 Synchronisation générique avec Firestore
export async function syncPendingData() {
  const uid = auth.currentUser?.uid;
  if (!uid || !isOnline()) return;

  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) return;
  lastSync = now;

  // 🔹 Sync panier
  const pendingPanier = loadLocal(KEYS.pending.panier);
  if (pendingPanier.length) {
    for (const product of pendingPanier) {
      await addDoc(collection(db, "achats", uid, "liste"), product);
      await addDoc(collection(db, "transactions_anonymes"), {
        ...product,
        uid,
        timestamp: new Date()
      });
    }
    saveLocal(KEYS.pending.panier, []);
  }

  // 🔹 Sync historique
  const pendingHist = loadLocal(KEYS.pending.historique);
  if (pendingHist.length) {
    for (const tx of pendingHist) {
      await addDoc(collection(db, "achats", uid, "liste"), tx);
    }
    saveLocal(KEYS.pending.historique, []);
  }

  // 🔹 Sync liste de courses
  const pendingListe = loadLocal(KEYS.pending.liste);
  if (pendingListe.length) {
    for (const item of pendingListe) {
      await setDoc(doc(db, "listes_courses", uid, item.id), item, { merge: true });
    }
    saveLocal(KEYS.pending.liste, []);
  }

  console.log("Sync batch offline terminé");
}

// 📦 Ajouter au panier
export async function addToPanier(product) {
  const panier = loadLocal(KEYS.panier);
  panier.push(product);
  saveLocal(KEYS.panier, panier);

  if (isOnline()) {
    await syncPendingData();
  } else {
    addPending(KEYS.pending.panier, product);
  }
}

// 📦 Ajouter à l’historique
export async function addToHistorique(transaction) {
  const historique = loadLocal(KEYS.historique);
  historique.push(transaction);
  saveLocal(KEYS.historique, historique);

  if (isOnline()) {
    await syncPendingData();
  } else {
    addPending(KEYS.pending.historique, transaction);
  }
}

// 📦 Ajouter à la liste de courses
export async function addToListe(item) {
  const liste = loadLocal(KEYS.liste);
  liste.push(item);
  saveLocal(KEYS.liste, liste);

  if (isOnline()) {
    await syncPendingData();
  } else {
    addPending(KEYS.pending.liste, item);
  }
}

// 📦 Synchroniser le profil
export async function syncProfil() {
  const uid = auth.currentUser?.uid;
  if (!uid || !isOnline()) return loadLocal(KEYS.profil);

  const profilSnap = await getDoc(doc(db, "users", uid));
  if (profilSnap.exists()) {
    saveLocal(KEYS.profil, profilSnap.data());
    return profilSnap.data();
  }
  return {};
}

// 🛠 Initialisation automatique offline
export function initOfflineSync() {
  window.addEventListener("online", syncPendingData);
  syncPendingData(); // tentative au démarrage
  setInterval(syncPendingData, SYNC_INTERVAL_MS); // sync automatique toutes les heures
}
