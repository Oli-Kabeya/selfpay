import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
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
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Nouveaux states pour suppression manuelle produits sans codes
  const [produitsSansCodes, setProduitsSansCodes] = useState([]); // tableau de codes produits sans codes
  const [modalVisible, setModalVisible] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState(null);

  const videoRef = useRef(null);
  const swipeStartX = useRef(null);
  const codeReaderRef = useRef(null);
  const db = getFirestore();
  const timeoutRef = useRef(null);

  const processingRef = useRef(false);

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

    const chargerData = async () => {
      const user = auth.currentUser;
      if (user && isOnline) {
        try {
          // Charger panier Firestore
          const panierRef = doc(db, 'paniers', user.uid);
          const docSnap = await getDoc(panierRef);
          if (docSnap.exists()) {
            const firestoreData = docSnap.data().articles || [];
            setPanier(firestoreData);
            saveLocalData('panier', firestoreData);
          }

          // Charger la collection produits_sans_codes pour récupérer les codes
          const collRef = collection(db, 'produits_sans_codes');
          const querySnapshot = await getDocs(collRef);
          const codesSansCodes = querySnapshot.docs.map(doc => doc.id);
          setProduitsSansCodes(codesSansCodes);

        } catch (err) {
          console.error('Erreur Firestore:', err);
        }
      }
      setLoading(false);
    };

    chargerData();
  }, [db, isOnline]);

  // Sauvegarde locale panier à chaque modification
  useEffect(() => {
    saveLocalData('panier', panier);
  }, [panier]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // Arrêt caméra et clear timeout (idempotent)
  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      try {
        stream.getTracks().forEach(track => track.stop());
      } catch (e) { /* ignore */ }
      videoRef.current.srcObject = null;
    }
    clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    if (!showCamera) {
      stopCamera();
      processingRef.current = false;
      setManualEntry(false);
      setManualCode('');
      return;
    }

    const startCamera = async () => {
      try {
        processingRef.current = false;
        setManualEntry(false);
        codeReaderRef.current = new BrowserMultiFormatReader();

        timeoutRef.current = setTimeout(() => {
          stopCamera();
          setManualEntry(true);
        }, 10000);

        const result = await codeReaderRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current);

        if (!result) {
          stopCamera();
          setShowCamera(false);
          return;
        }

        if (processingRef.current) return;
        processingRef.current = true;

        clearTimeout(timeoutRef.current);
        stopCamera();

        const code = result.getText();
        await handleRemoveScan(code);

        setMessage(t('productRemoved'));
        timeoutRef.current = setTimeout(() => {
          setMessage('');
          processingRef.current = false;
          setShowCamera(false);
        }, 2000);
      } catch (err) {
        console.error('Erreur caméra :', err);
        stopCamera();
        processingRef.current = false;
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

  // Suppression manuelle par saisie
  const handleManualSubmit = async () => {
    if (manualCode.trim()) {
      await handleRemoveScan(manualCode.trim());
      setManualEntry(false);
      setManualCode('');
      setMessage(t('productRemoved'));
      setTimeout(() => setMessage(''), 2000);
    }
  };

  // --- Nouvelle fonction pour supprimer produit sans code après confirmation ---
  const confirmRemoveProduitSansCode = (produit) => {
    setProduitToDelete(produit);
    setModalVisible(true);
  };

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
            {panier.map((item, idx) => {
              const isSansCode = produitsSansCodes.includes(item.code);
              return (
                <li key={idx} className="product-item">
                  <div className="item-name">
                    {item.nom}
                    {isSansCode && (
                      <button
                        className="remove-btn"
                        aria-label={t('removeProduct')}
                        onClick={() => confirmRemoveProduitSansCode(item)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="item-price">{item.prix.toFixed(2)} $</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>{t('removeSansCodeConfirm') || 'Vous devez également retirer ce produit de votre panier physique. Confirmez la suppression ?'}</p>
            <div className="modal-buttons">
              <button className="button-base" onClick={validerSuppression}>{t('ok') || 'OK'}</button>
              <button className="button-base" onClick={annulerSuppression}>{t('cancel') || 'Annuler'}</button>
            </div>
          </div>
        </div>
      )}

      {showCamera && !manualEntry && (
        <div className="camera-overlay">
          <div className="camera-container">
            <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
            <button
              onClick={() => {
                processingRef.current = false;
                stopCamera();
                setShowCamera(false);
              }}
              className="close-camera-btn"
            >
              ✕ {t('closeCamera') || 'Fermer caméra'}
            </button>
          </div>
        </div>
      )}

      {manualEntry && (
        <div className="manual-entry">
          <p>{t('manualRemovePrompt') || "Impossible de scanner. Entrez le code barre à retirer :"}</p>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={t('enterBarcode')}
          />
          <button onClick={handleManualSubmit}>{t('validate')}</button>
          <button
            onClick={() => {
              setManualEntry(false);
              setManualCode('');
            }}
          >
            {t('cancel')}
          </button>
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
