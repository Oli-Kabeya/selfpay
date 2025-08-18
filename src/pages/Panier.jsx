// Panier.jsx (version ultra-stable)
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanier } from '../context/PanierContext';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { KEYS, loadLocal, syncPendingData, isOnline } from '../utils/offlineUtils';
import './Panier.css';

export default function Panier() {
  const { panier, addToPanier, removeFromPanier, syncPending } = usePanier();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const [modalVisible, setModalVisible] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);
  const swipeStartX = useRef(null);

  // --- Gestion connexion online/offline
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnlineState(true);
      await syncPending(); // sync immédiat à la reconnexion
    };
    const handleOffline = () => setIsOnlineState(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPending]);

  // --- Initialiser panier si vide
  useEffect(() => {
    if (!panier || panier.length === 0) {
      const local = loadLocal(KEYS.panier) || [];
      local.forEach(item => addToPanier(item)); // remplit le contexte
    }
  }, [panier, addToPanier]);

  // --- Total
  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // --- Suppression produit
  const confirmRemoveProduit = (produit) => {
    setProduitToDelete(produit);
    setModalVisible(true);
  };

  const validerSuppression = async () => {
    if (!produitToDelete) return;
    await removeFromPanier(produitToDelete);
    setModalVisible(false);
    setProduitToDelete(null);
    setMessage(t('productRemoved') || 'Produit supprimé');
    setTimeout(() => setMessage(''), 2000);
  };

  const annulerSuppression = () => {
    setModalVisible(false);
    setProduitToDelete(null);
  };

  // --- Swipe pour overlay liste
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
        <h1 className="total-header">{t('total')}: {total.toFixed(2)} FC</h1>

        {!isOnlineState && <p className="offline-warning">{t('offlineCartNotice') || 'Mode hors-ligne. Données locales utilisées.'}</p>}

        {panier.length === 0 ? (
          <p className="empty-text">{t('cartEmptyMessage') || 'Votre panier est vide.'}</p>
        ) : (
          <ul className="product-list">
            {panier.map((item, idx) => (
              <li key={item.idSansCode || item.code || idx} className="product-item">
                <div className="item-name">{item.nom}</div>
                <div className="item-price">{item.prix.toFixed(2)} FC</div>
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
