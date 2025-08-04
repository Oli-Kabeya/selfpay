import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import './Panier.css';

export default function Panier({ showListeOverlay, setShowListeOverlay }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const chargerPanier = async () => {
      const user = auth.currentUser;
      if (user) {
        const panierRef = doc(db, 'paniers', user.uid);
        const docSnap = await getDoc(panierRef);
        if (docSnap.exists()) {
          const data = docSnap.data().articles || [];
          setPanier(data);
        } else {
          setPanier([]);
        }
      } else {
        setPanier([]);
      }
      setLoading(false);
    };
    chargerPanier();
  }, [db]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  return (
    <div className="panier-page relative">
      <div className="panier-content scrollable-content">
        <h1 className="total-header">
          {t('total') || 'Total'} : {total.toFixed(2)} $
        </h1>

        {loading ? (
          <p className="loading-text">{t('loadingCart') || 'Chargement...'}</p>
        ) : panier.length === 0 ? (
          <p className="empty-text">{t('cartEmptyMessage') || 'Votre panier est vide.'}</p>
        ) : (
          <ul className="product-list">
            {panier.map((item, idx) => (
              <li key={idx} className="product-item">
                <div className="item-name">{item.nom}</div>
                <div className="item-price">{item.prix.toFixed(2)} $</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Deux boutons côte à côte */}
      <div className="floating-button-row">
        <button
          className="scan-btn"
          onClick={() => navigate('/scan')}
        >
          {t('scanMore') || 'Scanner'}
        </button>

        {panier.length > 0 && (
          <button
            className="validate-btn"
            onClick={() => navigate('/paiement')}
          >
            {t('validatePurchase') || 'Valider'}
          </button>
        )}
      </div>

      {/* Overlay visible */}
      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
