import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { auth } from '../firebase';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { loadLocalData, saveLocalData } from '../utils/offlineUtils';
import SansCodesDropdown from '../components/SansCodesDropdown';  // <-- import ajouté
import './Scan.css';

// Ajoute produit localement dans le panier (localStorage)
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

  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [selectedProduitId, setSelectedProduitId] = useState('');

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const db = getFirestore();
  const timeoutRef = useRef(null);
  const processingRef = useRef(false);

  // Online/offline
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Chargement des produits sans codes — **sans** filtre createdBy
  useEffect(() => {
    const fetchProduitsSansCodes = async () => {
      try {
        const collRef = collection(db, 'produits_sans_codes');
        const snapshot = await getDocs(collRef);
        const produits = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log('[Scan] produits_sans_codes chargés:', produits.length, produits);
        setProduitsSansCodes(produits);
      } catch (error) {
        console.error('Erreur chargement produits sans codes:', error);
      }
    };

    fetchProduitsSansCodes();
  }, [db]);

  // Cleanup caméra au démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Démarre / stoppe le scan quand scanning change
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

      // Timeout -> saisie manuelle
      timeoutRef.current = setTimeout(() => {
  setManualEntry(true);
  setScanning(false);  // Arrête le scan, mais ne reset pas manualEntry
  // Ne pas appeler handleCloseCamera ici
}, 10000);


      // Lance le decodeur
      await codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, async (result) => {
        if (result && !processingRef.current) {
          processingRef.current = true;
          clearTimeout(timeoutRef.current);
          try {
            await ajouterProduit(result.getText());
          } catch (err) {
            console.error("Erreur lors de l'ajout après scan:", err);
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
      try { codeReaderRef.current.reset(); } catch (e) { /* ignore */ }
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      } catch (e) { /* ignore */ }
      videoRef.current.srcObject = null;
    }
  };

  const ajouterProduit = async (code) => {
    const produit = {
      nom: `${t('product')} ${String(code).slice(0, 5)}`,
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

    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => {
      setMessage('');
      processingRef.current = false;
      handleCloseCamera();
    }, 2000);
  };

  // Fonction ajout produit sans code, par id (anciennement utilisée)
  const ajouterProduitSansCode = async () => {
    if (!selectedProduitId) return;

    const produit = produitsSansCodes.find(p => p.id === selectedProduitId);
    if (!produit) {
      console.warn('[Scan] produit non trouvé pour id:', selectedProduitId);
      return;
    }

    await ajouterProduitSansCodeDirect(produit);
  };

  // Nouvelle fonction ajout produit sans code, par produit complet (intégration SansCodesDropdown)
  const ajouterProduitSansCodeDirect = async (produit) => {
    if (!produit) return;

    const produitAjout = {
      nom: produit.nom,
      prix: produit.prix,
      code: '',
      idSansCode: produit.id
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

    setMessage(t('productAdded') || 'Produit ajouté');
    setTimeout(() => {
      setMessage('');
      handleCloseCamera();
    }, 2000);
  };

  // NOUVELLE fonction ajout manuel améliorée
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

    const user = auth.currentUser;
    if (user && isOnline) {
      try {
        const ref = doc(db, 'paniers', user.uid);
        const snap = await getDoc(ref);
        const anciens = snap.exists() ? snap.data().articles || [] : [];
        await setDoc(ref, { articles: [...anciens, produit] });
      } catch (err) {
        console.error('Erreur ajout manuel Firestore:', err);
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

  // modifié : appel de la nouvelle fonction d’ajout manuel
  //const handleManualSubmit = () => {
  //  ajouterProduitManuel(manualCode.trim());
 // };
 const handleManualSubmit = async () => {
  if (manualCode.trim()) {
    await ajouterProduitManuel(manualCode.trim());
    handleCloseCamera();
  }
};


  // Swipe left -> open overlay (optionnel)
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

          <div className="camera-buttons-row">
            <div className="sans-codes-container">
              {/* Intégration du composant SansCodesDropdown */}
              <SansCodesDropdown
                onAdd={(produit) => {
                  setSelectedProduitId(produit.id);
                  ajouterProduitSansCodeDirect(produit);
                }}
              />
            </div>

            <button onClick={handleCloseCamera} className="camera-button camera-close">
              <X size={16} /> {t('closeCamera') || 'Fermer caméra'}
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
          <button onClick={handleManualSubmit}>{t('validate') || 'Valider'}</button>
          <button onClick={handleCloseCamera}>{t('cancel') || 'Annuler'}</button>
        </div>
      )}

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
