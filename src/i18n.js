import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ln from './locales/lingala.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  ln: { translation: ln },
};

const savedLang = localStorage.getItem('language') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
