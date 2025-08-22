// Panier.jsx (corrigé et stable, gestion quantités + tri décroissant par ajoute_le + modal réduction)
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanier } from '../context/PanierContext';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { KEYS, loadLocal, isOnline } from '../utils/offlineUtils';
import './Panier.css';

export default function Panier() {
  const { panier, setPanier, removeFromPanier, syncPending } = usePanier();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnlineState, setIsOnlineState] = useState(isOnline());
  const [modalVisible, setModalVisible] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);
  const [reduceModalVisible, setReduceModalVisible] = useState(false);
  const [produitToReduce, setProduitToReduce] = useState(null);

  const swipeStartX = useRef(null);

  // --- Gestion connexion online/offline
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnlineState(true);
      await syncPending();
    };
    const handleOffline = () => setIsOnlineState(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPending]);

  // --- Initialiser panier depuis le localStorage si vide
  useEffect(() => {
    if (!panier || panier.length === 0) {
      const local = loadLocal(KEYS.panier) || [];
      if (local.length > 0) {
        setPanier(local);
      }
    }
  }, [panier, setPanier]);

  // --- Total avec quantités
  const total = panier.reduce(
    (sum, item) => sum + (item.prix || 0) * (item.quantity || 1),
    0
  );

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

  // --- Réduction de quantité
  const confirmReduceProduit = (produit) => {
    setProduitToReduce(produit);
    setReduceModalVisible(true);
  };

  const validerReduction = async () => {
    if (!produitToReduce) return;
    const updatedPanier = panier.map((p) =>
      p.code === produitToReduce.code
        ? { ...p, quantity: (p.quantity || 1) - 1 }
        : p
    ).filter(p => (p.quantity || 1) > 0);

    setPanier(updatedPanier);
    setReduceModalVisible(false);
    setProduitToReduce(null);
    setMessage(t('quantityReduced') || 'Quantité réduite');
    setTimeout(() => setMessage(''), 2000);
  };

  const annulerReduction = () => {
    setReduceModalVisible(false);
    setProduitToReduce(null);
  };

  // --- Swipe pour overlay liste
  useEffect(() => {
    const handleTouchStart = e => (swipeStartX.current = e.touches[0].clientX);
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

  // --- Trier le panier en ordre décroissant par ajoute_le
  const sortedPanier = useMemo(() => {
    if (!panier) return [];
    return [...panier].sort((a, b) => {
      const dateA = a.ajoute_le ? new Date(a.ajoute_le).getTime() : 0;
      const dateB = b.ajoute_le ? new Date(b.ajoute_le).getTime() : 0;
      return dateB - dateA; // décroissant
    });
  }, [panier]);

  return (
    <div className="panier-page relative">
      {message && <div className="camera-message">{message}</div>}

      <h1 className="total-header">
        {t('total')}: {total.toFixed(2)} FC
      </h1>

      <div className={`panier-content scrollable-content${(modalVisible || reduceModalVisible) ? ' modal-blur' : ''}`}>
        {!isOnlineState && (
          <p className="offline-warning">
            {t('offlineCartNotice') || 'Mode hors-ligne. Données locales utilisées.'}
          </p>
        )}

        {(!sortedPanier || sortedPanier.length === 0) ? (
          <p className="empty-text">
            {t('cartEmptyMessage') || 'Votre panier est vide.'}
          </p>
        ) : (
          <ul className="product-list">
            {sortedPanier.map((item, idx) => (
              <li key={`${item.code || item.idSansCode || idx}`} className="product-item">
                <div className="item-name">
                  {item.nom}
                  {item.quantity && item.quantity > 1 && (
                    <span className="item-quantity"> x{item.quantity}</span>
                  )}
                </div>
                <div className="item-price">
                  {(item.prix * (item.quantity || 1)).toFixed(2)} FC
                </div>
                <button
                  className="reduce-btn"
                  aria-label={t('reduceQuantity')}
                  onClick={() => confirmReduceProduit(item)}
                >
                  −
                </button>
                <button
                  className="remove-btn"
                  aria-label={t('removeProduct')}
                  onClick={() => confirmRemoveProduit(item)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal suppression */}
      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>
              {t('removeConfirmMessage') ||
                'Vous devez également retirer ce produit de votre panier physique. Confirmez la suppression ?'}
            </p>
            <div className="modal-buttons">
              <button className="button-base" onClick={validerSuppression}>
                {t('ok') || 'OK'}
              </button>
              <button className="button-base" onClick={annulerSuppression}>
                {t('cancel') || 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal réduction quantité */}
      {reduceModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>
              {t('reduceConfirmMessage', { produit: produitToReduce?.nom }) ||
                `Veuillez retirer 1 ${produitToReduce?.nom} de votre panier physique. Confirmez ?`}
            </p>
            <div className="modal-buttons">
              <button className="button-base" onClick={validerReduction}>
                {t('ok') || 'OK'}
              </button>
              <button className="button-base" onClick={annulerReduction}>
                {t('cancel') || 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="floating-button-row">
        {sortedPanier.length > 0 && (
          <button
            className="button-base validate-btn"
            onClick={() => navigate('/paiement')}
          >
            {t('validatePurchase') || 'Valider l’achat'}
          </button>
        )}
      </div>

      {showListeOverlay && (
        <ListeOverlay onClose={() => setShowListeOverlay(false)} />
      )}
    </div>
  );
}
