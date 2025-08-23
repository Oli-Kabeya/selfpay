// PanierContext.jsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { KEYS, addPending, getPendingPanier, clearPendingPanier, isOnline } from '../utils/offlineUtils';

const PanierContext = createContext();
export const usePanier = () => useContext(PanierContext);

export function PanierProvider({ children }) {
  const [panier, setPanier] = useState([]);
  const syncingRef = useRef(false);

  const getStorageKey = () => `panier_${auth.currentUser?.uid || 'guest'}`;
  const loadPanierLocal = () => JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
  const savePanierLocal = (data) => localStorage.setItem(getStorageKey(), JSON.stringify(data));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      const local = loadPanierLocal();
      setPanier(local);

      if (user && isOnline()) {
        try {
          const ref = doc(db, 'paniers', user.uid);
          const snap = await getDoc(ref);
          const firestoreArticles = snap.exists() ? snap.data().articles || [] : [];
          const pending = getPendingPanier();

          const merged = [
            ...firestoreArticles.map(p => ({ ...p, ajoute_le: p.ajoute_le || new Date().toISOString() })),
            ...pending.map(p => ({ ...(p.product || p), ajoute_le: (p.product?.ajoute_le || p.ajoute_le) || new Date().toISOString() })),
            ...local.map(p => ({ ...p, ajoute_le: p.ajoute_le || new Date().toISOString() }))
          ];

          const unique = Array.from(
            new Map(merged.map(p => [p.idSansCode || p.code || JSON.stringify(p), p])).values()
          );

          setPanier(unique);
          savePanierLocal(unique);
          clearPendingPanier();
          await setDoc(ref, { articles: unique, updatedAt: new Date() }, { merge: true });
        } catch (err) { console.error("Erreur init panier:", err); }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => { savePanierLocal(panier); }, [panier]);

  const addToPanier = async (produit) => {
    const idProduit = produit.idSansCode || produit.code;
    setPanier(prev => {
      const existe = prev.find(p => (p.idSansCode || p.code) === idProduit);
      let updated = existe
        ? prev.map(p => (p.idSansCode || p.code) === idProduit ? { ...p, quantite: (p.quantite || 1) + (produit.quantite || 1) } : p)
        : [...prev, { ...produit, quantite: produit.quantite || 1, ajoute_le: produit.ajoute_le || new Date().toISOString() }];

      savePanierLocal(updated);

      if (auth.currentUser && isOnline()) {
        syncWithFirestore(updated).catch(err => { console.error("Erreur sync Firestore:", err); addPending(KEYS.pending.panier, { action: 'add', product: produit }); });
      } else {
        addPending(KEYS.pending.panier, { action: 'add', product: produit });
      }

      return updated;
    });
  };

  const updateQuantity = (produit, nouvelleQuantite) => {
    const idProduit = produit.idSansCode || produit.code;
    setPanier(prev => {
      const updated = nouvelleQuantite <= 0
        ? prev.filter(p => (p.idSansCode || p.code) !== idProduit)
        : prev.map(p => (p.idSansCode || p.code) === idProduit ? { ...p, quantite: nouvelleQuantite } : p);

      savePanierLocal(updated);

      if (auth.currentUser && isOnline()) {
        syncWithFirestore(updated).catch(err => addPending(KEYS.pending.panier, { action: 'update', product: { ...produit, quantite: nouvelleQuantite } }));
      } else {
        addPending(KEYS.pending.panier, { action: 'update', product: { ...produit, quantite: nouvelleQuantite } });
      }

      return updated;
    });
  };

  const removeFromPanier = (produit) => {
    const updated = panier.filter(p => (p.idSansCode || p.code) !== (produit.idSansCode || produit.code));
    setPanier(updated);
    savePanierLocal(updated);

    if (auth.currentUser && isOnline()) {
      syncWithFirestore(updated).catch(err => addPending(KEYS.pending.panier, { action: 'remove', code: produit.code, idSansCode: produit.idSansCode }));
    } else {
      addPending(KEYS.pending.panier, { action: 'remove', code: produit.code, idSansCode: produit.idSansCode });
    }
  };

  const syncWithFirestore = async (updatedPanier) => {
    if (!auth.currentUser) return;
    const ref = doc(db, 'paniers', auth.currentUser.uid);
    await setDoc(ref, { articles: updatedPanier, updatedAt: new Date() }, { merge: true });
  };

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
          const idProduit = action.product.idSansCode || action.product.code;
          const existe = firestoreArticles.find(p => (p.idSansCode || p.code) === idProduit);
          if (existe) existe.quantite += action.product.quantite || 1;
          else firestoreArticles.push({ ...action.product, quantite: action.product.quantite || 1, ajoute_le: action.product.ajoute_le || new Date().toISOString() });
        }
        if (action.action === 'update' && action.product) {
          firestoreArticles = firestoreArticles.map(p =>
            (p.idSansCode || p.code) === (action.product.idSansCode || action.product.code)
              ? { ...p, quantite: action.product.quantite }
              : p
          );
        }
        if (action.action === 'remove') {
          firestoreArticles = firestoreArticles.filter(p => (p.idSansCode || p.code) !== (action.idSansCode || action.code));
        }
      }

      const unique = Array.from(new Map(firestoreArticles.map(p => [p.idSansCode || p.code || JSON.stringify(p), p])).values());
      setPanier(unique);
      savePanierLocal(unique);
      await syncWithFirestore(unique);
      clearPendingPanier();
    } catch (err) { console.error("Erreur sync panier:", err); }
    finally { syncingRef.current = false; }
  };

  useEffect(() => { window.addEventListener("online", syncPending); return () => window.removeEventListener("online", syncPending); }, []);

  return (
    <PanierContext.Provider value={{ panier, addToPanier, updateQuantity, removeFromPanier, syncPending }}>
      {children}
    </PanierContext.Provider>
  );
}
