import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import FooterNav from '../components/FooterNav';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import './Scan.css';

export default function Scan({ showListeOverlay, setShowListeOverlay }) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const db = getFirestore();

  // Nettoyage caméra au démontage
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Démarrer ou arrêter le scan selon l'état
  useEffect(() => {
    if (scanning) startScan();
    else stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const startScan = async () => {
    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      await codeReaderRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current)
        .then(result => {
          ajouterProduit(result.getText());
        });
    } catch (error) {
      console.error('Erreur scan:', error);
      setMessage(t('scanError'));
      setTimeout(() => setMessage(''), 2000);
      handleCloseCamera();
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      videoRef.current.srcObject = null;
    }
  };

  const ajouterProduit = async (code) => {
    const produit = {
      nom: `${t('product')} ${code.slice(0, 5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code
    };
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    localStorage.setItem('panier', JSON.stringify([...panier, produit]));

    const user = auth.currentUser;
    if (user) {
      const ref = doc(db, 'paniers', user.uid);
      const snap = await getDoc(ref);
      const anciens = snap.exists() ? snap.data().articles || [] : [];
      await setDoc(ref, { articles: [...anciens, produit] });
    }

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);
    setMessage(`${t('added')}: ${produit.nom}`);
    setScanning(false);
    setShowButtons(true);
  };

  const handleScanAgain = () => {
    setMessage('');
    setShowButtons(false);
    setScanning(true);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setScanning(false);
    setShowButtons(false);
    setMessage('');
  };

  return (
    <>
      {showFlash && <div className="flash-screen" />}
      <div className="scan-page" role="main" aria-label={t('scanPage')}>
        <h1 className="app-title">SelfPay</h1>
        <p className="scan-subtitle">{t('tapToAddProduct')}</p>

        {!scanning ? (
          <div
            className="scan-button-container"
            onClick={() => setScanning(true)}
            role="button"
            tabIndex={0}
            aria-label={t('startScan')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setScanning(true); }}
          >
            <div className="scan-button" aria-hidden="true">
              <Barcode size={40} color="white" />
            </div>
          </div>
        ) : (
          <div className="camera-container" aria-live="polite" aria-label={t('cameraActive')}>
            <video
              ref={videoRef}
              width="300"
              height="300"
              muted
              autoPlay
              playsInline
              className="camera-video"
            />
            <button
              onClick={handleCloseCamera}
              className="camera-button camera-close"
              aria-label={t('closeCamera')}
            >
              <X size={16} aria-hidden="true" /> {t('closeCamera')}
            </button>
          </div>
        )}

        {showButtons && (
          <div className="scan-buttons-container">
            <button
              onClick={handleScanAgain}
              className="camera-continue"
              aria-label={t('continueScanning')}
            >
              {t('continueScanning')}
            </button>
            <button
              onClick={handleCloseCamera}
              className="camera-finish"
              aria-label={t('finish')}
            >
              {t('finish')}
            </button>
          </div>
        )}

        {message && <p className="message" role="alert">{message}</p>}

        {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
        
      </div>
    </>
  );
}
