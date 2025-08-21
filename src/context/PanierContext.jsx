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

  // --- Initialisation : charger local + fusion Firestore/pending si connecté
  useEffect(() => {
    const initPanier = async () => {
      const local = loadLocal(KEYS.panier) || [];
      setPanier(local);

      if (auth.currentUser && isOnline()) {
        try {
          const ref = doc(db, 'paniers', auth.currentUser.uid);
          const snap = await getDoc(ref);
          const firestoreArticles = snap.exists() ? snap.data().articles || [] : [];
          const pending = getPendingPanier();

          // ✅ Fusion avec ajout de ajoute_le si manquant
          let merged = [
            ...firestoreArticles.map(p => ({ ...p, ajoute_le: p.ajoute_le || new Date().toISOString() })),
            ...pending.map(p => ({ ...(p.product || p), ajoute_le: (p.product?.ajoute_le || p.ajoute_le) || new Date().toISOString() })),
            ...local.map(p => ({ ...p, ajoute_le: p.ajoute_le || new Date().toISOString() }))
          ];

          // Déduplication
          const unique = Array.from(
            new Map(merged.map(p => [p.idSansCode || p.code || JSON.stringify(p), p])).values()
          );

          setPanier(unique);
          saveLocal(KEYS.panier, unique);
          clearPendingPanier();
          await setDoc(ref, { articles: unique, updatedAt: new Date() }, { merge: true });
        } catch (err) {
          console.error("Erreur init panier:", err);
        }
      }
    };

    initPanier();
  }, []);

  // --- Sauvegarde locale automatique
  useEffect(() => {
    saveLocal(KEYS.panier, panier);
  }, [panier]);

  // --- Ajouter un produit
  const addToPanier = async (produit) => {
    const produitWithDate = { ...produit, ajoute_le: produit.ajoute_le || new Date().toISOString() };

    const updated = [...panier, produitWithDate];
    setPanier(updated);
    saveLocal(KEYS.panier, updated);

    if (auth.currentUser && isOnline()) {
      try {
        const ref = doc(db, 'paniers', auth.currentUser.uid);
        const snap = await getDoc(ref);
        const firestoreArticles = snap.exists() ? snap.data().articles || [] : [];
        await setDoc(ref, { articles: [...firestoreArticles, produitWithDate], updatedAt: new Date() }, { merge: true });
      } catch (err) {
        console.error("Erreur ajout Firestore, fallback pending:", err);
        addPending(KEYS.pending.panier, { action: 'add', product: produitWithDate });
      }
    } else {
      addPending(KEYS.pending.panier, { action: 'add', product: produitWithDate });
    }
  };

  // --- Supprimer un produit
  const removeFromPanier = async (produit) => {
    const updated = panier.filter(p => {
      const idProduit = produit.idSansCode || produit.code;
      const idCourant = p.idSansCode || p.code;
      return idProduit !== idCourant;
    });

    setPanier(updated);
    saveLocal(KEYS.panier, updated);

    if (auth.currentUser && isOnline()) {
      try {
        const ref = doc(db, 'paniers', auth.currentUser.uid);
        await setDoc(ref, { articles: updated, updatedAt: new Date() }, { merge: true });
      } catch (err) {
        console.error("Erreur suppression Firestore, fallback pending:", err);
        addPending(KEYS.pending.panier, { action: 'remove', code: produit.code, idSansCode: produit.idSansCode });
      }
    } else {
      addPending(KEYS.pending.panier, { action: 'remove', code: produit.code, idSansCode: produit.idSansCode });
    }
  };

  // --- Synchronisation des pending
  const syncPending = async () => {
    if (syncingRef.current || !auth.currentUser || !isOnline()) return;
    syncingRef.current = true;

    try {
      const pending = getPendingPanier();
      if (pending.length === 0) return;

      const ref = doc(db, 'paniers', auth.currentUser.uid);
      const snap = await getDoc(ref);
      let firestoreArticles = snap.exists() ? snap.data().articles || [] : [];

      for (const action of pending) {
        if (action.action === 'add' && action.product) {
          // Ajoute ajoute_le si manquant
          const prod = { ...action.product, ajoute_le: action.product.ajoute_le || new Date().toISOString() };
          firestoreArticles.push(prod);
        }
        if (action.action === 'remove') {
          firestoreArticles = firestoreArticles.filter(p => {
            const idAction = action.idSansCode || action.code;
            const idCourant = p.idSansCode || p.code;
            return idAction !== idCourant;
          });
        }
      }

      const unique = Array.from(
        new Map(firestoreArticles.map(p => [p.idSansCode || p.code || JSON.stringify(p), p])).values()
      );

      setPanier(unique);
      saveLocal(KEYS.panier, unique);
      await setDoc(ref, { articles: unique, updatedAt: new Date() }, { merge: true });
      clearPendingPanier();
    } catch (err) {
      console.error("Erreur sync panier:", err);
    } finally {
      syncingRef.current = false;
    }
  };

  // --- Ecoute retour en ligne
  useEffect(() => {
    const handleOnline = () => syncPending();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <PanierContext.Provider value={{ panier, addToPanier, removeFromPanier, syncPending }}>
      {children}
    </PanierContext.Provider>
  );
}
