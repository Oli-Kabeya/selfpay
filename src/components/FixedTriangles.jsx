import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, ListTodo } from 'lucide-react';

export default function FixedTriangles({ onSettingsClick, onListClick, showList, showOverlay }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isAuthPage = currentPath === '/auth';
  const isProfilePage = currentPath === '/profile';

  if (isAuthPage) return null;

  const rightPosition = showOverlay ? '18rem' : '0.5rem';

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-end"
      style={{
        right: rightPosition,
        transition: 'right 0.3s ease',
        gap: '24px',
      }}
      aria-label="Icônes flottantes"
    >
      {!isProfilePage && !showOverlay && (
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
          aria-label={showOverlay ? 'Fermer la liste' : 'Ouvrir la liste'}
        />
      )}
    </div>
  );
}
