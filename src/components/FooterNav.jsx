// src/components/FooterNav.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, History, User, PlusCircle } from 'lucide-react';
import './FooterNav.css'; // styles séparés ou réutiliser Scan.css

export default function FooterNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const getButtonClass = (path) => {
    return currentPath === path ? 'nav-item active-nav' : 'nav-item';
  };

  return (
    <div className="bottom-nav">
      <div className={getButtonClass('/panier')} onClick={() => navigate('/panier')}>
        <ShoppingCart size={20} />
        <span>Panier</span>
      </div>
      <div className={getButtonClass('/historique')} onClick={() => navigate('/historique')}>
        <History size={20} />
        <span>Historique</span>
      </div>
      <div className={getButtonClass('/scan')} onClick={() => navigate('/scan')}>
        <PlusCircle size={20} />
        <span>Ajouter</span>
      </div>
      <div className={getButtonClass('/profil')} onClick={() => navigate('/profil')}>
        <User size={20} />
        <span>Profil</span>
      </div>
    </div>
  );
}
