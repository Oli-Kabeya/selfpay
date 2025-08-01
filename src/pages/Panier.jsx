import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';
import { useTranslation } from 'react-i18next';

const Panier = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [panier, setPanier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');

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

  const supprimerProduitParScan = async (codeScanne) => {
    const produitIndex = panier.findIndex(item => item.code === codeScanne);
    if (produitIndex !== -1) {
      const nouveauPanier = panier.filter((_, i) => i !== produitIndex);
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

    setScanning(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const total = panier.reduce((sum, item) => sum + (item.prix || 0), 0);

  const allerAuPaiement = () => {
    navigate('/paiement');
  };

  if (loading) return <div>{t('loadingCart')}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t('myCart')}</h2>

      {panier.length === 0 ? (
        <p>{t('cartEmpty')}</p>
      ) : (
        <>
          <ul className="mb-4">
            {panier.map((item, index) => (
              <li key={index} className="mb-2 border-b pb-1">
                {item.nom} – {item.prix} $
              </li>
            ))}
          </ul>
          <p className="font-bold mb-4">{t('total')}: {total} $</p>
          <button
            onClick={allerAuPaiement}
            className="bg-green-600 text-white px-4 py-2 rounded mb-4"
          >
            {t('validatePurchase')}
          </button>
        </>
      )}

      <button
        onClick={() => setScanning(true)}
        className="bg-yellow-500 text-white px-4 py-2 rounded"
      >
        {t('scanToDelete')}
      </button>

      {message && <p className="mt-2 text-sm text-blue-500">{message}</p>}

      {scanning && (
        <div className="mt-4">
          <BarcodeScannerComponent
            width={300}
            height={300}
            onUpdate={(err, result) => {
              if (result) {
                supprimerProduitParScan(result.text);
              }
            }}
          />
          <button
            onClick={() => setScanning(false)}
            className="mt-2 text-red-500 text-sm"
          >
            {t('cancelScan')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Panier;
