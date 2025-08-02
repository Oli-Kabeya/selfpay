import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, History, List, Camera } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';

export default function FooterNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  const isActive = (path) => currentPath === path;

  const handleKeyDown = (e, path) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  const navItems = [
    { path: '/scan', icon: <Camera size={20} />, label: t('scan') },
    { path: '/panier', icon: <ShoppingCart size={20} />, label: t('cart') },
    { path: '/historique', icon: <History size={20} />, label: t('history') },
    { path: '/liste', icon: <List size={20} />, label: t('shoppingList') },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full flex justify-around items-center py-2 border-t z-50 bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300"
      role="navigation"
      aria-label="Footer navigation"
    >
      {navItems.map(({ path, icon, label }) => (
        <div
          key={path}
          onClick={() => navigate(path)}
          onKeyDown={(e) => handleKeyDown(e, path)}
          role="button"
          tabIndex={0}
          aria-current={isActive(path) ? 'page' : undefined}
          aria-label={label}
          className={`flex flex-col items-center text-xs cursor-pointer transition-transform duration-200 px-3 py-1 rounded-xl ${
            isActive(path) ? 'text-[var(--nav-active-color)]' : ''
          } hover:scale-105`}
        >
          <div
            className={`mb-1 transition-colors duration-300 ${
              isActive(path) ? 'stroke-[var(--nav-active-color)]' : 'stroke-[var(--color-text)]'
            }`}
          >
            {icon}
          </div>
          <span>{label}</span>
        </div>
      ))}
    </nav>
  );
}
