import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { auth } from '../firebase';
import { useLocation } from 'react-router-dom';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { loadLocal, saveLocal, addToPanier, syncPendingData, isOnline as checkOnline } from '../utils/offlineUtils';
import SansCodesDropdown from '../components/SansCodesDropdown';
import './Scan.css';

export default function Scan() {
  const { t } = useTranslation();
  const location = useLocation(); // pour détecter les changements de page

  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');
  const [scanCountdown, setScanCountdown] = useState(10);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const db = getFirestore();
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const processingRef = useRef(false);
  const scanningRef = useRef(false); // ✅ pour éviter relance scan pendant stop

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
    const fetchProduitsSansCodes = async () => {
      if (!checkOnline()) {
        const cached = loadLocal('produitsSansCodes') || [];
        setProduitsSansCodes(cached);
        return;
      }
      try {
        const collRef = collection(db, 'produits_sans_codes');
        const snapshot = await getDocs(collRef);
        const produits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProduitsSansCodes(produits);
        saveLocal('produitsSansCodes', produits);
      } catch (err) {
        console.error('Erreur chargement produits sans codes:', err);
        const cached = loadLocal('produitsSansCodes') || [];
        setProduitsSansCodes(cached);
      }
    };
    fetchProduitsSansCodes();
  }, [db]);

  // --- Swipe overlay
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

  // --- Stop caméra fiable
  const stopCamera = () => {
    scanningRef.current = false; // empêche relance
    clearTimeout(timeoutRef.current);
    clearInterval(countdownRef.current);
    setScanCountdown(10);

    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      } catch {}
    }

    processingRef.current = false;
    setScanning(false);
  };

  // --- Ajouter produit scanné
  const ajouterProduit = async (code) => {
    const produit = { nom: `${t('product')} ${String(code).slice(0,5)}`, prix: Math.floor(Math.random()*10)+1, code };
    await addToPanier(produit);
    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => { setMessage(''); handleCloseCamera(); }, 2000);
  };

  const ajouterProduitSansCodeDirect = async (produit) => {
    if (!produit) return;
    const produitAjout = { nom: produit.nom, prix: produit.prix, code: '', idSansCode: produit.id };
    await addToPanier(produitAjout);
    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => { setMessage(''); handleCloseCamera(); }, 2000);
  };

  const ajouterProduitManuel = async (code) => {
    if (!code.trim()) { setMessage(t('emptyCodeError')); setTimeout(()=>setMessage(''),3000); return; }
    const produit = { nom: `${t('manualProduct')} ${code.slice(0,5)}`, prix: 1, code };
    await addToPanier(produit);
    setMessage(t('productAdded'));
    setTimeout(() => { setMessage(''); setManualEntry(false); setManualCode(''); }, 2000);
  };

  const handleManualSubmit = async () => { 
    if(manualCode.trim()){ 
      await ajouterProduitManuel(manualCode.trim()); 
      handleCloseCamera(); 
    } 
  };

  const handleCloseCamera = () => {
    stopCamera();
    setMessage('');
    setManualEntry(false);
    setManualCode('');
    setSelectedProduitId('');
  };

  // --- Start scan
  const startScan = async () => {
    if (scanningRef.current) return; // empêche double lancement
    scanningRef.current = true;
    setManualEntry(false);
    processingRef.current = false;

    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const constraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Timeout 10s
      timeoutRef.current = setTimeout(() => {
        setManualEntry(true);
        stopCamera();
      }, 10000);

      // Countdown visuel
      let counter = 10;
      setScanCountdown(counter);
      countdownRef.current = setInterval(() => {
        counter -= 1;
        setScanCountdown(counter);
        if (counter <= 0) clearInterval(countdownRef.current);
      }, 1000);

      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
        if (!result) return;
        if (!processingRef.current) {
          processingRef.current = true;
          clearTimeout(timeoutRef.current);
          clearInterval(countdownRef.current);
          await ajouterProduit(result.getText());
          stopCamera();
        }
      });
    } catch (err) {
      console.error('Erreur caméra:', err);
      setMessage(t('cameraError') || 'Erreur caméra');
      setTimeout(() => setMessage(''), 2000);
      handleCloseCamera();
    }
  };

  // --- Effet auto start / stop
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

      {showListeOverlay && <ListeOverlay onClose={()=>setShowListeOverlay(false)} />}
    </div>
  );
}
