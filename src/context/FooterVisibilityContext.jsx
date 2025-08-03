// src/context/FooterVisibilityContext.jsx
import React, { createContext, useContext, useState } from 'react';

const FooterVisibilityContext = createContext();

export function FooterVisibilityProvider({ children }) {
  const [footerVisible, setFooterVisible] = useState(true);
  return (
    <FooterVisibilityContext.Provider value={{ footerVisible, setFooterVisible }}>
      {children}
    </FooterVisibilityContext.Provider>
  );
}

export function useFooterVisibility() {
  return useContext(FooterVisibilityContext);
}
