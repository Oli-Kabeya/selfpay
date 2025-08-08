import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { loadLocalData, saveLocalData } from '../utils/offlineUtils';
import './Panier.css';

export default function Panier() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const videoRef = useRef(null);
  const swipeStartX = useRef(null);
  const codeReaderRef = useRef(null);
  const db = getFirestore();
  const timeoutRef = useRef(null);

  // Ecoute changements de statut réseau
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

  // Chargement panier local puis Firestore si online
  useEffect(() => {
    const local = loadLocalData('panier') || [];
    setPanier(local);

    const chargerFirestore = async () => {
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

    chargerFirestore();
  }, [db, isOnline]);

  // Sauvegarde locale panier à chaque modification
  useEffect(() => {
    saveLocalData('panier', panier);
  }, [panier]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // Arrêt caméra et clear timeout
  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    clearTimeout(timeoutRef.current);
  };

  // Démarrage caméra et scan code barre une seule fois
  useEffect(() => {
    if (!showCamera) {
      stopCamera();
      return;
    }
    const startCamera = async () => {
      try {
        codeReaderRef.current = new BrowserMultiFormatReader();
        await codeReaderRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current)
          .then(async (result) => {
            stopCamera(); // arrêt immédiat

            const code = result.getText();
            await handleRemoveScan(code);

            setMessage(t('productRemoved'));
            timeoutRef.current = setTimeout(() => {
              setMessage('');
              setShowCamera(false);
            }, 2000);
          });
      } catch (err) {
        console.error('Erreur caméra :', err);
        stopCamera();
        setShowCamera(false);
        alert(t('cameraError') || 'Erreur caméra');
      }
    };
    startCamera();
    return () => stopCamera();
  }, [showCamera, t]);

  // Supprimer produit du panier local et Firestore si online
  const handleRemoveScan = async (code) => {
    const updated = panier.filter(item => item.code !== code);
    setPanier(updated);
    saveLocalData('panier', updated);

    const user = auth.currentUser;
    if (user && isOnline) {
      const ref = doc(db, 'paniers', user.uid);
      await setDoc(ref, { articles: updated }, { merge: true });
    }
  };

  // Gestion swipe pour ouvrir liste overlay
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

      <div className="panier-content scrollable-content">
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCamera && (
        <div className="camera-overlay">
          <div className="camera-container">
            <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
            <button onClick={() => { stopCamera(); setShowCamera(false); }} className="close-camera-btn">
              ✕ {t('closeCamera') || 'Fermer caméra'}
            </button>
          </div>
        </div>
      )}

      <div className="floating-button-row">
        <button className="button-base scan-btn" onClick={() => setShowCamera(true)}>
          {t('removeScan') || 'Scanner pour retirer'}
        </button>
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
