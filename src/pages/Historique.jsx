import React, { useEffect, useState } from 'react';
import FooterNav from '../components/FooterNav';
import { auth } from '../firebase';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

export default function Historique() {
  const { t } = useTranslation();
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const db = getFirestore();

  useEffect(() => {
    const fetchAchats = async (user) => {
      try {
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
      } catch (err) {
        console.error(t('errorLoadingHistory'), err);
        setAchats([]);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAchats(user);
      } else {
        setAchats([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [db, t]);

  const supprimerHistorique = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm(t('confirmDeleteHistory'))) return;

    try {
      const achatsRef = collection(db, 'achats', auth.currentUser.uid, 'liste');
      const snapshot = await getDocs(achatsRef);

      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'achats', auth.currentUser.uid, 'liste', docSnap.id)));
      await Promise.all(deletePromises);

      setAchats([]);
      setMessage(t('historyDeleted'));
    } catch (err) {
      console.error(t('errorDeletingHistory'), err);
      setMessage(t('errorOnDelete'));
    }
    setTimeout(() => setMessage(''), 4000);
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-100">
        <p className="text-lg">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 page-transition pb-20 bg-gray-100 min-h-screen">
      <h2 className="text-xl font-bold mb-4">{t('purchaseHistory')}</h2>

      {message && <p className="mb-4 text-center text-green-600">{message}</p>}

      {achats.length === 0 ? (
        <p>{t('noPurchasesYet')}</p>
      ) : (
        <ul>
          {achats.map((achat) => (
            <li key={achat.id} className="mb-3 border-b pb-2">
              <p className="text-sm">
                {t('date')}: {achat.date ? new Date(achat.date.seconds * 1000).toLocaleString() : t('unknownDate')}
              </p>
              <p className="text-sm font-medium">
                {t('amount')}: {achat.montant} $
              </p>
            </li>
          ))}
        </ul>
      )}

      {achats.length > 0 && (
        <button
          onClick={supprimerHistorique}
          className="mt-6 bg-red-600 text-white px-4 py-2 rounded w-full"
        >
          {t('deleteHistory')}
        </button>
      )}

      <FooterNav />
    </div>
  );
}
