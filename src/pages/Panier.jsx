import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';
import { useTranslation } from 'react-i18next';
import FooterNav from '../components/FooterNav';

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

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-white dark:bg-[#121212]">
        <p className="text-lg text-gray-800 dark:text-white">{t('loadingCart')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] p-4 pb-20 page-transition">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">
        {t('myCart')}
      </h2>

      {panier.length === 0 ? (
        <p className="text-center text-gray-800 dark:text-gray-200">{t('cartEmpty')}</p>
      ) : (
        <>
          <ul className="mb-6">
            {panier.map((item, index) => (
              <li key={index} className="mb-3 border-b border-gray-300 dark:border-gray-600 pb-2 text-gray-900 dark:text-gray-100">
                {item.nom} – {item.prix} $
              </li>
            ))}
          </ul>

          <p className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100 text-center">
            {t('total')}: {total} $
          </p>

          <button
            onClick={allerAuPaiement}
            className="w-full p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#FF5E3A] to-[#FFBA00] shadow hover:opacity-90 mb-4"
          >
            {t('validatePurchase')}
          </button>
        </>
      )}

      <button
        onClick={() => setScanning(true)}
        className="w-full p-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:opacity-90"
      >
        {t('scanToDelete')}
      </button>

      {message && <p className="mt-4 text-center text-blue-500 text-sm">{message}</p>}

      {scanning && (
        <div className="mt-6 flex flex-col items-center">
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
            className="mt-4 text-red-500 text-sm font-medium"
          >
            {t('cancelScan')}
          </button>
        </div>
      )}

      <FooterNav />
    </div>
  );
};

export default Panier;
