// Scan.jsx (corrigé : appel addToPanier + input fiable)
import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { usePanier } from '../context/PanierContext';
import ListeOverlay from '../components/ListeOverlay';
import SansCodesDropdown from '../components/SansCodesDropdown';
import { fetchExactProduct } from '../utils/openFoodFacts';
import { syncPendingData, isOnline as checkOnline } from '../utils/offlineUtils';
import './Scan.css';

export default function Scan() {
  const { addToPanier } = usePanier();
  const { t } = useTranslation();
  const location = useLocation();

  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [scanCountdown, setScanCountdown] = useState(10);
  const [showSansCodes, setShowSansCodes] = useState(false);

  // Modal quantité
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [produitEnAttente, setProduitEnAttente] = useState(null);
  const [quantite, setQuantite] = useState(1);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const processingRef = useRef(false);
  const scanningRef = useRef(false);

  // --- Gestion online/offline
  useEffect(() => {
    const updateStatus = () => {
      const online = checkOnline();
      setIsOnline(online);
      if (online) syncPendingData();
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // --- Swipe overlay
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

  // --- Stop caméra
  const stopCamera = () => {
    scanningRef.current = false;
    clearTimeout(timeoutRef.current);
    clearInterval(countdownRef.current);
    setScanCountdown(10);

    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try { videoRef.current.srcObject.getTracks().forEach(track => track.stop()); } catch {}
      videoRef.current.srcObject = null;
    }

    processingRef.current = false;
    setScanning(false);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setMessage('');
  };

  // --- Modal quantité
  const demanderQuantite = (produit) => {
    stopCamera();
    setProduitEnAttente(produit);
    setQuantite(1);
    setQuantityModalVisible(true);
  };

  const confirmerQuantite = async () => {
    if (!produitEnAttente || !quantite || quantite < 1) return;

    await addToPanier({ ...produitEnAttente, quantite: Number(quantite) });

    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => setMessage(''), 1500);

    setQuantityModalVisible(false);
    setProduitEnAttente(null);
    setQuantite(1);
  };

  const annulerQuantite = () => {
    setQuantityModalVisible(false);
    setProduitEnAttente(null);
    setQuantite(1);
  };

  // --- Ajouter produit scanné
  const ajouterProduit = async (code) => {
    if (!code) return;
    const produitExact = await fetchExactProduct(code);

    if (produitExact) {
      demanderQuantite(produitExact);
      return;
    }

    const produitManuel = { nom: `${t('manualProduct')} ${code.slice(0,5)}`, prix: 1, code };
    demanderQuantite(produitManuel);
  };

  const ajouterProduitSansCodeDirect = async (produit) => {
    if (!produit) return;
    const produitAjout = { nom: produit.nom, prix: produit.prix, code: '', idSansCode: produit.id };
    demanderQuantite(produitAjout);
  };

  // --- Start scan
  const startScan = async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    processingRef.current = false;

    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const constraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;

      timeoutRef.current = setTimeout(() => {
        stopCamera();
        setShowSansCodes(true);
      }, 10000);

      let counter = 10;
      setScanCountdown(counter);
      countdownRef.current = setInterval(() => {
        counter -= 1;
        setScanCountdown(counter);
        if (counter <= 0) clearInterval(countdownRef.current);
      }, 1000);

      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, async (result) => {
        if (!result) return;
        if (!processingRef.current) {
          processingRef.current = true;
          clearTimeout(timeoutRef.current);
          clearInterval(countdownRef.current);
          await ajouterProduit(result.getText());
        }
      });
    } catch (err) {
      console.error('Erreur caméra:', err);
      setMessage(t('cameraError') || 'Erreur caméra');
      setTimeout(() => setMessage(''), 2000);
      handleCloseCamera();
    }
  };

  useEffect(() => {
    if(scanning) startScan();
    else stopCamera();
  }, [scanning]);

  useEffect(() => {
    stopCamera();
    setShowSansCodes(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleBeforeUnload = () => stopCamera();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="scan-page">
      <h1 className="app-title">SelfPay</h1>
      <p className="scan-subtitle">{t('tapToAddProduct')}</p>

      {!scanning && !showSansCodes && (
        <div
          className="scan-button-container"
          onClick={() => setScanning(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && setScanning(true)}
        >
          <div className="scan-button"><Barcode size={40}/></div>
        </div>
      )}

      {scanning && (
        <div className="camera-container">
          <video ref={videoRef} muted autoPlay playsInline className="camera-video" />
          <div className="scan-countdown">
            <div className="scan-progress" style={{ width: `${(scanCountdown/10)*100}%` }}></div>
            <span>{scanCountdown}s</span>
          </div>
          <div className="camera-buttons-row">
            <button onClick={handleCloseCamera} className="camera-button camera-close">
              <X size={16}/> {t('closeCamera') || 'Fermer caméra'}
            </button>
          </div>
        </div>
      )}

      {showSansCodes && (
        <div className="sans-codes-wrapper">
          <SansCodesDropdown
            onAdd={ajouterProduitSansCodeDirect}
            onClose={() => setShowSansCodes(false)}
            produits={produitsSansCodes}
          />
        </div>
      )}

      {/* --- Modal quantité --- */}
      {quantityModalVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{t('enterQuantity')}</h2>
            <input
              type="number"
              min="1"
              value={quantite}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setQuantite("");
                  return;
                }
                const num = Number(val);
                if (!isNaN(num) && num >= 1) {
                  setQuantite(num);
                }
              }}
              onBlur={() => {
                if (quantite === "" || quantite < 1) {
                  setQuantite(1);
                }
              }}
              className="quantity-input"
            />

            <div className="modal-buttons">
              <button type="button" className="button-base" onClick={confirmerQuantite}>
                {t('ok')}
              </button>
              <button type="button" className="button-base" onClick={annulerQuantite}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <div className="global-message">{message}</div>}

      {showListeOverlay && <ListeOverlay onClose={()=>setShowListeOverlay(false)} />}
    </div>
  );
}
