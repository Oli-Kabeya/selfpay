import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Scan from './pages/Scan';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Historique from './pages/Historique';
import Panier from './pages/Panier';
import Liste from './pages/Liste';
import Paiement from './pages/Paiement';
import PrivateRoute from './components/PrivateRoute';
import FooterNav from './components/FooterNav';
import { auth } from './firebase';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import FixedTriangles from './components/FixedTriangles';
import ListeOverlay from './components/ListeOverlay';
import { FooterVisibilityProvider } from './context/FooterVisibilityContext';

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
        <FooterVisibilityProvider>
          <AppContent initialRoute={initialRoute} theme={theme} setTheme={setTheme} />
        </FooterVisibilityProvider>
      </Router>
    </I18nextProvider>
  );
}

// AppContent avec gestion globale du showListeOverlay
import { useLocation, useNavigate } from 'react-router-dom';
function AppContent({ initialRoute, theme, setTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const showListIcon = currentPath === '/scan' || currentPath === '/panier';
  const [showListeOverlay, setShowListeOverlay] = useState(false);

  return (
    <>
      <FixedTriangles
        onSettingsClick={() => navigate('/profile')}
        onListClick={() => setShowListeOverlay(true)}
        showList={showListIcon}
        showOverlay={false}
      />

      <div className="relative max-w-md mx-auto min-h-screen">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
          <Route path="/historique" element={<PrivateRoute><Historique /></PrivateRoute>} />
          <Route path="/panier" element={<PrivateRoute><Panier /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile theme={theme} setTheme={setTheme} /></PrivateRoute>} />
          <Route path="/liste" element={<PrivateRoute><Liste /></PrivateRoute>} />
          <Route path="/paiement" element={<PrivateRoute><Paiement /></PrivateRoute>} />
          <Route path="*" element={<Navigate to={initialRoute} replace />} />
        </Routes>

        {/* ListeOverlay rendu globalement ici */}
        {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
      </div>

      {!currentPath.startsWith('/auth') && <FooterNav />}
    </>
  );
}
