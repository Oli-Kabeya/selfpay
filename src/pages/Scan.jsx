import React from 'react';
import './Scan.css';
import logo from '../assets/logo_pwa.png';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, History, User, Settings } from 'lucide-react'; // icônes pour chaque bouton

export default function Scan() {
  const navigate = useNavigate();

  return (
    <div className="scan-page">
      <div className="scan-title">Touchez pour ajouter un produit</div>

      <div className="scan-button-container">
        <img src={logo} alt="Logo SelfPay" className="scan-button animated-fade" />
      </div>

      <div className="bottom-nav">
        <div className="nav-item">
          <i className="fas fa-shopping-cart"></i>
          <span>Panier</span>
        </div>
        <div className="nav-item">
          <i className="fas fa-clock"></i>
          <span>Historique</span>
        </div>
        <div className="nav-item">
          <i className="fas fa-cog"></i>
          <span>Parametres</span>
        </div>
        <div className="nav-item">
          <i className="fas fa-user"></i>
          <span>Profil</span>
        </div>
      </div>
    </div>
  );
};

