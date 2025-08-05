import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import './Profile.css';
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
        <p className="text-lg font-semibold">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="profile-container page-transition">
      <div className="profile-scroll">
        <h1 className="profile-title">{t('settings')}</h1>

        <div className="profile-card">
          <p className="profile-label">{t('phone')} :</p>
          <p className="profile-value">{phone}</p>
        </div>

        <div
          className="profile-card clickable"
          onClick={() => navigate('/paiement')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/paiement')}
        >
          <p className="profile-label">{t('paymentMethods')}</p>
          <p className="profile-link">{t('managePayments')}</p>
        </div>

        <div className="profile-card">
          <label htmlFor="theme-select" className="profile-label">{t('chooseTheme')}</label>
          <select
            id="theme-select"
            value={theme}
            onChange={handleThemeChange}
            className="profile-select"
          >
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </div>

        <div className="profile-card">
          <label htmlFor="lang-select" className="profile-label">{t('chooseLanguage')}</label>
          <select
            id="lang-select"
            value={i18n.language}
            onChange={handleLanguageChange}
            className="profile-select"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ln">Lingala</option> {/* Ajouté ici */}
          </select>
        </div>

        <button
          onClick={handleLogout}
          className="logout-btn"
        >
          {t('logout')}
        </button>
      </div>
      <FooterNav />
    </div>
  );
}
