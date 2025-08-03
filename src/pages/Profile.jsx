import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import FooterNav from '../components/FooterNav';
import { useTranslation } from 'react-i18next';

export default function Profile({ theme, setTheme }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setPhone(user.phoneNumber);
        setLoading(false);
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center page-transition"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <p className="text-lg">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col justify-start items-center page-transition pb-24 px-4 max-w-md mx-auto"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <h1 className="text-2xl font-bold mt-8 mb-4">{t('settings')}</h1>

      <div className="w-full p-4 rounded-2xl shadow-md mb-4"
        style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
        <p className="text-base font-medium">{t('phone')} :</p>
        <p className="text-lg font-semibold mt-1">{phone}</p>
      </div>

      <div className="w-full p-4 rounded-2xl shadow-md mb-4"
        style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
        <label htmlFor="theme-select" className="block mb-2 font-medium">{t('chooseTheme')}</label>
        <select
          id="theme-select"
          value={theme}
          onChange={handleThemeChange}
          className="p-2 border border-gray-300 rounded w-full"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <option value="light">{t('light')}</option>
          <option value="dark">{t('dark')}</option>
        </select>
      </div>

      <div className="w-full p-4 rounded-2xl shadow-md mb-4"
        style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
        <label htmlFor="lang-select" className="block mb-2 font-medium">{t('chooseLanguage')}</label>
        <select
          id="lang-select"
          value={i18n.language}
          onChange={handleLanguageChange}
          className="p-2 border border-gray-300 rounded w-full"
          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <button
        onClick={handleLogout}
        className="mt-4 bg-orange-500 text-white px-6 py-3 rounded-2xl w-full font-bold shadow-lg hover:bg-orange-600 transition-colors duration-200"
      >
        {t('logout')}
      </button>

    </div>
  );
}
