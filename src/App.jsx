import React, { useState, useEffect } from 'react';
import Splashscreen from './components/SplashScreen';
import MainApp from './components/MainApp';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // 3 secondes

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-black min-h-screen">
      {showSplash ? <Splashscreen /> : <MainApp />}
    </div>
  );
}

export default App;
