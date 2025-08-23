import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePanier } from '../context/PanierContext';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { KEYS, loadLocal, isOnline } from '../utils/offlineUtils';
import './Panier.css';

export default function Panier() {
  const { panier, removeFromPanier, updateQuantity, syncPending } = usePanier();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnlineState, setIsOnlineState] = useState(isOnline());

  // Modal suppression
  const [modalVisible, setModalVisible] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);

  // Modal changement quantité
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [produitToUpdate, setProduitToUpdate] = useState(null);
  const [newQuantity, setNewQuantity] = useState(0);

  const swipeStartX = useRef(null);

  // ----- Helpers
  const itemSignature = (p) =>
    `${p?.code ?? ''}|${p?.idSansCode ?? ''}|${p?.ajoute_le ?? ''}`;

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
        // ⚠️ On ne touche plus setPanier ici → à la place tu dois avoir une méthode dans ton contexte (genre initPanier)
        // Si tu veux que je t’ajoute initPanier dans ton PanierContext, dis-le-moi
      }
    }
  }, [panier]);

  // --- Total avec quantités
  const total = panier.reduce(
    (sum, item) => sum + (item.prix || 0) * (item.quantity || 1),
    0
  );

  // --- Suppression produit (modal)
  const confirmRemoveProduit = (produit) => {
    setProduitToDelete(produit);
    setModalVisible(true);
  };

  const validerSuppression = async () => {
    if (!produitToDelete) return;
    await removeFromPanier(produitToDelete);
    setModalVisible(false);
    setProduitToDelete(null);
    setMessage(t('productRemoved'));
    setTimeout(() => setMessage(''), 2000);
  };

  const annulerSuppression = () => {
    setModalVisible(false);
    setProduitToDelete(null);
  };

  // --- Modification quantité (+ / -) → ouvre modal delta
  const changeQuantity = (produit, delta) => {
    const current = produit.quantity || 1;
    const next = current + delta;

    if (next < 1) {
      confirmRemoveProduit(produit);
      return;
    }

    setProduitToUpdate(produit);
    setNewQuantity(next);
    setQuantityModalVisible(true);
  };

  const validerChangementQuantite = () => {
    if (!produitToUpdate) return;

    updateQuantity(produitToUpdate, newQuantity); // ✅ On passe bien produit + quantité au contexte

    setQuantityModalVisible(false);
    setProduitToUpdate(null);
    setNewQuantity(0);

    setMessage(
      newQuantity > (produitToUpdate.quantity || 1)
        ? t('quantityIncreased')
        : t('quantityReduced')
    );
    setTimeout(() => setMessage(''), 2000);
  };

  const annulerChangementQuantite = () => {
    setQuantityModalVisible(false);
    setProduitToUpdate(null);
    setNewQuantity(0);
  };

  // --- Swipe pour overlay liste
  useEffect(() => {
    const handleTouchStart = (e) => (swipeStartX.current = e.touches[0].clientX);
    const handleTouchEnd = (e) => {
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
      return dateB - dateA;
    });
  }, [panier]);

  return (
    <div className="panier-page relative">
      {message && <div className="camera-message">{message}</div>}

      <h1 className="total-header">
        {t('total')}: {total.toFixed(2)} FC
      </h1>

      <div
        className={`panier-content scrollable-content${
          modalVisible || quantityModalVisible ? ' modal-blur' : ''
        }`}
      >
        {!isOnlineState && (
          <p className="offline-warning">{t('offlineCartNotice')}</p>
        )}

        {(!sortedPanier || sortedPanier.length === 0) ? (
          <p className="empty-text">{t('cartEmptyMessage')}</p>
        ) : (
          <ul className="product-list">
            {sortedPanier.map((item, idx) => {
              const key = itemSignature(item) || idx;
              const qte = item.quantity || 1;
              return (
                <li key={key} className="product-item">
                  <div className="item-name">{item.nom}</div>

                  <div className="quantity-control">
                    <button
                      onClick={() => changeQuantity(item, -1)}
                      aria-label={t('decreaseQuantity')}
                    >
                      −
                    </button>
                    <span>{qte}</span>
                    <button
                      onClick={() => changeQuantity(item, +1)}
                      aria-label={t('increaseQuantity')}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-price">
                    {(item.prix * qte).toFixed(2)} FC
                  </div>

                  <button
                    className="remove-btn"
                    aria-label={t('removeProduct')}
                    onClick={() => confirmRemoveProduit(item)}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal suppression */}
      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>{t('removeConfirmMessage', { product: produitToDelete?.nom })}</p>
            <div className="modal-buttons">
              <button className="button-base" onClick={validerSuppression}>
                {t('ok')}
              </button>
              <button className="button-base" onClick={annulerSuppression}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal changement de quantité */}
      {quantityModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            {produitToUpdate && (
              <p>
                {newQuantity > (produitToUpdate.quantity || 1)
                  ? t('increaseConfirmMessage', {
                      count: newQuantity,
                      product: produitToUpdate.nom,
                    })
                  : t('reduceConfirmMessages', {
                      count: newQuantity,
                      product: produitToUpdate.nom,
                    })}
              </p>
            )}
            <div className="modal-buttons">
              <button
                className="button-base"
                onClick={validerChangementQuantite}
              >
                {t('ok')}
              </button>
              <button
                className="button-base"
                onClick={annulerChangementQuantite}
              >
                {t('cancel')}
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
            {t('validatePurchase')}
          </button>
        )}
      </div>

      {showListeOverlay && (
        <ListeOverlay onClose={() => setShowListeOverlay(false)} />
      )}
    </div>
  );
}
