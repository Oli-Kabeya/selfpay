import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import FooterNav from '../components/FooterNav';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import './Scan.css';

export default function Scan() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const db = getFirestore();

  useEffect(() => {
    // Nettoyage caméra à la sortie du composant
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (scanning) {
      startScan();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const startScan = async () => {
    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const result = await codeReaderRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current);
      ajouterProduit(result.getText());
    } catch (error) {
      console.error('Erreur scan:', error);
      setMessage(t('scanError'));
      setTimeout(() => setMessage(''), 2000);
      handleCloseCamera();
    }
  };

  const stopCamera = () => {
    console.log("Arrêt caméra demandé");
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
        console.log("CodeReader reset");
      }
    } catch (e) {
      console.warn("Erreur lors du reset du codeReader", e);
    }

    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject;
      if (stream.getTracks) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn("Erreur lors de l'arrêt d'une piste vidéo", e);
          }
        });
      }
      video.srcObject = null;
      console.log("Flux vidéo stoppé et détaché");
    }
  };

  const ajouterProduit = async (code) => {
    const produit = { nom: `${t('product')} ${code.slice(0, 5)}`, prix: Math.floor(Math.random() * 10) + 1, code };
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    localStorage.setItem('panier', JSON.stringify([...panier, produit]));

    const user = auth.currentUser;
    if (user) {
      const ref = doc(db, 'paniers', user.uid);
      const snap = await getDoc(ref);
      const anciens = snap.exists() ? snap.data().articles || [] : [];
      await setDoc(ref, { articles: [...anciens, produit] });
    }

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 200);
    setMessage(`${t('added')}: ${produit.nom}`);
    setShowButtons(true);
    setScanning(false); // on arrête le scan pour montrer les boutons
  };

  const handleScanAgain = () => {
    setMessage('');
    setShowButtons(false);
    setScanning(true);
  };

  const handleCloseCamera = () => {
    console.log("Fermeture caméra demandée");
    stopCamera();
    setScanning(false);
    setShowButtons(false);
    setMessage('');
  };

  return (
    <>
      {showFlash && <div className="flash-screen"></div>}
      <div className="scan-page">
        <h1 className="app-title">SelfPay</h1>
        <p className="scan-subtitle">{t('tapToAddProduct')}</p>

        {!scanning ? (
          <div className="scan-button-container" onClick={() => setScanning(true)}>
            <div className="scan-button"><Barcode size={40} color="white" /></div>
          </div>
        ) : (
          <div className="camera-container relative">
            <video
              ref={videoRef}
              width="300"
              height="300"
              muted
              autoPlay
              playsInline
              className="camera-video"
            />
            <button
              onClick={handleCloseCamera}
              className="absolute top-2 right-2 camera-button camera-close z-10"
              aria-label="Close camera"
            >
              <X size={16} /> {t('closeCamera')}
            </button>
            {showButtons && (
              <div className="absolute bottom-4 flex flex-col gap-2 items-center w-full z-10">
                <button
                  onClick={handleScanAgain}
                  className="camera-button camera-continue w-10/12"
                >
                  {t('continueScanning')}
                </button>
                <button
                  onClick={handleCloseCamera}
                  className="camera-button camera-finish w-10/12"
                >
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
