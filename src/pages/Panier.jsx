import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { loadLocal, saveLocal, addToPanier, syncPendingData, isOnline as checkOnline } from '../utils/offlineUtils';
import './Panier.css';

export default function Panier() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [modalVisible, setModalVisible] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);
  const db = getFirestore();
  const swipeStartX = useRef(null);

  // Gestion statut online/offline
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncPendingData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Chargement panier depuis localStorage + Firestore si online
  useEffect(() => {
    const localPanier = loadLocal('panier') || [];
    setPanier(localPanier);
    setLoading(false);
  }, []);

  // Sauvegarde automatique local
  useEffect(() => {
    saveLocal('panier', panier);
  }, [panier]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // Suppression produit
  const confirmRemoveProduit = (produit) => {
    setProduitToDelete(produit);
    setModalVisible(true);
  };
  const validerSuppression = async () => {
    if (!produitToDelete) return;
    const updated = panier.filter(item => item.code !== produitToDelete.code);
    setPanier(updated);
    saveLocal('panier', updated);

    if (auth.currentUser && isOnline) {
      const ref = doc(db, 'paniers', auth.currentUser.uid);
      await setDoc(ref, { articles: updated }, { merge: true });
    }

    setModalVisible(false);
    setProduitToDelete(null);
    setMessage(t('productRemoved'));
    setTimeout(() => setMessage(''), 2000);
  };
  const annulerSuppression = () => { setModalVisible(false); setProduitToDelete(null); };

  // Swipe pour overlay liste
  useEffect(() => {
    const handleTouchStart = e => swipeStartX.current = e.touches[0].clientX;
    const handleTouchEnd = e => {
      const deltaX = e.changedTouches[0].clientX - swipeStartX.current;
      if (deltaX < -50) setShowListeOverlay(true);
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="panier-page relative">
      {message && <div className="camera-message">{message}</div>}

      <div className={`panier-content scrollable-content${modalVisible ? ' modal-blur' : ''}`}>
        <h1 className="total-header">{t('total')}: {total.toFixed(2)} FCFA</h1>

        {!isOnline && <p className="offline-warning">{t('offlineCartNotice') || 'Mode hors-ligne. Données locales utilisées.'}</p>}

        {loading ? (
          <p className="loading-text">{t('loadingCart') || 'Chargement du panier...'}</p>
        ) : panier.length === 0 ? (
          <p className="empty-text">{t('cartEmptyMessage') || 'Votre panier est vide.'}</p>
        ) : (
          <ul className="product-list">
            {panier.map((item, idx) => (
              <li key={idx} className="product-item">
                <div className="item-name">{item.nom}</div>
                <div className="item-price">{item.prix.toFixed(2)} FCFA</div>
                <button
                  className="remove-btn"
                  aria-label={t('removeProduct')}
                  onClick={() => confirmRemoveProduit(item)}
                >✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>{t('removeConfirmMessage') || 'Vous devez également retirer ce produit de votre panier physique. Confirmez la suppression ?'}</p>
            <div className="modal-buttons">
              <button className="button-base" onClick={validerSuppression}>{t('ok') || 'OK'}</button>
              <button className="button-base" onClick={annulerSuppression}>{t('cancel') || 'Annuler'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="floating-button-row">
        {panier.length > 0 && (
          <button className="button-base validate-btn" onClick={() => navigate('/paiement')}>
            {t('validatePurchase') || 'Valider l’achat'}
          </button>
        )}
      </div>

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
