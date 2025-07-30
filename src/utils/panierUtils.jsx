// src/utils/panierUtils.js
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase';

export const savePanier = async (articles) => {
  // Sauvegarde locale
  localStorage.setItem('panier', JSON.stringify(articles));

  // Sauvegarde Firebase si connecté
  const user = auth.currentUser;
  if (user) {
    const db = getFirestore();
    const panierRef = doc(db, 'paniers', user.uid);
    await setDoc(panierRef, { articles });
  }
};
