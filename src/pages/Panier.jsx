import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { BrowserMultiFormatReader } from '@zxing/browser';
import FooterNav from '../components/FooterNav';
import { useTranslation } from 'react-i18next';
import { X, ScanLine } from 'lucide-react';
import './Panier.css';

const Panier = () => {
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
  }, [db]);

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
      <div className="loader-container bg-background text-primary">
        <div>
          {t('loadingCart')}
          <div className="loader-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="panier-page bg-background text-primary pb-28 max-w-md mx-auto">
      <div className="panier-total text-center text-lg font-semibold">
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
            className="w-full p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#FF5E3A] to-[#FFBA00] shadow hover:opacity-90 mb-2"
          >
            {t('validatePurchase')}
          </button>

          <button
            onClick={() => setScanning(true)}
            className="w-full p-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:opacity-90"
          >
            {t('scanToDelete')}
          </button>
        </>
      )}

      {message && <p className="mt-4 text-center text-blue-500 text-sm">{message}</p>}

      {scanning && (
        <div className="camera-container flex flex-col items-center justify-center relative mt-4">
          <video
            ref={videoRef}
            width="320"
            height="320"
            className="rounded-2xl border-2 border-gray-300 shadow-lg"
            muted
            autoPlay
            playsInline
          />

          {!showConfirmation && (
            <button
              onClick={handleCloseCamera}
              className="absolute top-2 right-2 bg-[#333] text-white rounded-full p-2 shadow z-20 flex items-center gap-2 hover:bg-black transition"
            >
              <X size={16} /> {t('closeCamera')}
            </button>
          )}

          {showConfirmation && (
            <div className="overlay-buttons flex flex-col items-center mt-4 gap-3 w-full px-4">
              <p className="text-sm text-center text-blue-500">{t('productDeletedSuccess')}</p>
              <button
                onClick={handleContinueScan}
                className="w-full py-2 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#007bff' }}
              >
                {t('continueScanning')}
              </button>
              <button
                onClick={handleCloseCamera}
                className="w-full py-2 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#333' }}
              >
                {t('closeCamera')}
              </button>
            </div>
          )}
        </div>
      )}

      <FooterNav />
    </div>
  );
};

export default Panier;
