// src/pages/Scan.jsx
import React, { useState } from 'react';
import './Scan.css';
import logo from '../assets/logo_pwa.png';
import { useNavigate } from 'react-router-dom';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';
import { auth } from '../firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import FooterNav from '../components/FooterNav';

export default function Scan() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');

  const db = getFirestore();

  const ajouterProduitAuPanier = async (codeScanne) => {
    const produit = {
      nom: `Produit ${codeScanne.substring(0, 5)}`,
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

    setMessage('Produit ajouté avec succès !');
    setScanning(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="scan-page page-transition">
      <div className="scan-title">Touchez pour ajouter un produit</div>

      <div className="scan-button-container" onClick={() => setScanning(true)}>
        <img src={logo} alt="Logo SelfPay" className="scan-button animated-fade" />
      </div>

      {message && <p className="text-sm text-green-500 text-center mt-2">{message}</p>}

      {scanning && (
        <div className="scanner-overlay">
          <BarcodeScannerComponent
            width={300}
            height={300}
            onUpdate={(err, result) => {
              if (result) {
                ajouterProduitAuPanier(result.text);
              }
            }}
          />
          <button
            onClick={() => setScanning(false)}
            className="mt-2 text-red-500 text-sm"
          >
            Annuler le scan
          </button>
        </div>
      )}

      <FooterNav />
    </div>
  );
}
