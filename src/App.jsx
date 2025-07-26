import React, { useState, useEffect } from 'react';
import Splashscreen from './components/SplashScreen';
import { Routes, Route } from 'react-router-dom';
import Scan from './pages/Scan';
import MainApp from './components/MainApp';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Splashscreen />} />
      <Route path="/scan" element={<Scan />} />
    </Routes>
  );
}

export default App;
