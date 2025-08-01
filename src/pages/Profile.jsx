import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import FooterNav from '../components/FooterNav';
import useTranslation from '../hooks/useTranslation';

export default function Profile() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setPhone(user.phoneNumber);
        setLoading(false);
      } else {
        navigate('/'); // Rediriger vers Auth si non connecté
      }
    });

    // Charger thème depuis localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const toggleTheme = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleLang = (e) => {
    setLang(e.target.value);
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-100">
        <p className="text-lg">{t('loading') || 'Chargement...'}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100 page-transition pb-20 px-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">{t('profile')}</h1>
      <p className="text-lg mb-6">
        {t('phone')} : {phone}
      </p>

      <div className="mb-6 w-full">
        <label htmlFor="theme-select" className="block mb-2 font-semibold">
          {t('chooseTheme')}
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={toggleTheme}
          className="p-2 border rounded w-full"
        >
          <option value="light">Clair</option>
          <option value="dark">Sombre</option>
        </select>
      </div>

      <div className="mb-6 w-full">
        <label htmlFor="lang-select" className="block mb-2 font-semibold">
          {t('chooseLanguage')}
        </label>
        <select
          id="lang-select"
          value={lang}
          onChange={toggleLang}
          className="p-2 border rounded w-full"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <button
        onClick={handleLogout}
        className="mt-6 bg-gray-800 text-white px-4 py-2 rounded w-full"
      >
        {t('logout')}
      </button>

      <FooterNav />
    </div>
  );
}
