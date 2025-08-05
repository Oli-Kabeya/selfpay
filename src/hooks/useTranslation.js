import { useState, useEffect } from 'react';
import translations from '../locales/lang.json';

export default function useTranslation() {
  const getStoredLang = () => localStorage.getItem('language') || 'fr';
  const [lang, setLang] = useState(getStoredLang());

  // Mettre à jour la langue dans localStorage et dans le state
  const changeLanguage = (newLang) => {
    localStorage.setItem('language', newLang);
    setLang(newLang);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedLang = getStoredLang();
      if (updatedLang !== lang) {
        setLang(updatedLang);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || key;
  };

  return { t, lang, changeLanguage };
}
