import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import { PanierProvider } from './context/PanierContext';
import { initOfflineSync } from './utils/offlineUtils';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReallyOnline, setIsReallyOnline] = useState(navigator.onLine);
  const networkCheckIntervalRef = useRef(null);

  // --- Thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- Online/offline natif
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // --- Vérification qualité réseau
  const checkNetworkQuality = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const start = performance.now();
      await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      clearTimeout(timeoutId);
      const duration = performance.now() - start;
      return duration < 3000;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const evaluateNetwork = async () => {
      if (!navigator.onLine) {
        setIsReallyOnline(false);
        return;
      }
      const good = await checkNetworkQuality();
      setIsReallyOnline(good);
    };

    evaluateNetwork();
    networkCheckIntervalRef.current = setInterval(evaluateNetwork, 10000);
    return () => clearInterval(networkCheckIntervalRef.current);
  }, []);

  // --- Auth + splash
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setInitialRoute(user ? '/scan' : '/auth');
      setShowSplash(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Init offline sync
  useEffect(() => {
    initOfflineSync();
  }, []);

  if (showSplash) return <SplashScreen />;
  if (initialRoute === null) return <div>Chargement...</div>;

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <FooterVisibilityProvider>
          <PanierProvider>
            <AppContent
              initialRoute={initialRoute}
              theme={theme}
              setTheme={setTheme}
              isOnline={isReallyOnline}
            />
          </PanierProvider>
        </FooterVisibilityProvider>
      </Router>
    </I18nextProvider>
  );
}

function AppContent({ initialRoute, theme, setTheme, isOnline }) {
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
          <Route path="/scan" element={<PrivateRoute><Scan isOnline={isOnline} /></PrivateRoute>} />
          <Route path="/historique" element={<PrivateRoute><Historique /></PrivateRoute>} />
          <Route path="/panier" element={<PrivateRoute><Panier isOnline={isOnline} /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile theme={theme} setTheme={setTheme} /></PrivateRoute>} />
          <Route path="/liste" element={<PrivateRoute><Liste /></PrivateRoute>} />
          <Route path="/paiement" element={<PrivateRoute><Paiement /></PrivateRoute>} />
          <Route path="*" element={<Navigate to={initialRoute} replace />} />
        </Routes>

        {showListeOverlay && <ListeOverlay onClose={() => setShowListeOverlay(false)} />}
      </div>

      {!currentPath.startsWith('/auth') && <FooterNav />}
    </>
  );
}
