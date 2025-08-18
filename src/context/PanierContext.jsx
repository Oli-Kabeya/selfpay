// context/PanierContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  KEYS,
  loadLocal,
  saveLocal,
  addPending,
  getPendingPanier,
  clearPendingPanier,
  isOnline
} from '../utils/offlineUtils';

const PanierContext = createContext();
export const usePanier = () => useContext(PanierContext);

export function PanierProvider({ children }) {
  const [panier, setPanier] = useState([]);
  const syncingRef = useRef(false);

  // --- Charger le panier local ou Firestore au démarrage
  useEffect(() => {
    const initPanier = async () => {
      let local = loadLocal(KEYS.panier) || [];
      setPanier(local);

      // Si connecté, fusionner avec Firestore + pending
      if (auth.currentUser && isOnline()) {
        const ref = doc(db, 'paniers', auth.currentUser.uid);
        const snap = await getDoc(ref);
        const firestoreArticles = snap.exists() ? snap.data().articles || [] : [];
        const pending = getPendingPanier();

        // Fusion : Firestore + pending + local
        const merged = [...firestoreArticles, ...pending, ...local];
        const unique = Array.from(new Map(merged.map(p => [p.idSansCode || p.code || JSON.stringify(p), p])).values());

        setPanier(unique);
        saveLocal(KEYS.panier, unique);
        clearPendingPanier();
        await setDoc(ref, { articles: unique, updatedAt: new Date() }, { merge: true });
      }
    };

    initPanier();
  }, []);

  // --- Sauvegarde locale à chaque modification
  useEffect(() => {
    saveLocal(KEYS.panier, panier);
  }, [panier]);

  // --- Ajouter un produit
  const addToPanier = async (produit) => {
    const updated = [...panier, produit];
    setPanier(updated);
    saveLocal(KEYS.panier, updated);

    if (auth.currentUser && isOnline()) {
      try {
        const ref = doc(db, 'paniers', auth.currentUser.uid);
        const snap = await getDoc(ref);
        const firestoreArticles = snap.exists() ? snap.data().articles || [] : [];
        await setDoc(ref, { articles: [...firestoreArticles, produit], updatedAt: new Date() }, { merge: true });
      } catch (err) {
        console.error('Erreur ajout panier Firestore, fallback offline:', err);
        addPending(KEYS.pending.panier, { action: 'add', product: produit });
      }
    } else {
      addPending(KEYS.pending.panier, { action: 'add', product: produit });
    }
  };

  // --- Supprimer un produit
  const removeFromPanier = async (produit) => {
    const updated = panier.filter(p =>
      (produit.code ? p.code !== produit.code : true) &&
      (produit.idSansCode ? p.idSansCode !== produit.idSansCode : true)
    );
    setPanier(updated);
    saveLocal(KEYS.panier, updated);

    if (auth.currentUser && isOnline()) {
      try {
        const ref = doc(db, 'paniers', auth.currentUser.uid);
        await setDoc(ref, { articles: updated, updatedAt: new Date() }, { merge: true });
      } catch {
        addPending(KEYS.pending.panier, { action: 'remove', code: produit.code, idSansCode: produit.idSansCode });
      }
    } else {
      addPending(KEYS.pending.panier, { action: 'remove', code: produit.code, idSansCode: produit.idSansCode });
    }
  };

  // --- Sync automatique des pending dès retour en ligne
  const syncPending = async () => {
    if (syncingRef.current || !auth.currentUser || !isOnline()) return;
    syncingRef.current = true;

    try {
      const pending = getPendingPanier();
      if (pending.length === 0) return;

      const ref = doc(db, 'paniers', auth.currentUser.uid);
      const snap = await getDoc(ref);
      const firestoreArticles = snap.exists() ? snap.data().articles || [] : [];

      // Fusion : Firestore + pending
      let merged = [...firestoreArticles];
      for (const action of pending) {
        if (action.action === 'add') merged.push(action.product);
        if (action.action === 'remove') {
          merged = merged.filter(p =>
            (action.code ? p.code !== action.code : true) &&
            (action.idSansCode ? p.idSansCode !== action.idSansCode : true)
          );
        }
      }

      // Dé-duplication
      const unique = Array.from(new Map(merged.map(p => [p.idSansCode || p.code || JSON.stringify(p), p])).values());

      setPanier(unique);
      saveLocal(KEYS.panier, unique);
      await setDoc(ref, { articles: unique, updatedAt: new Date() }, { merge: true });
      clearPendingPanier();
    } catch (err) {
      console.error('Erreur sync panier:', err);
    } finally {
      syncingRef.current = false;
    }
  };

  // --- Ecoute retour en ligne
  useEffect(() => {
    const handleOnline = () => syncPending();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <PanierContext.Provider value={{ panier, addToPanier, removeFromPanier, syncPending }}>
      {children}
    </PanierContext.Provider>
  );
}
