// src/pages/Paiement.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import FooterNav from '../components/FooterNav';
import { addToHistorique, isOnline, loadLocal, KEYS, addPending, syncPendingData } from '../utils/offlineUtils';

const Paiement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const db = getFirestore();

  const [modePaiement, setModePaiement] = useState('selfpay');
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState(0);
  const [panier, setPanier] = useState([]);

  // Charger le panier local au montage
  useEffect(() => {
    const localPanier = loadLocal(KEYS.panier);
    setPanier(localPanier);
    const totalCalcule = localPanier.reduce((sum, item) => sum + (item.prix || 0), 0);
    setTotal(totalCalcule);
  }, []);

  const validerPaiement = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage(t('loginRequired'));
      return;
    }

    if (panier.length === 0) {
      setMessage(t('emptyCart') || 'Votre panier est vide.');
      return;
    }

    const transactionId = `TX-${Date.now()}`;
    const transaction = {
      uid: user.uid,
      montant: total,
      mode: modePaiement,
      date: new Date(),
      id: transactionId,
      items: panier
    };

    try {
      if (isOnline()) {
        // Si connecté, sync direct via offlineUtils
        await addToHistorique(transaction);
        await syncPendingData();
      } else {
        // Si offline, ajouter à la file pending
        addPending(KEYS.pending.historique, transaction);
        setMessage(t('offlinePaymentQueued') || 'Paiement enregistré localement et sera synchronisé dès connexion.');
      }

      // Vider le panier local après paiement
      localStorage.setItem(KEYS.panier, JSON.stringify([]));
      setPanier([]);
      setTotal(0);

      navigate(`/qrcode/${transactionId}`);
    } catch (err) {
      console.error(err);
      setMessage(t('paymentError') || 'Erreur lors du paiement.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#121212] px-4 pb-20 page-transition transition-colors duration-300">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">{t('payment')}</h2>
        <p className="mb-6 text-center text-gray-800 dark:text-gray-200">
          {t('total')}: <span className="font-semibold">{total} $</span>
        </p>

        <label htmlFor="mode-paiement" className="block mb-2 font-semibold text-gray-800 dark:text-gray-200">
          {t('paymentMethod')} :
        </label>
        <select
          id="mode-paiement"
          value={modePaiement}
          onChange={(e) => setModePaiement(e.target.value)}
          className="mb-6 p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#1E1E1E] text-gray-900 dark:text-white w-full"
        >
          <option value="selfpay">{t('selfpayPrepaid')}</option>
        </select>

        <button
          onClick={validerPaiement}
          className="w-full p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#FF5E3A] to-[#FFBA00] shadow hover:opacity-90 transition-opacity duration-200"
        >
          {t('payNow')}
        </button>

        {message && <p className="mt-4 text-center text-red-500 text-sm">{message}</p>}
      </div>

      <FooterNav />
    </div>
  );
};

export default Paiement;
