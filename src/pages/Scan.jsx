import React, { useState, useEffect, useRef } from 'react';
import './Scan.css';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { auth } from '../firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import FooterNav from '../components/FooterNav';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';

export default function Scan() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const db = getFirestore();

  const ajouterProduitAuPanier = async (codeScanne) => {
    setIsProcessing(true);
    const produit = {
      nom: `${t('product')} ${codeScanne.substring(0, 5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code: codeScanne,
    };

    const panierActuel = JSON.parse(localStorage.getItem('panier')) || [];
    const nouveauPanier = [...panierActuel, produit];
    localStorage.setItem('panier', JSON.stringify(nouveauPanier));

    const user = auth.currentUser;
    if (user) {
      const panierRef = doc(db, 'paniers', user.uid);
      const docSnap = await getDoc(panierRef);
      const anciens = docSnap.exists() ? docSnap.data().articles || [] : [];
      const nouveauTotal = [...anciens, produit];
      await setDoc(panierRef, { articles: nouveauTotal });
    }

    if (navigator.vibrate) navigator.vibrate(100);
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 300);
    setMessage(`${t('added')}: ${produit.nom}`);
    setTimeout(() => setMessage(''), 2000);
    setIsProcessing(false);
  };

  useEffect(() => {
    if (scanning) {
      codeReader.current = new BrowserMultiFormatReader();

      codeReader.current
        .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result && !isProcessing) {
            const code = result.getText();
            if (code !== lastScanned) {
              setLastScanned(code);
              ajouterProduitAuPanier(code);
            }
          }
          // ignore err here (no barcode found, camera errors etc)
        })
        .catch((err) => {
          console.error('Error starting barcode scanner', err);
          setScanning(false);
        });
    }

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, [scanning, isProcessing, lastScanned]);

  return (
    <>
      {showFlash && <div className="flash-screen"></div>}
      <div className="scan-page page-transition">
        <h1 className="app-title">SelfPay</h1>
        <p className="scan-subtitle">{t('tapToAddProduct')}</p>

        {!scanning ? (
          <div className="scan-button-container" onClick={() => setScanning(true)}>
            <div className="scan-button">
              <Barcode size={40} color="white" />
            </div>
          </div>
        ) : (
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
            <button
              onClick={() => {
                setScanning(false);
                setLastScanned('');
                setIsProcessing(false);
              }}
              className="close-button"
            >
              <X size={18} />
              {t('closeCamera')}
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
        <FooterNav active="scan" />
      </div>
    </>
  );
}
