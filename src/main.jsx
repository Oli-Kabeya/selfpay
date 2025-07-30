import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // ✅ Essentiel pour le style
import { registerSW } from 'virtual:pwa-register';
registerSW();


// ✅ Enregistrement propre du Service Worker avec Vite PWA
// Utilise vite-plugin-pwa, évite les erreurs de chemin

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
