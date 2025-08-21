import { getFirestore, collection, doc, addDoc, setDoc, getDoc } from "firebase/firestore";
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

// ⏱ Gestion batch sync (sécurité toutes les heures)
const SYNC_INTERVAL_MS = 60 * 60 * 1000;
let lastSync = 0;

// 📌 Charger données locales
export function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

// 📌 Sauvegarder en local
export function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// 📌 Détection connexion
export function isOnline() {
  return navigator.onLine;
}

// 📌 Ajouter une action en attente
export function addPending(key, action) {
  const pending = loadLocal(key);
  pending.push(action);
  saveLocal(key, pending);
}

// 📌 Récupérer pending panier
export function getPendingPanier() {
  return loadLocal(KEYS.pending.panier);
}

// 📌 Effacer pending panier
export function clearPendingPanier() {
  saveLocal(KEYS.pending.panier, []);
}

// 🔄 Synchronisation générique avec Firestore
export async function syncPendingData(force = false) {
  const uid = auth.currentUser?.uid;
  if (!uid || !isOnline()) return;

  const now = Date.now();
  if (!force && now - lastSync < SYNC_INTERVAL_MS) return;
  lastSync = now;

  try {
    // --- 🔹 Sync panier
    const pendingPanier = loadLocal(KEYS.pending.panier);
    if (pendingPanier.length) {
      const ref = doc(db, "paniers", uid);
      const snap = await getDoc(ref);
      let currentArticles = snap.exists() ? snap.data().articles || [] : [];

      for (const action of pendingPanier) {
        if (action.action === "add") {
          currentArticles.push({ ...action.product, ajoute_le: action.product.ajoute_le || new Date().toISOString() });
        }
        if (action.action === "remove") {
          const idAction = action.idSansCode || action.code;
          currentArticles = currentArticles.filter(p => (p.idSansCode || p.code) !== idAction);
        }
      }

      await setDoc(ref, { articles: currentArticles, updatedAt: new Date() }, { merge: true });
      saveLocal(KEYS.panier, currentArticles);
      clearPendingPanier();
    }

    // --- 🔹 Sync historique
    const pendingHist = loadLocal(KEYS.pending.historique);
    if (pendingHist.length) {
      for (const tx of pendingHist) {
        await addDoc(collection(db, "achats", uid, "liste"), { ...tx, ajoute_le: tx.ajoute_le || new Date().toISOString() });
      }
      saveLocal(KEYS.pending.historique, []);
    }

    // --- 🔹 Sync liste
    const pendingListe = loadLocal(KEYS.pending.liste);
    if (pendingListe.length) {
      for (const item of pendingListe) {
        const itemWithDate = { ...item, ajoute_le: item.ajoute_le || new Date().toISOString() };
        await setDoc(doc(db, "listes_courses", uid, item.id), itemWithDate, { merge: true });
      }
      saveLocal(KEYS.pending.liste, []);
    }

    console.log("✅ Sync offline terminé");
  } catch (err) {
    console.error("Erreur sync global:", err);
  }
}

// 📦 Ajouter au panier
export async function addToPanier(product) {
  const timestampedProduct = { ...product, ajoute_le: new Date().toISOString() };
  const panier = loadLocal(KEYS.panier);
  panier.push(timestampedProduct);
  saveLocal(KEYS.panier, panier);

  if (auth.currentUser && isOnline()) {
    try {
      const ref = doc(db, "paniers", auth.currentUser.uid);
      const snap = await getDoc(ref);
      const currentArticles = snap.exists() ? snap.data().articles || [] : [];
      await setDoc(ref, { articles: [...currentArticles, timestampedProduct], updatedAt: new Date() }, { merge: true });
    } catch (err) {
      console.error("Erreur ajout panier Firestore, fallback offline:", err);
      addPending(KEYS.pending.panier, { action: "add", product: timestampedProduct });
    }
  } else {
    addPending(KEYS.pending.panier, { action: "add", product: timestampedProduct });
  }
}

// 📦 Supprimer du panier
export async function removeFromPanier(product) {
  const updated = loadLocal(KEYS.panier).filter(p => (p.idSansCode || p.code) !== (product.idSansCode || product.code));
  saveLocal(KEYS.panier, updated);

  if (auth.currentUser && isOnline()) {
    try {
      const ref = doc(db, "paniers", auth.currentUser.uid);
      await setDoc(ref, { articles: updated, updatedAt: new Date() }, { merge: true });
    } catch {
      addPending(KEYS.pending.panier, { action: "remove", code: product.code, idSansCode: product.idSansCode });
    }
  } else {
    addPending(KEYS.pending.panier, { action: "remove", code: product.code, idSansCode: product.idSansCode });
  }
}

// 📦 Ajouter à l’historique
export async function addToHistorique(transaction) {
  const timestampedTx = { ...transaction, ajoute_le: new Date().toISOString() };
  const historique = loadLocal(KEYS.historique);
  historique.push(timestampedTx);
  saveLocal(KEYS.historique, historique);

  if (isOnline()) await syncPendingData(true);
  else addPending(KEYS.pending.historique, timestampedTx);
}

// 📦 Ajouter à la liste de courses
export async function addToListe(item) {
  const timestampedItem = { ...item, ajoute_le: new Date().toISOString() };
  const liste = loadLocal(KEYS.liste);
  liste.push(timestampedItem);
  saveLocal(KEYS.liste, liste);

  if (isOnline()) await syncPendingData(true);
  else addPending(KEYS.pending.liste, timestampedItem);
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

// 🛠 Initialisation sync offline
export function initOfflineSync() {
  window.addEventListener("online", () => syncPendingData(true));
  syncPendingData(true);
  setInterval(() => syncPendingData(false), SYNC_INTERVAL_MS);
}
