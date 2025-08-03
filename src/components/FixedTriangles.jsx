import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, ListTodo } from 'lucide-react';

export default function FixedTriangles({ onSettingsClick, onListClick, showList, showOverlay }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isAuthPage = currentPath === '/auth';
  const isProfilePage = currentPath === '/profile';

  if (isAuthPage) return null;

  // Décalage horizontal lorsque l'overlay est ouvert (70% largeur + marge)
  const rightPosition = showOverlay ? '18rem' : '1rem';

  return (
    <div
      className="fixed top-1/2 transform -translate-y-1/2 z-[1000] flex flex-col gap-4 pr-0"
      style={{ right: rightPosition, transition: 'right 0.3s ease' }}
      aria-label="Boutons flottants"
    >
      {/* Bouton Paramètres - masqué si overlay ouvert */}
      {!isProfilePage && !showOverlay && (
        <button
          onClick={onSettingsClick}
          aria-label="Ouvrir les paramètres"
          className="
            p-2 rounded-xl
            bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500
            text-white shadow-lg
            hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-orange-400
            drop-shadow-[0_0_8px_rgba(255,136,0,0.7)]
            backdrop-blur-sm bg-opacity-80 transition-transform active:scale-95
          "
          type="button"
        >
          <Settings size={20} />
        </button>
      )}

      {/* Bouton Liste - toggle, affiché seulement sur scan et panier */}
      {showList && (
        <button
          onClick={onListClick}
          aria-label={showOverlay ? "Fermer la liste de courses" : "Ouvrir la liste de courses"}
          className="
            p-2 rounded-xl
            bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500
            text-white shadow-lg
            hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-orange-400
            drop-shadow-[0_0_8px_rgba(255,136,0,0.7)]
            backdrop-blur-sm bg-opacity-80 transition-transform active:scale-95
          "
          type="button"
        >
          <ListTodo size={20} />
        </button>
      )}
    </div>
  );
}
