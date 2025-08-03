import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { BrowserMultiFormatReader } from '@zxing/browser';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, ScanLine } from 'lucide-react';
import './Panier.css';

const Panier = ({ showListeOverlay, setShowListeOverlay, setPageReady }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
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
          localStorage.setItem('panier', JSON.stringify(data));
        } else {
          chargerLocal();
        }
      } else {
        chargerLocal();
      }
      setLoading(false);
      setPageReady(true); // On signale que la page est prête !
    };

    const chargerLocal = () => {
      const dataLocal = localStorage.getItem('panier');
      if (dataLocal) {
        setPanier(JSON.parse(dataLocal));
      } else {
        setPanier([]);
      }
    };

    chargerPanier();
  }, [db, setPageReady]);

  useEffect(() => {
    if (scanning && !showConfirmation) {
      codeReaderRef.current = new BrowserMultiFormatReader();
      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          if (code !== lastScanned) {
            setLastScanned(code);
            supprimerProduitParScan(code);
            stopCamera();
            setShowConfirmation(true);
          }
        }
      }).catch((err) => {
        console.error('Erreur caméra:', err);
        setScanning(false);
      });

      return () => {
        stopCamera();
      };
    }
  }, [scanning, showConfirmation, lastScanned]);

  const stopCamera = () => {
    if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const supprimerProduitParScan = async (codeScanne) => {
    const index = panier.findIndex(item => item.code === codeScanne);
    if (index !== -1) {
      const nouveauPanier = panier.filter((_, i) => i !== index);
      setPanier(nouveauPanier);
      localStorage.setItem('panier', JSON.stringify(nouveauPanier));
      const user = auth.currentUser;
      if (user) {
        const panierRef = doc(db, 'paniers', user.uid);
        await setDoc(panierRef, { articles: nouveauPanier });
      }
      setMessage(t('productDeletedSuccess'));
    } else {
      setMessage(t('productNotFound'));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleContinueScan = () => {
    setLastScanned('');
    setShowConfirmation(false);
    setScanning(true);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setScanning(false);
    setShowConfirmation(false);
    setLastScanned('');
  };

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);
  const allerAuPaiement = () => navigate('/paiement');

  if (loading) {
    return (
      <div
        className="loader-container bg-background text-primary"
        style={{ minHeight: 'calc(100vh - 56px)' }} // hauteur pour garder le footer en bas sans saut
      >
        <div>
          {t('loadingCart')}
          <div className="loader-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="panier-page bg-background text-primary pb-28 max-w-md mx-auto">
      <div className="panier-total">
        {t('total')}: {total} $
      </div>

      <div className="panier-content">
        {panier.length === 0 ? (
          <div className="empty-cart">
            <ScanLine className="empty-icon" />
            <p className="empty-text">{t('cartEmptyMessage')}</p>
          </div>
        ) : (
          <ul className="product-list">
            {panier.map((item, index) => (
              <li key={index} className="product-card">
                <span className="product-name">{item.nom}</span>
                <span className="product-price">{item.prix} $</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {panier.length > 0 && (
        <>
          <button
            onClick={allerAuPaiement}
            className="validate-btn w-full mb-2"
          >
            {t('validatePurchase')}
          </button>

          <button
            onClick={() => setScanning(true)}
            className="scan-btn w-full"
          >
            {t('scanToDelete')}
          </button>
        </>
      )}

      {message && <p className="message-info">{message}</p>}

      {scanning && (
        <div className="camera-container">
          <video
            ref={videoRef}
            width="320"
            height="320"
            muted
            autoPlay
            playsInline
          />
          {!showConfirmation && (
            <button
              onClick={handleCloseCamera}
              className="camera-close-btn"
              aria-label={t('closeCamera')}
            >
              <X size={16} /> {t('closeCamera')}
            </button>
          )}

          {showConfirmation && (
            <div className="overlay-buttons">
              <p className="message-info">{t('productDeletedSuccess')}</p>
              <button
                onClick={handleContinueScan}
                className="continue-btn"
              >
                {t('continueScanning')}
              </button>
              <button
                onClick={handleCloseCamera}
                className="close-btn"
              >
                {t('closeCamera')}
              </button>
            </div>
          )}
        </div>
      )}

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
};

export default Panier;
