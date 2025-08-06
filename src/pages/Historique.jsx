import React, { useEffect, useState } from 'react';
import FooterNav from '../components/FooterNav';
import { auth } from '../firebase';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import './Historique.css';

export default function Historique() {
  const { t } = useTranslation();
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const db = getFirestore();

  useEffect(() => {
    const fetchAchats = async (user) => {
      try {
        // Charger depuis localStorage d'abord
        const localData = JSON.parse(localStorage.getItem('achats') || '[]');
        setAchats(localData);
        
        // Puis tenter Firestore pour MAJ si en ligne
        const achatsRef = collection(db, 'achats', user.uid, 'liste');
        const snapshot = await getDocs(achatsRef);
        const listeAchats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        listeAchats.sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.seconds - a.date.seconds;
        });
        setAchats(listeAchats);
        localStorage.setItem('achats', JSON.stringify(listeAchats));
      } catch (err) {
        console.error(t('errorLoading'), err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAchats(user);
      } else {
        // Si déconnecté : charger localStorage
        const localData = JSON.parse(localStorage.getItem('achats') || '[]');
        setAchats(localData);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [db, t]);

  const totalDepense = achats.reduce((sum, achat) => sum + (achat.montant || 0), 0);

  const supprimerHistorique = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      const achatsRef = collection(db, 'achats', auth.currentUser.uid, 'liste');
      const snapshot = await getDocs(achatsRef);
      const deletePromises = snapshot.docs.map(docSnap =>
        deleteDoc(doc(db, 'achats', auth.currentUser.uid, 'liste', docSnap.id))
      );
      await Promise.all(deletePromises);
      setAchats([]);
      localStorage.setItem('achats', JSON.stringify([]));
      setMessage(t('deleted'));
    } catch (err) {
      console.error(t('errorDelete'), err);
      setMessage(t('errorOccurred'));
    }
    setTimeout(() => setMessage(''), 4000);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-background text-primary transition-colors duration-300">
        <div className="loader mb-4"></div>
        <p className="text-lg font-semibold">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="historique-page">
      <div className="historique-header">
        <h1 className="text-xl font-bold mb-2">{t('title')}</h1>
        <p className="text-base font-medium">
          {t('totalSpent')}: {totalDepense.toFixed(2)} $
        </p>
      </div>

      {message && (
        <p className="mb-4 text-center text-green-600 dark:text-green-400">{message}</p>
      )}

      {achats.length === 0 ? (
        <div className="empty-history">
          <svg xmlns="http://www.w3.org/2000/svg" className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 9h10m-11 4h12m-12 4h12M4 21h16a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1v13a1 1 0 001 1z" />
          </svg>
          <p className="empty-text">{t('noPurchases')}</p>
        </div>
      ) : (
        <ul className="achats-list">
          {achats.map((achat) => (
            <li key={achat.id} className="achat-card">
              <p className="achat-date">
                {t('date')}: {achat.date ? new Date(achat.date.seconds * 1000).toLocaleString() : t('unknownDate')}
              </p>
              <p className="achat-montant">
                {t('amount')}: {achat.montant.toFixed(2)} $
              </p>
            </li>
          ))}
        </ul>
      )}

      {achats.length > 0 && (
        <button
          onClick={supprimerHistorique}
          className="w-full p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow mt-4"
        >
          {t('delete')}
        </button>
      )}

      <FooterNav />
    </div>
  );
}
