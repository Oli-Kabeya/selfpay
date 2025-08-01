import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const QRCodePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [used, setUsed] = useState(false);

  const total = JSON.parse(localStorage.getItem('panier') || '[]')
    .reduce((sum, item) => sum + (item.prix || 0), 0);
  const date = new Date().toLocaleString();

  const qrData = JSON.stringify({
    id,
    montant: total,
    date,
    used,
  });

  const marquerCommeUtilise = () => {
    setUsed(true);
    localStorage.removeItem('panier');
    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">{t('qrCodeToShow')}</h2>

      {!used ? (
        <>
          <QRCode value={qrData} size={256} />
          <p className="mt-4 font-semibold">
            {t('amount')}: {total} $
          </p>
          <p>
            {t('date')}: {date}
          </p>
          <button
            onClick={marquerCommeUtilise}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
          >
            {t('markAsUsed')}
          </button>
        </>
      ) : (
        <p className="text-red-500 font-bold mt-4">{t('qrCodeUsedThanks')}</p>
      )}
    </div>
  );
};

export default QRCodePage;
