import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n'; 
import './index.css'; // ✅ Essentiel pour le style

// ✅ Réactivation du Service Worker pour la PWA
import { registerSW } from 'virtual:pwa-register';
registerSW();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
