// Paiement.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import FooterNav from '../components/FooterNav';
import {
  addToHistorique,
  isOnline,
  loadLocal,
  KEYS,
  addPending,
  syncPendingData,
} from '../utils/offlineUtils';
import './Paiement.css';

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
    const localPanier = loadLocal(KEYS.panier) || [];
    setPanier(localPanier);
    const totalCalcule = localPanier.reduce(
      (sum, item) => sum + (item.prix || 0) * (item.quantite || 1),
      0
    );
    setTotal(totalCalcule);
  }, []);

  const validerPaiement = async () => {
    const user = auth.currentUser;
    if (!user) {
      setMessage(t('loginRequired') || 'Connexion requise.');
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
      items: panier,
    };

    try {
      if (isOnline()) {
        await addToHistorique(transaction);
        await syncPendingData();
      } else {
        addPending(KEYS.pending.historique, transaction);
        setMessage(
          t('offlinePaymentQueued') ||
            'Paiement enregistré localement et sera synchronisé dès connexion.'
        );
      }

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
    <div className="paiement-page">
      <div className="paiement-card">
        <h2>{t('payment') || 'Paiement'}</h2>
        <p>
          {t('total')}: <span>{total} $</span>
        </p>

        <label htmlFor="mode-paiement">{t('paymentMethod') || 'Méthode de paiement'} :</label>
        <select
          id="mode-paiement"
          value={modePaiement}
          onChange={(e) => setModePaiement(e.target.value)}
        >
          {/* Future intégration : Paiements_methodes.jsx */}
          <option value="selfpay">{t('selfpayPrepaid') || 'SelfPay prépayé'}</option>
        </select>

        <button className="pay-btn" onClick={validerPaiement}>
          {t('payNow') || 'Payer maintenant'}
        </button>

        {message && <p className="message">{message}</p>}
      </div>

      <FooterNav />
    </div>
  );
};

export default Paiement;
