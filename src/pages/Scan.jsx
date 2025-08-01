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
  const readerRef = useRef(null);
  const db = getFirestore();

  useEffect(() => stopCamera, []);

  useEffect(() => {
    if (scanning) startScan();
    return () => stopCamera();
  }, [scanning]);

  const startScan = async () => {
    readerRef.current = new BrowserMultiFormatReader();
    try {
      const result = await readerRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current);
      ajouterProduit(result.getText());
    } catch {
      setMessage(t('scanError'));
      setTimeout(() => setMessage(''), 2000);
      handleClose();
    }
  };

  const stopCamera = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const ajouterProduit = async (code) => {
    const produit = { nom: `${t('product')} ${code.slice(0,5)}`, prix: Math.floor(Math.random()*10)+1, code };
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
  };

  const handleScanAgain = () => {
    stopCamera();
    setMessage('');
    setShowButtons(false);
    setTimeout(() => setScanning(true), 200);
  };

  const handleClose = () => {
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
          <div className="camera-container">
            <video ref={videoRef} width="300" height="300" muted autoPlay playsInline />
            <button onClick={handleClose} className="close-button"><X size={16}/> {t('closeCamera')}</button>
            {showButtons && (
              <div className="btn-container">
                <button onClick={handleScanAgain} className="btn">{t('continueScanning')}</button>
                <button onClick={handleClose} className="btn finish">{t('finish')}</button>
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
