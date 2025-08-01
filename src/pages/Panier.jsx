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
  const codeReader = useRef(null);
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
      codeReader.current = new BrowserMultiFormatReader();
      codeReader.current
        .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result) {
            const code = result.getText();
            if (code !== lastScanned) {
              setLastScanned(code);
              supprimerProduitParScan(code);
              codeReader.current.reset();
              setShowConfirmation(true);
            }
          }
        })
        .catch((err) => {
          console.error('Erreur caméra:', err);
          setScanning(false);
        });

      return () => {
        if (codeReader.current) {
          codeReader.current.reset();
          codeReader.current = null;
        }
      };
    }
  }, [scanning, showConfirmation, lastScanned]);

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
        <div className="camera-container">
          <video
            ref={videoRef}
            width="300"
            height="300"
            style={{ borderRadius: 8, border: '2px solid #ccc' }}
            muted
            autoPlay
            playsInline
          />
          <button onClick={handleCloseCamera} className="close-button">
            <X size={18} /> {t('closeCamera')}
          </button>

          {showConfirmation && (
            <div className="confirmationOverlay">
              <p>{t('productDeletedSuccess')}</p>
              <button onClick={handleContinueScan}>{t('continueScanning')}</button>
              <button onClick={handleCloseCamera}>{t('finish')}</button>
            </div>
          )}
        </div>
      )}

      <FooterNav />
    </div>
  );
};

export default Panier;
