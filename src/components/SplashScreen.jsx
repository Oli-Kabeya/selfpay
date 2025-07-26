import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
//import logo from "../assets/logo-pwa.png";
import "./SplashScreen.css";

const SplashScreen = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/Scan'); // Redirection directe après 2 secondes
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);
  return (
    <div className="splash-container">
      <img src="/icons/logo-pwa.png" alt="Logo SelfPay" className="logo-animated" />
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
  <script>document.querySelector('meta[name="theme-color"]').setAttribute('content', '#121212');
</script>
};

export default SplashScreen;
