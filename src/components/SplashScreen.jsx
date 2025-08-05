import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Récupère le thème actuel dans le html[data-theme]
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);

    // Event listener si tu changes le thème ailleurs dynamiquement
    const observer = new MutationObserver(() => {
      const updatedTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(updatedTheme);
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`splash-container splash-container--${theme}`}>
      <img
        src="/icons/logos-pwa.png"
        alt="Logo SelfPay"
        className="logo-animated"
      />
      <p className="slogan-text">scannez. payez. partez.</p>

      <div className="text-center mt-4">
        <p className="text-xs tracking-widest from-text">from</p>
        <p className="scanera-texts">
          Scanera
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
