import * as React from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-container">
      <img
        src="/icons/logos-pwa.png"
        alt="Logo SelfPay"
        className="logo-animated"
      />
      <p className="slogan-text">scannez. payez. partez.</p>

      <div className="text-center mt-4">
        <p className="text-xs tracking-widest from-text">from</p>
        <p className="text-sm font-semibold uppercase bg-gradient-to-r text-transparent bg-clip-text scanera-text">
          Scanera
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
