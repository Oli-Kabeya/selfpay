import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth } from '../firebase';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { loadLocalData, saveLocalData } from '../utils/offlineUtils';
import SansCodesDropdown from '../components/SansCodesDropdown';
import './Scan.css';

// Ajoute produit localement dans panier
const addProductOffline = (produit) => {
  const panier = loadLocalData('panier') || [];
  const updated = [...panier, produit];
  saveLocalData('panier', updated);

  // Marquer ce produit comme "non synchronisé"
  const unsynced = loadLocalData('unsyncedProducts') || [];
  saveLocalData('unsyncedProducts', [...unsynced, produit]);
};

export default function Scan() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const db = getFirestore();
  const timeoutRef = useRef(null);
  const processingRef = useRef(false);

  // Met à jour état online/offline et lance sync si on revient en ligne
  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        syncUnsyncedProducts();
      }
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Chargement liste produits sans codes avec cache local
  useEffect(() => {
    const fetchProduitsSansCodes = async () => {
      if (!navigator.onLine) {
        // Offline → charger cache local
        const cached = loadLocalData('produitsSansCodes') || [];
        setProduitsSansCodes(cached);
        return;
      }
      try {
        const collRef = collection(db, 'produits_sans_codes');
        const snapshot = await getDocs(collRef);
        const produits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setProduitsSansCodes(produits);
        saveLocalData('produitsSansCodes', produits);
      } catch (error) {
        console.error('Erreur chargement produits sans codes:', error);
        const cached = loadLocalData('produitsSansCodes') || [];
        setProduitsSansCodes(cached);
      }
    };
    fetchProduitsSansCodes();
  }, [db]);

  // Nettoyage caméra au démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Démarrer/arrêter scan caméra
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
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Timeout 10s → passage saisie manuelle
      timeoutRef.current = setTimeout(() => {
        setManualEntry(true);
        stopCamera();
      }, 10000);

      await codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, async (result) => {
        if (result && !processingRef.current) {
          processingRef.current = true;
          clearTimeout(timeoutRef.current);
          try {
            await ajouterProduit(result.getText());
          } catch (err) {
            console.error("Erreur ajout après scan:", err);
            processingRef.current = false;
          }
        }
      });
    } catch (error) {
      console.error('Erreur caméra:', error);
      setMessage(t('cameraError') || 'Erreur caméra');
      setTimeout(() => setMessage(''), 2000);
      handleCloseCamera();
    }
  };

  const stopCamera = () => {
    clearTimeout(timeoutRef.current);
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch (e) {}
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      videoRef.current.srcObject = null;
    }
  };

  // Sync local non synchronisés vers Firestore dès online
  const syncUnsyncedProducts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const unsynced = loadLocalData('unsyncedProducts') || [];
    if (unsynced.length === 0) return;

    try {
      const ref = doc(db, 'paniers', user.uid);
      const snap = await getDoc(ref);
      const anciens = snap.exists() ? snap.data().articles || [] : [];

      // On ajoute TOUS les produits non synchronisés
      const nouveaux = [...anciens, ...unsynced];
      await setDoc(ref, { articles: nouveaux });

      // Puis on vide le cache local
      saveLocalData('unsyncedProducts', []);
      console.log(`Synchronisation de ${unsynced.length} produit(s) réussie.`);
    } catch (err) {
      console.error('Erreur lors de la synchronisation offline → online:', err);
    }
  };

  const ajouterProduit = async (code) => {
    const produit = {
      nom: `${t('product')} ${String(code).slice(0, 5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code
    };
    addProductOffline(produit);

    if (isOnline) {
      try {
        await syncUnsyncedProducts();
      } catch (err) {
        console.error('Erreur sync après ajout produit:', err);
      }
    }

    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => {
      setMessage('');
      handleCloseCamera();
    }, 2000);
  };

  const ajouterProduitSansCodeDirect = async (produit) => {
    if (!produit) return;
    const produitAjout = {
      nom: produit.nom,
      prix: produit.prix,
      code: '',
      idSansCode: produit.id
    };
    addProductOffline(produitAjout);

    if (isOnline) {
      try {
        await syncUnsyncedProducts();
      } catch (err) {
        console.error('Erreur sync après ajout produit sans code:', err);
      }
    }

    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => {
      setMessage('');
      handleCloseCamera();
    }, 2000);
  };

  const ajouterProduitManuel = async (code) => {
    if (!code.trim()) {
      setMessage(t('emptyCodeError'));
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const produit = {
      nom: `${t('manualProduct')} ${code.slice(0, 5)}`,
      prix: 1,
      code,
    };
    addProductOffline(produit);

    if (isOnline) {
      try {
        await syncUnsyncedProducts();
      } catch (err) {
        console.error('Erreur sync après ajout manuel:', err);
      }
    }

    setMessage(t('productAdded'));
    setTimeout(() => {
      setMessage('');
      setManualEntry(false);
      setManualCode('');
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

  const handleManualSubmit = async () => {
    if (manualCode.trim()) {
      await ajouterProduitManuel(manualCode.trim());
      handleCloseCamera();
    }
  };

  // Swipe pour ouvrir overlay liste
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
        <div
          className="scan-button-container"
          onClick={() => setScanning(true)}
          role="button"
          tabIndex={0}
        >
          <div className="scan-button"><Barcode size={40} /></div>
        </div>
      )}

      {(scanning || manualEntry) && (
        <div className="camera-container">
          {message && <div className="camera-message">{message}</div>}

          {/* Bloc vidéo ou saisie manuelle — même taille */}
          {scanning && !manualEntry && (
            <video ref={videoRef} muted autoPlay playsInline className="camera-video" />
          )}
          {manualEntry && (
            <div className="manual-entry camera-video">
              <p>{t('manualEntryPrompt')}</p>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={t('enterBarcode')}
              />
              <div className="bouton-container">
                <button onClick={handleManualSubmit}>{t('validate') || 'Valider'}</button>
                <button onClick={handleCloseCamera}>{t('cancel') || 'Annuler'}</button>
              </div>
            </div>
          )}

          <div className="camera-buttons-row">
            <div className="sans-codes-container">
              <SansCodesDropdown
                onAdd={(produit) => {
                  setSelectedProduitId(produit.id);
                  ajouterProduitSansCodeDirect(produit);
                }}
                produits={produitsSansCodes} // passer la liste en prop
              />
            </div>
            {/* Affiche le bouton fermer uniquement si on scanne (pas en manuel) */}
            {scanning && !manualEntry && (
              <button
                onClick={handleCloseCamera}
                className="camera-button camera-close"
              >
                <X size={16} /> {t('closeCamera') || 'Fermer caméra'}
              </button>
            )}
          </div>
        </div>
      )}

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
