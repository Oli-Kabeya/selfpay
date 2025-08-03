import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, History, List, Camera } from 'lucide-react';
import useTranslation from '../hooks/useTranslation';
import './FooterNav.css';
import { useFooterVisibility } from '../context/FooterVisibilityContext'; // ✅ ajouté

export default function FooterNav() {
  const { footerVisible } = useFooterVisibility(); // ✅ contrôle d’affichage
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { t } = useTranslation();

  if (!footerVisible) return null; // ✅ Footer masqué si false

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
      className="fixed bottom-0 left-0 w-screen max-w-full overflow-hidden flex justify-around items-center py-2 border-t border-gray-300 dark:border-gray-700 z-50 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
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
            className={`flex flex-col items-center text-xs cursor-pointer transition-transform duration-200 px-3 py-1 rounded-xl ${
              active ? 'text-orange-500 drop-shadow-[0_0_6px_rgba(255,136,0,0.8)]' : ''
            } hover:scale-105`}
          >
            <Icon
              size={20}
              className={`mb-1 transition-colors duration-300 ${
                active ? 'stroke-orange-500 drop-shadow-[0_0_4px_rgba(255,136,0,0.8)]' : 'stroke-[var(--color-text)]'
              }`}
            />
            <span>{label}</span>
          </div>
        );
      })}
    </nav>
  );
}
