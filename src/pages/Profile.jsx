import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import FooterNav from '../components/FooterNav';
import useTranslation from '../hooks/useTranslation';

export default function Profile({ theme, setTheme }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const { t, lang, setLang } = useTranslation();
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

  const toggleTheme = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
  };

  const toggleLang = (e) => {
    setLang(e.target.value);
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-background transition-colors duration-300">
        <p className="text-lg text-primary">{t('loading') || 'Chargement...'}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col justify-start items-center bg-background text-primary transition-all duration-300 page-transition pb-24 px-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mt-8 mb-4">{t('settings')}</h1>

      <div className="bg-card w-full p-4 rounded-2xl shadow-md mb-4">
        <p className="text-base font-medium">{t('phone')} :</p>
        <p className="text-lg font-semibold mt-1">{phone}</p>
      </div>

      <div className="bg-card w-full p-4 rounded-2xl shadow-md mb-4">
        <label htmlFor="theme-select" className="block mb-2 font-medium">
          {t('chooseTheme')}
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={toggleTheme}
          className="p-2 border border-gray-300 rounded w-full bg-background text-primary"
        >
          <option value="light">{t('light') || 'Clair'}</option>
          <option value="dark">{t('dark') || 'Sombre'}</option>
        </select>
      </div>

      <div className="bg-card w-full p-4 rounded-2xl shadow-md mb-4">
        <label htmlFor="lang-select" className="block mb-2 font-medium">
          {t('chooseLanguage')}
        </label>
        <select
          id="lang-select"
          value={lang}
          onChange={toggleLang}
          className="p-2 border border-gray-300 rounded w-full bg-background text-primary"
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

      <FooterNav noScanButton />
    </div>
  );
}
