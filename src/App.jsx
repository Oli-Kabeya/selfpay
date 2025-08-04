import React, { useState, useEffect, useRef } from 'react';
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
import FixedTriangles from './components/FixedTriangles';
import ListeOverlay from './components/ListeOverlay';
import { FooterVisibilityProvider } from './context/FooterVisibilityContext';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [showListeOverlay, setShowListeOverlay] = useState(false);

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
          <AppContent
            initialRoute={initialRoute}
            theme={theme}
            setTheme={setTheme}
            showListeOverlay={showListeOverlay}
            setShowListeOverlay={setShowListeOverlay}
          />
        </FooterVisibilityProvider>
      </Router>
    </I18nextProvider>
  );
}

function AppContent({ initialRoute, theme, setTheme, showListeOverlay, setShowListeOverlay }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const handleToggleListeOverlay = () => {
    setShowListeOverlay((prev) => !prev);
  };

  const swipeStartX = useRef(null);

  useEffect(() => {
    const handleTouchStart = (e) => {
      swipeStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      const swipeEndX = e.changedTouches[0].clientX;
      const deltaX = swipeEndX - swipeStartX.current;

      if (!showListeOverlay && deltaX < -50) {
        setShowListeOverlay(true);
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showListeOverlay]);

  return (
    <>
      <FixedTriangles
        onSettingsClick={() => navigate('/profile')}
        onListClick={handleToggleListeOverlay}
        showList={currentPath === '/scan' || currentPath === '/panier'}
        showOverlay={showListeOverlay}
      />

      <div className="relative max-w-md mx-auto min-h-screen">
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/scan" element={<PrivateRoute><Scan showListeOverlay={showListeOverlay} setShowListeOverlay={setShowListeOverlay} /></PrivateRoute>} />
          <Route path="/historique" element={<PrivateRoute><Historique /></PrivateRoute>} />
          <Route path="/panier" element={<PrivateRoute><Panier showListeOverlay={showListeOverlay} setShowListeOverlay={setShowListeOverlay} /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile theme={theme} setTheme={setTheme} /></PrivateRoute>} />
          <Route path="/liste" element={<PrivateRoute><Liste /></PrivateRoute>} />
          <Route path="*" element={<Navigate to={initialRoute} replace />} />
        </Routes>
      </div>

      {!currentPath.startsWith('/auth') && <FooterNav />}

      {showListeOverlay && (
        <ListeOverlay onClose={() => setShowListeOverlay(false)} />
      )}
    </>
  );
}
