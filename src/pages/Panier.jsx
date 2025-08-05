import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import './Panier.css';

export default function Panier() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const videoRef = useRef(null);
  const swipeStartX = useRef(null);
  const codeReaderRef = useRef(null);
  const db = getFirestore();

  // Charger panier Firestore
  useEffect(() => {
    const chargerPanier = async () => {
      const user = auth.currentUser;
      if (user) {
        const panierRef = doc(db, 'paniers', user.uid);
        const docSnap = await getDoc(panierRef);
        const data = docSnap.exists() ? docSnap.data().articles || [] : [];
        setPanier(data);
      } else {
        setPanier([]);
      }
      setLoading(false);
    };
    chargerPanier();
  }, [db]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // Gestion caméra suppression produit
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
            const code = result.getText();
            await handleRemoveScan(code);
            stopCamera(); // ✅ Stop caméra après scan
            setShowCamera(false);
          });
      } catch (err) {
        console.error('Erreur caméra :', err);
        stopCamera();
        setShowCamera(false);
        alert(t('cameraError') || 'Erreur caméra. Vérifiez les permissions.');
      }
    };

    startCamera();

    return () => stopCamera();
  }, [showCamera]);

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleRemoveScan = async (scannedCode) => {
    const updatedPanier = panier.filter(item => item.code !== scannedCode);
    setPanier(updatedPanier);
    localStorage.setItem('panier', JSON.stringify(updatedPanier));

    const user = auth.currentUser;
    if (user) {
      const panierRef = doc(db, 'paniers', user.uid);
      await setDoc(panierRef, { articles: updatedPanier }, { merge: true });
    }
  };

  // Swipe gauche => ouvre ListeOverlay
  useEffect(() => {
    const handleTouchStart = (e) => {
      swipeStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e) => {
      const swipeEndX = e.changedTouches[0].clientX;
      const deltaX = swipeEndX - swipeStartX.current;
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
      <div className="panier-content scrollable-content">
        <h1 className="total-header">
          {t('total')}: {total.toFixed(2)} $
        </h1>

        {loading ? (
          <p className="loading-text">{t('loadingCart')}</p>
        ) : panier.length === 0 ? (
          <p className="empty-text">{t('cartEmptyMessage')}</p>
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

      {/* CameraView suppression produit */}
      {showCamera && (
        <div className="camera-overlay">
          <video ref={videoRef} className="camera-video" autoPlay muted playsInline />
          <button
            className="close-camera-btn"
            onClick={() => {
              stopCamera();
              setShowCamera(false);
            }}
          >
            ✕ {t('closeCamera')}
          </button>
        </div>
      )}

      <div className="floating-button-row">
        <button
          className="button-base scan-btn"
          onClick={() => setShowCamera(true)}
        >
          {t('removeScan')}
        </button>

        {panier.length > 0 && (
          <button
            className="button-base validate-btn"
            onClick={() => navigate('/paiement')}
          >
            {t('validatePurchase')}
          </button>
        )}
      </div>

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
