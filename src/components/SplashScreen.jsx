import React from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-container">
      <img src="/icons/logo-pwa.png" alt="Logo SelfPay" className="logo-animated" />
      <div className="text-center mt-4">
        <p className="text-xs tracking-widest" style={{ color: '#f5f5f5' }}>from</p>
        <p className="text-sm font-semibold uppercase bg-gradient-to-r text-transparent bg-clip-text"
          style={{ backgroundImage: 'linear-gradient(to right, #ff3c3c, #ffc800)' }}>
          Scanera
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
