import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import SplashScreen from './components/SplashScreen';
import Scan from './pages/Scan';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Historique from './pages/Historique';
import Panier from './pages/Panier';
import Liste from './pages/Liste';
import PrivateRoute from './components/PrivateRoute';
import FooterNav from './components/FooterNav';
import { auth } from './firebase';

import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import FixedTriangles from './components/FixedTriangles'; // Triangle flottant

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      auth.onAuthStateChanged((user) => {
        setInitialRoute(user ? '/scan' : '/auth');
        setShowSplash(false);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen />;
  if (initialRoute === null) return <div>Chargement...</div>;

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <AppContent initialRoute={initialRoute} theme={theme} setTheme={setTheme} />
      </Router>
    </I18nextProvider>
  );
}

// Ce composant est sous <Router> donc ici, on peut utiliser useNavigate
function AppContent({ initialRoute, theme, setTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <>
      {/* Triangles fixes */}
      <FixedTriangles
        onSettingsClick={() => navigate('/profile')}
        onListClick={() => navigate('/liste')}
        showList={currentPath === '/scan' || currentPath === '/panier'}
      />

      {/* Routes principales */}
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
        <Route path="/historique" element={<PrivateRoute><Historique /></PrivateRoute>} />
        <Route path="/panier" element={<PrivateRoute><Panier /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile theme={theme} setTheme={setTheme} /></PrivateRoute>} />
        <Route path="/liste" element={<PrivateRoute><Liste /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={initialRoute} replace />} />
      </Routes>

      {/* Footer sauf sur la page Auth */}
      {currentPath !== '/auth' && <FooterNav />}
    </>
  );
}
