import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const QRCodePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [used, setUsed] = useState(false);
  const [total, setTotal] = useState(0);
  const [date, setDate] = useState('');

  useEffect(() => {
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
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
    localStorage.removeItem('panier');
    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#121212] px-4 py-8 page-transition transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{t('qrCodeToShow')}</h2>

      {!used ? (
        <>
          <QRCode value={qrData} size={256} />
          <p className="mt-4 font-semibold text-gray-900 dark:text-gray-200">
            {t('amount')}: {total} $
          </p>
          <p className="text-gray-700 dark:text-gray-400">
            {t('date')}: {date}
          </p>
          <button
            onClick={marquerCommeUtilise}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl shadow transition-colors duration-200"
          >
            {t('markAsUsed')}
          </button>
        </>
      ) : (
        <p className="text-red-500 font-bold mt-6">{t('qrCodeUsedThanks')}</p>
      )}
    </div>
  );
};

export default QRCodePage;
