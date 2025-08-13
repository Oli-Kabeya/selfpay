// utils/offlineProducts.js
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { isOnline, loadLocal, saveLocal } from "./offlineUtils";

const db = getFirestore();
const LOCAL_KEY = "selfpay_produits_sans_codes";

// 📌 Charger les produits sans codes (online/offline)
export async function loadProduitsSansCodes() {
  // Si offline, retourner le local
  if (!isOnline()) {
    return loadLocal(LOCAL_KEY);
  }

  try {
    const querySnapshot = await getDocs(collection(db, "produits_sans_codes"));
    const produits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sauvegarder en local pour offline
    saveLocal(LOCAL_KEY, produits);

    return produits;
  } catch (err) {
    console.error("Erreur chargement produits sans codes:", err);
    // fallback sur local
    return loadLocal(LOCAL_KEY);
  }
}

// 📌 Pré-cacher les images pour le mode offline
export function precacheImages(produits) {
  if (!produits || produits.length === 0) return;

  produits.forEach(p => {
    if (p.imageUrl) {
      const img = new Image();
      img.src = p.imageUrl; // navigateur mettra en cache
    }
  });
}
