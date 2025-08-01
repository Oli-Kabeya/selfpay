import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import FooterNav from '../components/FooterNav';

const Paiement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [modePaiement, setModePaiement] = useState('selfpay');
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState(0);
  const db = getFirestore();

  // Charger le total du panier au montage
  useEffect(() => {
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    const totalCalcule = panier.reduce((sum, item) => sum + (item.prix || 0), 0);
    setTotal(totalCalcule);
  }, []);

  const validerPaiement = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage(t('loginRequired'));
      return;
    }

    const transactionId = `TX-${Date.now()}`;
    const transaction = {
      uid: user.uid,
      montant: total,
      mode: modePaiement,
      date: serverTimestamp(),
      id: transactionId,
    };

    try {
      const achatsRef = collection(db, 'achats', user.uid, 'liste');
      await addDoc(achatsRef, transaction);

      const anonymesRef = collection(db, 'transactions_anonymes');
      await addDoc(anonymesRef, {
        montant: total,
        mode: modePaiement,
        date: serverTimestamp(),
        id: transactionId,
      });

      navigate(`/qrcode/${transactionId}`);
    } catch (err) {
      console.error(err);
      setMessage(t('paymentError'));
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
