import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Scan from './pages/Scan';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Historique from './pages/Historique';
import Panier from './pages/Panier';
import PrivateRoute from './components/PrivateRoute';
import { auth } from './firebase';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  // Applique le thème en modifiant data-theme (et non plus la classe dark)
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
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile theme={theme} setTheme={setTheme} /></PrivateRoute>} />
        <Route path="/historique" element={<PrivateRoute><Historique /></PrivateRoute>} />
        <Route path="/panier" element={<PrivateRoute><Panier /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={initialRoute} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
