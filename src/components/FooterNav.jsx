// src/components/FooterNav.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, History, Settings, Camera } from 'lucide-react';
import './FooterNav.css';
import useTranslation from '../hooks/useTranslation';

export default function FooterNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  const getButtonClass = (path) => {
    return currentPath === path ? 'nav-item active-nav' : 'nav-item';
  };

  return (
    <div className="bottom-nav">
      <div className={getButtonClass('/scan')} onClick={() => navigate('/scan')}>
        <Camera size={20} />
        <span>{t('scan')}</span>
      </div>

      <div className={getButtonClass('/panier')} onClick={() => navigate('/panier')}>
        <ShoppingCart size={20} />
        <span>{t('cart')}</span>
      </div>

      <div className={getButtonClass('/historique')} onClick={() => navigate('/historique')}>
        <History size={20} />
        <span>{t('history')}</span>
      </div>

      <div className={getButtonClass('/settings')} onClick={() => navigate('/settings')}>
        <Settings size={20} />
        <span>{t('settings')}</span>
      </div>
    </div>
  );
}
