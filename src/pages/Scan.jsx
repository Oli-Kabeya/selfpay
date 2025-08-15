import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { usePanier } from '../context/PanierContext';
import ListeOverlay from '../components/ListeOverlay';
import SuggestionsModal from '../components/SuggestionsModal';
import SansCodesDropdown from '../components/SansCodesDropdown';
import { fetchClosestProduct, fetchSuggestions } from '../utils/openFoodFacts';
import { loadLocal, saveLocal, syncPendingData, isOnline as checkOnline } from '../utils/offlineUtils';
import './Scan.css';

export default function Scan() {
  const { addToPanier } = usePanier();
  const { t } = useTranslation();
  const location = useLocation();

  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [scanCountdown, setScanCountdown] = useState(10);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const processingRef = useRef(false);
  const scanningRef = useRef(false);

  // --- Gestion online/offline + sync
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

  // --- Charger produits sans codes
  useEffect(() => {
    const cached = loadLocal('produitsSansCodes') || [];
    setProduitsSansCodes(cached);
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
    setManualEntry(false);
    setManualCode('');
  };

  // --- Ajouter produit scanné
  const ajouterProduit = async (code) => {
    if (!code) return;

    let produit = await fetchClosestProduct(code);

    if (!produit) {
      const apiSuggestions = await fetchSuggestions(code);
      if (apiSuggestions && apiSuggestions.length) {
        setSuggestions(apiSuggestions);
        setShowSuggestions(true);
        return; // attendre sélection
      } else {
        produit = { nom: `${t('manualProduct')} ${code.slice(0,5)}`, prix: 1, code };
      }
    }

    if (produit) {
      await addToPanier(produit);
      setMessage(t('productAdded') || 'Produit ajouté');
      setTimeout(() => setMessage(''), 1500);
      handleCloseCamera();
    }
  };

  const ajouterProduitSansCodeDirect = async (produit) => {
    if (!produit) return;
    const produitAjout = { nom: produit.nom, prix: produit.prix, code: '', idSansCode: produit.id };
    await addToPanier(produitAjout);
    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => setMessage(''), 1500);
    handleCloseCamera();
  };

  const ajouterProduitManuel = async (code) => {
    if (!code.trim()) { setMessage(t('emptyCodeError')); setTimeout(()=>setMessage(''),3000); return; }
    const produit = { nom: `${t('manualProduct')} ${code.slice(0,5)}`, prix: 1, code };
    await addToPanier(produit);
    setMessage(t('productAdded'));
    setTimeout(() => setMessage(''), 1500);
    setManualEntry(false);
    setManualCode('');
    handleCloseCamera();
  };

  const handleManualSubmit = async () => {
    if(manualCode.trim()){ 
      await ajouterProduitManuel(manualCode.trim()); 
    } 
  };

  // --- Start scan
  const startScan = async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setManualEntry(false);
    processingRef.current = false;

    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const constraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Timeout 10s
      timeoutRef.current = setTimeout(() => { setManualEntry(true); stopCamera(); }, 10000);

      // Countdown visuel
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

  // --- Auto start / stop
  useEffect(() => {
    if(scanning && !manualEntry) startScan();
    else stopCamera();
  }, [scanning, manualEntry]);

  // --- Stop caméra au changement de page
  useEffect(() => {
    stopCamera();
    setManualEntry(false);
  }, [location.pathname]);

  // --- Stop caméra au refresh / fermeture onglet
  useEffect(() => {
    const handleBeforeUnload = () => stopCamera();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="scan-page">
      <h1 className="app-title">SelfPay</h1>
      <p className="scan-subtitle">{t('tapToAddProduct')}</p>

      {!scanning && !manualEntry && (
        <div className="scan-button-container" onClick={() => setScanning(true)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setScanning(true)}>
          <div className="scan-button"><Barcode size={40}/></div>
        </div>
      )}

      {(scanning || manualEntry) && (
        <div className="camera-container">
          {message && <div className="camera-message">{message}</div>}

          {scanning && !manualEntry && (
            <>
              <video ref={videoRef} muted autoPlay playsInline className="camera-video" />
              <div className="scan-countdown">
                <div className="scan-progress" style={{ width: `${(scanCountdown/10)*100}%` }}></div>
                <span>{scanCountdown}s</span>
              </div>
            </>
          )}

          {manualEntry && (
            <div className="manual-entry camera-video">
              <p>{t('manualEntryPrompt')}</p>
              <input type="text" value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder={t('enterBarcode')} />
              <div className="bouton-container">
                <button onClick={handleManualSubmit}>{t('validate') || 'Valider'}</button>
                <button onClick={handleCloseCamera}>{t('cancel') || 'Annuler'}</button>
              </div>
            </div>
          )}

          <div className="camera-buttons-row">
            <div className="sans-codes-container">
              <SansCodesDropdown onAdd={ajouterProduitSansCodeDirect} produits={produitsSansCodes} />
            </div>
            {scanning && !manualEntry && (
              <button onClick={handleCloseCamera} className="camera-button camera-close">
                <X size={16}/> {t('closeCamera') || 'Fermer caméra'}
              </button>
            )}
          </div>
        </div>
      )}

      <SuggestionsModal
        suggestions={suggestions}
        onClose={() => setShowSuggestions(false)}
        onSelect={async (p) => {
          setShowSuggestions(false);
          setSuggestions([]);
          await addToPanier(p);
          setMessage(t('productAdded') || 'Produit ajouté');
          setTimeout(() => setMessage(''), 1500);
          handleCloseCamera();
        }}
      />

      {showListeOverlay && <ListeOverlay onClose={()=>setShowListeOverlay(false)} />}
    </div>
  );
}
