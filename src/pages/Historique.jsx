// Historique.jsx
import React, { useEffect, useState } from 'react';
import FooterNav from '../components/FooterNav';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { loadLocal, saveLocal, isOnline, KEYS } from '../utils/offlineUtils';
import './Historique.css';

export default function Historique() {
  const { t } = useTranslation();
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(isOnline());

  // --- Détection online/offline
  useEffect(() => {
    const updateStatus = () => setOnline(isOnline());
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  useEffect(() => {
    const fetchAchats = async (user) => {
      try {
        const localData = loadLocal(KEYS.historique) || [];
        setAchats(localData);

        if (online) {
          const achatsRef = collection(db, 'achats', user.uid, 'liste');
          const snapshot = await getDocs(achatsRef);
          const listeAchats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          listeAchats.sort((a,b) => (b.date?.seconds||0) - (a.date?.seconds||0));

          // Fusion avec local
          const merged = [...localData, ...listeAchats];
          const unique = Array.from(new Map(merged.map(a => [a.id || JSON.stringify(a), a])).values());

          setAchats(unique);
          saveLocal(KEYS.historique, unique);
        }
      } catch(err) {
        console.error(t('errorLoading'), err);
      } finally { setLoading(false); }
    };

    const unsubscribe = onAuthStateChanged(auth, (user)=>{
      if(user) fetchAchats(user);
      else { setAchats(loadLocal(KEYS.historique)||[]); setLoading(false); }
    });
    return () => unsubscribe();
  }, [online, t]);

  const totalDepense = achats.reduce((sum, item) => sum + (item.montant||0), 0);

  return (
    <div className="historique-page">
      <h1>{t('history')}</h1>
      <p>{t('totalSpent')}: {totalDepense.toFixed(2)} FC</p>

      {loading ? <p>{t('loadingHistory')}</p> : (
        <ul className="historique-list">
          {achats.length === 0 ? <li>{t('noPurchases')}</li> :
            achats.map(a => (
              <li key={a.id} className="historique-item">
                <div>{a.nom || t('purchase')} - {a.montant?.toFixed(2)} FC</div>
                <div>{new Date((a.date?.seconds||Date.now()/1000)*1000).toLocaleString()}</div>
              </li>
            ))
          }
        </ul>
      )}

      <FooterNav />
    </div>
  );
}
