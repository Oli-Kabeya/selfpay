import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import ListeOverlay from '../components/ListeOverlay';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import './Panier.css';

export default function Panier({ showListeOverlay, setShowListeOverlay }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
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
        } else {
          setPanier([]);
        }
      } else {
        setPanier([]);
      }
      setLoading(false);
    };
    chargerPanier();
  }, [db]);

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  // Scanner pour supprimer un produit
  useEffect(() => {
    if (!showCamera) return;

    const codeReader = new BrowserMultiFormatReader();
    let selectedDeviceId = null;

    codeReader
      .listVideoInputDevices()
      .then((videoInputDevices) => {
        selectedDeviceId = videoInputDevices[0]?.deviceId;
        return codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, async (result) => {
          if (result) {
            const code = result.getText();
            await handleRemoveScan(code);
            codeReader.reset();
          }
        });
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      codeReader.reset();
    };
  }, [showCamera]);

  const handleRemoveScan = async (scannedCode) => {
    const updatedPanier = panier.filter(item => item.code !== scannedCode);
    setPanier(updatedPanier);

    // Mise à jour localStorage
    localStorage.setItem('panier', JSON.stringify(updatedPanier));

    // Mise à jour Firestore
    const user = auth.currentUser;
    if (user) {
      const panierRef = doc(db, 'paniers', user.uid);
      await setDoc(panierRef, { articles: updatedPanier }, { merge: true });
    }

    setShowCamera(false);
  };

  return (
    <div className="panier-page relative">
      <div className="panier-content scrollable-content">
        <h1 className="total-header">
          {t('total')}: {total.toFixed(2)} $
        </h1>

        {loading ? (
          <p className="loading-text">{t('loadingCart')}</p>
        ) : panier.length === 0 ? (
          <p className="empty-text">{t('cartEmptyMessage')}</p>
        ) : (
          <ul className="product-list">
            {panier.map((item, idx) => (
              <li key={idx} className="product-item">
                <div className="item-name">{item.nom}</div>
                <div className="item-price">{item.prix.toFixed(2)} $</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CameraView pour suppression */}
      {showCamera && (
        <div className="camera-overlay">
          <video ref={videoRef} className="camera-video" />
          <button
            className="close-camera-btn"
            onClick={() => setShowCamera(false)}
          >
            ✕ {t('closeCamera')}
          </button>
        </div>
      )}

      {/* Deux boutons côte à côte */}
      <div className="floating-button-row">
        <button
          className="button-base scan-btn"
          onClick={() => setShowCamera(true)}
        >
          {t('removeScan')}
        </button>

        {panier.length > 0 && (
          <button
            className="button-base validate-btn"
            onClick={() => navigate('/paiement')}
          >
            {t('validatePurchase')}
          </button>
        )}
      </div>

      {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
    </div>
  );
}
