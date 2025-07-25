import React from "react";
import React, { useEffect, useState } from 'react';
import logo from "../assets/logo-pwa.png";
import "./SplashScreen.css";

const SplashScreen = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Déclenche l’animation quand la page est chargée
    window.addEventListener('load', () => {
      setLoaded(true);
    });

    // Sécurité si React monte après load
    if (document.readyState === 'complete') {
      setLoaded(true);
    }
  }, []);
  return (
    <div className="splash-container">
      <img src={logo} alt="Logo SelfPay" className={`logo-animated ${loaded ? 'loaded' : ''}`} />
      <div className="text-center mt-4">
  <p className="text-xs  tracking-widest" style={{ color: '#f5f5f5' }}>
    from
  </p>
  <p
    className="text-sm font-semibold uppercase bg-gradient-to-r text-transparent bg-clip-text"
    style={{
      backgroundImage: 'linear-gradient(to right, #ff3c3c, #ffc800)'
    }}
  >
    Scanera
  </p>
</div>





    </div>
    
  );
};

export default SplashScreen;
