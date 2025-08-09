import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth } from '../firebase';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { loadLocalData, saveLocalData } from '../utils/offlineUtils';
import './Scan.css';

// Ajoute produit localement dans le panier
const addProductOffline = (produit) => {
  const panier = loadLocalData('panier') || [];
  const updated = [...panier, produit];
  saveLocalData('panier', updated);
};

export default function Scan() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Nouveaux états pour produits sans codes
  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const db = getFirestore();
  const timeoutRef = useRef(null);

  // Ref pour éviter double-traitement si plusieurs résultats arrivent
  const processingRef = useRef(false);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Charger la liste des produits sans codes à l’ouverture du scan
  useEffect(() => {
    const fetchProduitsSansCodes = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'produits_sans_codes'));
        const produits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProduitsSansCodes(produits);
      } catch (error) {
        console.error('Erreur chargement produits sans codes:', error);
      }
    };
    fetchProduitsSansCodes();
  }, [db]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (scanning) startScan();
    else stopCamera();
  }, [scanning]);

  const startScan = async () => {
    try {
      setManualEntry(false);
      processingRef.current = false;
      codeReaderRef.current = new BrowserMultiFormatReader();
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, focusMode: 'continuous' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Timer saisie manuelle si pas de scan
      timeoutRef.current = setTimeout(() => {
        setManualEntry(true);
        // stopCamera arrête le flux immédiatement
        stopCamera();
      }, 10000);

      // Callback : traitement à la première détection seulement
      await codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, async (result) => {
        if (result && !processingRef.current) {
          processingRef.current = true;
          clearTimeout(timeoutRef.current);

          // Arrêt immédiat du flux pour éviter autres détections
          stopCamera();

          // Maintenant ajout du produit
          try {
            await ajouterProduit(result.getText());
          } catch (err) {
            console.error('Erreur lors de l\'ajout après scan:', err);
            // assure qu'on réinitialise l'état si erreur
            processingRef.current = false;
          }
        }
      });
    } catch (error) {
      console.error('Erreur caméra:', error);
      setMessage(t('cameraError'));
      setTimeout(() => setMessage(''), 2000);
      handleCloseCamera();
    }
  };

  const stopCamera = () => {
    clearTimeout(timeoutRef.current);
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
  };

  const ajouterProduit = async (code) => {
    const produit = {
      nom: `${t('product')} ${code.slice(0, 5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code
    };

    addProductOffline(produit);

    const user = auth.currentUser;
    if (user && isOnline) {
      try {
        const ref = doc(db, 'paniers', user.uid);
        const snap = await getDoc(ref);
        const anciens = snap.exists() ? snap.data().articles || [] : [];
        await setDoc(ref, { articles: [...anciens, produit] });
      } catch (err) {
        console.error('Erreur Firestore:', err);
      }
    }

    setMessage(t('productAdded'));
    setTimeout(() => {
      setMessage('');
      processingRef.current = false;
      handleCloseCamera();
    }, 2000);
  };

  // Nouvelle fonction pour ajouter un produit sans code sélectionné dans la liste
  const ajouterProduitSansCode = async () => {
    if (!selectedProduitId) return;

    const produit = produitsSansCodes.find(p => p.id === selectedProduitId);
    if (!produit) return;

    // On prépare un objet produit simplifié pour le panier (pas de code)
    const produitAjout = {
      nom: produit.nom,
      prix: produit.prix,
      code: '', // vide car pas de code barre
      idSansCode: produit.id // possibilité de suivre
    };

    addProductOffline(produitAjout);

    const user = auth.currentUser;
    if (user && isOnline) {
      try {
        const ref = doc(db, 'paniers', user.uid);
        const snap = await getDoc(ref);
        const anciens = snap.exists() ? snap.data().articles || [] : [];
        await setDoc(ref, { articles: [...anciens, produitAjout] });
      } catch (err) {
        console.error('Erreur Firestore:', err);
      }
    }

    setMessage(t('productAdded'));
    setTimeout(() => {
      setMessage('');
      handleCloseCamera();
    }, 2000);
  };

  const handleCloseCamera = () => {
    processingRef.current = false;
    stopCamera();
    setScanning(false);
    setMessage('');
    setManualEntry(false);
    setManualCode('');
    setSelectedProduitId('');
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      ajouterProduit(manualCode.trim());
      setManualEntry(false);
      setManualCode('');
    }
  };

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
    <div className="scan-page">
      <h1 className="app-title">SelfPay</h1>
      <p className="scan-subtitle">{t('tapToAddProduct')}</p>

      {!scanning && !manualEntry && (
        <div className="scan-button-container" onClick={() => setScanning(true)} role="button" tabIndex={0}>
          <div className="scan-button"><Barcode size={40} /></div>
        </div>
      )}

      {scanning && (
        <div className="camera-container">
          <video ref={videoRef} muted autoPlay playsInline className="camera-video" />
          {message && <div className="camera-message">{message}</div>}

          {/* Bouton liste produits prédéfinis (opposé bouton fermer caméra) */}
          <div className="camera-buttons-row">
            <button
              onClick={() => {
                processingRef.current = false;
                stopCamera();
                setShowListeOverlay(true);
              }}
              className="camera-button camera-list"
              aria-label={t('openList') || 'Liste'}
            >
              {t('openList') || 'Liste'}
            </button>

            {/* Bouton Sans Codes + liste déroulante */}
            <div className="sans-codes-container">
              <select
                value={selectedProduitId}
                onChange={(e) => setSelectedProduitId(e.target.value)}
                className="sans-codes-select"
                aria-label={t('selectSansCodeProduct') || 'Sélectionner un produit sans code'}
              >
                <option value="">{t('selectProduct') || '-- Choisissez un produit --'}</option>
                {produitsSansCodes.map(p => (
                  <option key={p.id} value={p.id}>{p.nom} - {p.prix.toFixed(2)} $</option>
                ))}
              </select>
              <button
                onClick={ajouterProduitSansCode}
                disabled={!selectedProduitId}
                className="camera-button sans-codes-add"
              >
                {t('add') || 'Ajouter'}
              </button>
            </div>

            <button onClick={handleCloseCamera} className="camera-button camera-close">
              <X size={16} /> {t('closeCamera')}
            </button>
          </div>
        </div>
      )}

      {manualEntry && (
        <div className="manual-entry">
          <p>{t('manualEntryPrompt')}</p>
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={t('enterBarcode')}
          />
          <button onClick={handleManualSubmit}>{t('validate')}</button>
          <button onClick={handleCloseCamera}>{t('cancel')}</button>
        </div>
      )}

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
