import { useState, useEffect } from 'react';
import translations from '../locales/lang.json';

export default function useTranslation() {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'fr');

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = (key) => {
    return translations[lang][key] || key;
  };

  return { t, lang, setLang };
}
