import React, { useEffect, useState, useRef } from 'react';
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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [theme, setTheme] = useState('light');

  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const db = getFirestore();
  const messageTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  useEffect(() => {
    // Charger thème depuis localStorage (si non géré globalement)
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (scanning && !showConfirmation) {
      codeReader.current = new BrowserMultiFormatReader();

      codeReader.current
        .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result && !isProcessing) {
            const code = result.getText();
            if (code !== lastScanned) {
              setLastScanned(code);
              ajouterProduitAuPanier(code);
              codeReader.current.reset();
              setShowConfirmation(true);
            }
          }
          // On ignore les erreurs de scan (no barcode found)
        })
        .catch((err) => {
          console.error('Error starting barcode scanner', err);
          setScanning(false);
        });

      return () => {
        if (codeReader.current) {
          codeReader.current.reset();
          codeReader.current = null;
        }
      };
    }
  }, [scanning, isProcessing, lastScanned, showConfirmation]);

  const ajouterProduitAuPanier = async (codeScanne) => {
    setIsProcessing(true);
    const produit = {
      nom: `${t('product')} ${codeScanne.substring(0, 5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code: codeScanne,
    };

    try {
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
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setShowFlash(false), 300);

      setMessage(`${t('added')}: ${produit.nom}`);
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Erreur ajout produit au panier:', err);
      setMessage(t('errorAddingProduct'));
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    setShowConfirmation(false);
    setLastScanned(''); // Permet de rescanner même produit
    setScanning(true); // Relancer scan
  };

  const handleCloseCamera = () => {
    setShowConfirmation(false);
    setScanning(false);
    setLastScanned('');
  };

  return (
    <>
      {showFlash && <div className="flash-screen"></div>}

      <div className={`scan-page page-transition bg-${theme === 'dark' ? 'gray-900' : 'white'} text-${theme === 'dark' ? 'gray-100' : 'gray-900'}`}>
        <h1 className="app-title">SelfPay</h1>
        <p className="scan-subtitle">{t('tapToAddProduct')}</p>

        {!scanning ? (
          <div className="scan-button-container" onClick={() => setScanning(true)} role="button" tabIndex={0} aria-label={t('startScan')}>
            <div className="scan-button">
              <Barcode size={40} color="white" />
            </div>
          </div>
        ) : (
          <div className="camera-container" style={{ position: 'relative' }}>
            <video
              ref={videoRef}
              width="300"
              height="300"
              style={{ borderRadius: 8, border: '2px solid #ccc' }}
              muted
              autoPlay
              playsInline
            />
            <button onClick={handleCloseCamera} className="close-button" aria-label={t('closeCamera')}>
              <X size={18} /> {t('closeCamera')}
            </button>

            {showConfirmation && (
              <div className="confirmationOverlay" role="alertdialog" aria-modal="true" aria-live="assertive">
                <p>{t('productAdded')}</p>
                <button onClick={handleContinue} className="focus:outline-none">
                  {t('continueScanning')}
                </button>
                <button onClick={handleCloseCamera} className="focus:outline-none">
                  {t('finish')}
                </button>
              </div>
            )}
          </div>
        )}

        {message && <p className="message">{message}</p>}
        <FooterNav active="scan" />
      </div>
    </>
  );
}
