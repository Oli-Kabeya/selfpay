// context/PanierContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase'; // <-- correction ici
import { doc, setDoc } from 'firebase/firestore';

import { 
  loadLocal, 
  saveLocal, 
  KEYS, 
  addToPanier as offlineAddToPanier, 
  getPendingPanier, 
  clearPendingPanier, 
  isOnline 
} from '../utils/offlineUtils';

const PanierContext = createContext();
export const usePanier = () => useContext(PanierContext);

export function PanierProvider({ children }) {
  const [panier, setPanier] = useState([]);
  const syncingRef = useRef(false); // empêche sync multiple simultanées

  // Charger panier local au démarrage
  useEffect(() => {
    const local = loadLocal(KEYS.panier) || [];
    setPanier(local);
  }, []);

  // Sauvegarde locale à chaque modification
  useEffect(() => {
    saveLocal(KEYS.panier, panier);
  }, [panier]);

  // Fonction pour ajouter un produit
  const addToPanier = async (produit) => {
    const updated = [...panier, produit];
    setPanier(updated);

    if (!isOnline()) {
      offlineAddToPanier(produit); // stocke pour sync plus tard
    } else {
      await syncPending(); // sync immédiat si online
    }
  };

  // Fonction pour supprimer un produit
  const removeFromPanier = async (produit) => {
    const updated = panier.filter(p =>
      (produit.code ? p.code !== produit.code : true) &&
      (produit.idSansCode ? p.idSansCode !== produit.idSansCode : true)
    );
    setPanier(updated);
    saveLocal(KEYS.panier, updated);

    if (isOnline() && auth.currentUser) {
      const ref = doc(db, 'paniers', auth.currentUser.uid);
      await setDoc(ref, { articles: updated }, { merge: true });
    }
  };

  // --- Sync automatique des produits hors ligne
  const syncPending = async () => {
    if (syncingRef.current || !isOnline()) return;
    syncingRef.current = true;

    try {
      const pending = getPendingPanier(); // récupère produits en attente
      if (pending.length === 0) return;

      if (!auth.currentUser) return;

      const ref = doc(db, 'paniers', auth.currentUser.uid);

      // Fusionner panier existant + pending
      const merged = [...panier, ...pending];
      setPanier(merged);
      saveLocal(KEYS.panier, merged);

      await setDoc(ref, { articles: merged }, { merge: true });
      clearPendingPanier(); // effacer les pending après synchro
    } catch (err) {
      console.error('Erreur sync panier:', err);
    } finally {
      syncingRef.current = false;
    }
  };

  // --- Sync automatique dès retour en ligne
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
