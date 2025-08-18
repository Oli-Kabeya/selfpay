// FixedTriangles.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, ListTodo } from 'lucide-react';

export default function FixedTriangles({ onSettingsClick, onListClick, showList, floatingOpacity = 1, visible = true }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isAuthPage = currentPath === '/auth';
  const isProfilePage = currentPath === '/profile';

  if (isAuthPage || !visible) return null; // ← boutons invisibles si visible=false

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-end"
      style={{
        right: '0.5rem',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        gap: '24px',
        opacity: floatingOpacity, // ← contrôle de l'opacité
        pointerEvents: floatingOpacity === 0 ? 'none' : 'auto', // ← désactive clics si invisible
      }}
      aria-label="Icônes flottantes"
    >
      {!isProfilePage && (
        <Settings
          size={28}
          className="cursor-pointer text-[var(--color-primary)] hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick();
          }}
          role="button"
          tabIndex={0}
          aria-label="Paramètres"
        />
      )}

      {showList && (
        <ListTodo
          size={28}
          className="cursor-pointer text-[var(--color-primary)] hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            onListClick();
          }}
          role="button"
          tabIndex={0}
          aria-label={showList ? 'Ouvrir la liste' : 'Fermer la liste'}
        />
      )}
    </div>
  );
}
