import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { X, Barcode } from 'lucide-react';
import { loadLocalData, saveLocalData } from '../utils/offlineUtils';
import './Scan.css';

export default function Scan() {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showFlash, setShowFlash] = useState(false);
  const [showListeOverlay, setShowListeOverlay] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const swipeStartX = useRef(null);
  const db = getFirestore();

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    if (scanning) startScan();
    else stopCamera();
  }, [scanning]);

  const startScan = async () => {
    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, focusMode: 'continuous' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;

      await codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, async (result, err) => {
        if (result) {
          codeReaderRef.current.reset();
          await ajouterProduit(result.getText());
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
    if (codeReaderRef.current) {
      try { codeReaderRef.current.reset(); } catch {}
      codeReaderRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const ajouterProduit = async (code) => {
    const produit = {
      nom: `${t('product')} ${code.slice(0, 5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code
    };
    const panier = loadLocalData('panier') || [];
    const updated = [...panier, produit];
    saveLocalData('panier', updated);

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

    setShowFlash(true);
    try { navigator.vibrate?.(50); } catch {}
    setTimeout(() => setShowFlash(false), 200);

    setMessage(`${t('added')}: ${produit.nom}`);
    setScanning(false);
    stopCamera();
  };

  const handleCloseCamera = () => {
    stopCamera();
    setScanning(false);
    setMessage('');
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
      {showFlash && <div className="flash-screen" />}
      <h1 className="app-title">SelfPay</h1>
      <p className="scan-subtitle">{t('tapToAddProduct')}</p>
      {!scanning ? (
        <div className="scan-button-container" onClick={() => setScanning(true)} role="button" tabIndex={0}>
          <div className="scan-button"><Barcode size={40} /></div>
        </div>
      ) : (
        <div className="camera-container">
          <video ref={videoRef} muted autoPlay playsInline className="camera-video" />
          <button onClick={handleCloseCamera} className="camera-button camera-close">
            <X size={16} /> {t('closeCamera')}
          </button>
        </div>
      )}
      {message && <p className="message">{message}</p>}
      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
