import React from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, ListTodo } from 'lucide-react';

export default function FixedTriangles({ onSettingsClick, onListClick, showList }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  if (isAuthPage) return null; // Ne rien afficher sur la page Auth

  return (
    <>
      {/* Triangle Paramètres - milieu droit */}
      <button
        onClick={onSettingsClick}
        aria-label="Ouvrir les paramètres"
        className="fixed top-1/2 right-0 transform -translate-y-1/2 rotate-90 bg-orange-500 p-2 rounded-l-xl shadow-lg z-50 hover:bg-orange-600 transition"
      >
        <Settings size={20} color="white" />
      </button>

      {/* Triangle Liste - 13% plus bas */}
      {showList && (
        <button
          onClick={onListClick}
          aria-label="Ouvrir la liste de courses"
          className="fixed top-[58%] right-0 transform -translate-y-1/2 rotate-90 bg-orange-500 p-2 rounded-l-xl shadow-lg z-50 hover:bg-orange-600 transition"
        >
          <ListTodo size={20} color="white" />
        </button>
      )}
    </>
  );
}
