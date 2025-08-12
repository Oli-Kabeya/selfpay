import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { loadLocalData, saveLocalData } from '../utils/offlineUtils';
import './Panier.css';

export default function Panier() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [modalVisible, setModalVisible] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);

  const db = getFirestore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const local = loadLocalData('panier') || [];
    setPanier(local);

    const chargerData = async () => {
      const user = auth.currentUser;
      if (user && isOnline) {
        try {
          const panierRef = doc(db, 'paniers', user.uid);
          const docSnap = await getDoc(panierRef);
          if (docSnap.exists()) {
            const firestoreData = docSnap.data().articles || [];
            setPanier(firestoreData);
            saveLocalData('panier', firestoreData);
          }
        } catch (err) {
          console.error('Erreur Firestore:', err);
        }
      }
      setLoading(false);
    };

    chargerData();
  }, [db, isOnline]);

  useEffect(() => {
    saveLocalData('panier', panier);
  }, [panier]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // Ouvre modale de confirmation suppression
  const confirmRemoveProduit = (produit) => {
    setProduitToDelete(produit);
    setModalVisible(true);
  };

  // Valide suppression produit
  const validerSuppression = async () => {
    if (!produitToDelete) return;

    const updated = panier.filter(item => item.code !== produitToDelete.code);
    setPanier(updated);
    saveLocalData('panier', updated);

    const user = auth.currentUser;
    if (user && isOnline) {
      const ref = doc(db, 'paniers', user.uid);
      await setDoc(ref, { articles: updated }, { merge: true });
    }

    setModalVisible(false);
    setProduitToDelete(null);
    setMessage(t('productRemoved'));
    setTimeout(() => setMessage(''), 2000);
  };

  const annulerSuppression = () => {
    setModalVisible(false);
    setProduitToDelete(null);
  };

  const swipeStartX = useRef(null);
  useEffect(() => {
    const handleTouchStart = (e) => swipeStartX.current = e.touches[0].clientX;
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

  return (
    <div className="panier-page relative">
      {message && <div className="camera-message">{message}</div>}

      <div className={`panier-content scrollable-content${modalVisible ? ' modal-blur' : ''}`}>
        <h1 className="total-header">{t('total')}: {total.toFixed(2)} $</h1>

        {!isOnline && (
          <p className="offline-warning">{t('offlineCartNotice') || 'Mode hors-ligne. Données locales utilisées.'}</p>
        )}

        {loading ? (
          <p className="loading-text">{t('loadingCart') || 'Chargement du panier...'}</p>
        ) : panier.length === 0 ? (
          <p className="empty-text">{t('cartEmptyMessage') || 'Votre panier est vide.'}</p>
        ) : (
          <ul className="product-list">
            {panier.map((item, idx) => (
              <li key={idx} className="product-item">
                <div className="item-name">{item.nom}</div>
                <div className="item-price">{item.prix.toFixed(2)} $</div>
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
