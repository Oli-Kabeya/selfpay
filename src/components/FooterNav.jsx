import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, History, List, Camera } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';
import './FooterNav.css';
import { useFooterVisibility } from '../context/FooterVisibilityContext';

export default function FooterNav() {
  const { footerVisible } = useFooterVisibility();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  if (!footerVisible || currentPath.startsWith('/auth')) return null;

  const isActive = (path) => currentPath === path;

  const handleKeyDown = (e, path) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  const navItems = [
    { path: '/scan', icon: Camera, label: t('scan') },
    { path: '/panier', icon: ShoppingCart, label: t('cart') },
    { path: '/historique', icon: History, label: t('history') },
    { path: '/liste', icon: List, label: t('shoppingList') },
  ];

  return (
    <nav
      className="footer-nav"
      role="navigation"
      aria-label="Footer navigation"
    >
      {navItems.map(({ path, icon: Icon, label }) => {
        const active = isActive(path);
        return (
          <div
            key={path}
            onClick={() => navigate(path)}
            onKeyDown={(e) => handleKeyDown(e, path)}
            role="button"
            tabIndex={0}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            className={`nav-item ${active ? 'active-nav' : ''}`}
          >
            <Icon
              size={20}
              className={`icon ${active ? 'active-icon' : ''}`}
            />
            <span>{label}</span>
          </div>
        );
      })}
    </nav>
  );
}
