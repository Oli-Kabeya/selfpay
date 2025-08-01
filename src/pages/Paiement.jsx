import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const Paiement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [modePaiement, setModePaiement] = useState('selfpay');
  const [message, setMessage] = useState('');
  const db = getFirestore();

  const total = JSON.parse(localStorage.getItem('panier') || '[]')
    .reduce((sum, item) => sum + (item.prix || 0), 0);

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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t('payment')}</h2>
      <p className="mb-4">{t('total')}: {total} $</p>

      <label className="block mb-2 font-semibold">{t('paymentMethod')} :</label>
      <select
        value={modePaiement}
        onChange={(e) => setModePaiement(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        <option value="selfpay">{t('selfpayPrepaid')}</option>
      </select>

      <button
        onClick={validerPaiement}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {t('payNow')}
      </button>

      {message && <p className="mt-2 text-red-500 text-sm">{message}</p>}
    </div>
  );
};

export default Paiement;
