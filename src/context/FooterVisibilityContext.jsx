import { createContext, useContext } from 'react';

// Faux contexte qui ne fait rien, car plus utilisé
const FooterVisibilityContext = createContext();

export function FooterVisibilityProvider({ children }) {
  return (
    <FooterVisibilityContext.Provider value={{ footerVisible: true, setFooterVisible: () => {} }}>
      {children}
    </FooterVisibilityContext.Provider>
  );
}

export function useFooterVisibility() {
  return useContext(FooterVisibilityContext);
}
