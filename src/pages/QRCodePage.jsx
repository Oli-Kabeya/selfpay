// src/pages/QRCodePage.jsx
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './QRCodePage.css';
import { KEYS, loadLocal, saveLocal } from '../utils/offlineUtils';

const QRCodePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [used, setUsed] = useState(false);
  const [total, setTotal] = useState(0);
  const [date, setDate] = useState('');

  useEffect(() => {
    const panier = loadLocal(KEYS.panier); // panier local
    const totalCalcule = panier.reduce((sum, item) => sum + (item.prix || 0), 0);
    setTotal(totalCalcule);
    setDate(new Date().toLocaleString());
  }, []);

  const qrData = JSON.stringify({
    id,
    montant: total,
    date,
    used,
  });

  const marquerCommeUtilise = () => {
    setUsed(true);
    // vider le panier local après utilisation du QR code
    saveLocal(KEYS.panier, []);
    saveLocal(KEYS.pending.panier, []); // vider aussi la file pending si existante

    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  return (
    <div className="qr-page">
      <div className="qr-header">{t('qrCodeToShow')}</div>

      {!used ? (
        <>
          <div className="qr-container">
            <QRCode value={qrData} size={220} />
            <p className="qr-total">{t('amount')}: {total} $</p>
            <p className="qr-date">{t('date')}: {date}</p>
          </div>

          <button
            onClick={marquerCommeUtilise}
            className="qr-button"
          >
            {t('markAsUsed')}
          </button>
        </>
      ) : (
        <p className="qr-used-message">{t('qrCodeUsedThanks')}</p>
      )}
    </div>
  );
};

export default QRCodePage;
