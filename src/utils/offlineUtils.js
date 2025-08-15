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

// ⏱ Gestion batch sync
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1h
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

// 📌 Ajouter à pending
export function addPending(key, item) {
  const pending = loadLocal(key);
  pending.push(item);
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
export async function syncPendingData() {
  const uid = auth.currentUser?.uid;
  if (!uid || !isOnline()) return;

  const now = Date.now();
  if (now - lastSync < SYNC_INTERVAL_MS) return;
  lastSync = now;

  // 🔹 Sync panier
  const pendingPanier = loadLocal(KEYS.pending.panier);
  if (pendingPanier.length) {
    try {
      const ref = doc(db, "paniers", uid);
      const snap = await getDoc(ref);
      let currentArticles = snap.exists() ? snap.data().articles || [] : [];

      for (const action of pendingPanier) {
        if (action.action === "add") currentArticles.push(action.product);
        if (action.action === "remove") {
          currentArticles = currentArticles.filter(p =>
            (action.code ? p.code !== action.code : true) &&
            (action.idSansCode ? p.idSansCode !== action.idSansCode : true)
          );
        }
      }

      await setDoc(ref, { articles: currentArticles, updatedAt: new Date() }, { merge: true });
      saveLocal(KEYS.pending.panier, []);
    } catch (err) {
      console.error("Erreur sync panier:", err);
    }
  }

  // 🔹 Sync historique
  const pendingHist = loadLocal(KEYS.pending.historique);
  if (pendingHist.length) {
    for (const tx of pendingHist) {
      await addDoc(collection(db, "achats", uid, "liste"), tx);
    }
    saveLocal(KEYS.pending.historique, []);
  }

  // 🔹 Sync liste
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

  if (auth.currentUser && isOnline()) {
    try {
      const ref = doc(db, "paniers", auth.currentUser.uid);
      const snap = await getDoc(ref);
      const currentArticles = snap.exists() ? snap.data().articles || [] : [];
      await setDoc(ref, { articles: [...currentArticles, product], updatedAt: new Date() }, { merge: true });
    } catch (err) {
      console.error("Erreur ajout panier Firestore, fallback offline:", err);
      addPending(KEYS.pending.panier, { action: "add", product });
    }
  } else {
    addPending(KEYS.pending.panier, { action: "add", product });
  }
}

// 📦 Supprimer du panier
export async function removeFromPanier(product) {
  const panier = loadLocal(KEYS.panier).filter(p =>
    (product.code ? p.code !== product.code : true) &&
    (product.idSansCode ? p.idSansCode !== product.idSansCode : true)
  );
  saveLocal(KEYS.panier, panier);

  if (auth.currentUser && isOnline()) {
    try {
      const ref = doc(db, "paniers", auth.currentUser.uid);
      await setDoc(ref, { articles: panier, updatedAt: new Date() }, { merge: true });
    } catch {
      addPending(KEYS.pending.panier, { action: "remove", code: product.code, idSansCode: product.idSansCode });
    }
  } else {
    addPending(KEYS.pending.panier, { action: "remove", code: product.code, idSansCode: product.idSansCode });
  }
}

// 📦 Ajouter à l’historique
export async function addToHistorique(transaction) {
  const historique = loadLocal(KEYS.historique);
  historique.push(transaction);
  saveLocal(KEYS.historique, historique);

  if (isOnline()) await syncPendingData();
  else addPending(KEYS.pending.historique, transaction);
}

// 📦 Ajouter à la liste de courses
export async function addToListe(item) {
  const liste = loadLocal(KEYS.liste);
  liste.push(item);
  saveLocal(KEYS.liste, liste);

  if (isOnline()) await syncPendingData();
  else addPending(KEYS.pending.liste, item);
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
  window.addEventListener("online", syncPendingData);
  syncPendingData(); // tentative au démarrage
  setInterval(syncPendingData, SYNC_INTERVAL_MS);
}
