import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import Scan from './pages/Scan';
import Auth from './pages/Auth';
import PrivateRoute from './components/PrivateRoute';
import { auth } from './firebase';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

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
        <Route
          path="/scan"
          element={
            <PrivateRoute>
              <Scan />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to={initialRoute} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
