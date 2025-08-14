import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import FooterNav from '../components/FooterNav';
import { useTranslation } from 'react-i18next';
import './Profile.css';

export default function Profile({ theme, setTheme }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setPhone(user.phoneNumber || '');
        localStorage.setItem('userPhone', user.phoneNumber || '');
      } else {
        setPhone(localStorage.getItem('userPhone') || '');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleThemeChange = (e) => setTheme(e.target.value);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center page-transition"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <p className="text-lg font-semibold">{t('loading') || 'Chargement...'}</p>
      </div>
    );
  }

  return (
    <div className="profile-container page-transition" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="profile-scroll">
        <h1 className="profile-title">{t('settings') || 'Paramètres'}</h1>

        <div className="profile-card">
          <p className="profile-label">{t('phone') || 'Téléphone'} :</p>
          <p className="profile-value">{phone || '-'}</p>
        </div>

        <div
          className="profile-card clickable"
          onClick={() => navigate('/paiement')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/paiement')}
        >
          <p className="profile-label">{t('paymentMethods') || 'Moyens de paiement'}</p>
          <p className="profile-link">{t('managePayments') || 'Gérer mes paiements'}</p>
        </div>

        <div className="profile-card">
          <label htmlFor="theme-select" className="profile-label">{t('chooseTheme') || 'Thème'}</label>
          <select
            id="theme-select"
            value={theme || 'light'}
            onChange={handleThemeChange}
            className="profile-select"
          >
            <option value="light">{t('light') || 'Clair'}</option>
            <option value="dark">{t('dark') || 'Sombre'}</option>
          </select>
        </div>

        <div className="profile-card">
          <label htmlFor="lang-select" className="profile-label">{t('chooseLanguage') || 'Langue'}</label>
          <select
            id="lang-select"
            value={i18n.language || 'fr'}
            onChange={handleLanguageChange}
            className="profile-select"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
            <option value="ln">Lingala</option>
          </select>
        </div>

        <button
          onClick={handleLogout}
          className="logout-btn"
        >
          {t('logout') || 'Déconnexion'}
        </button>
      </div>

      <FooterNav />
    </div>
  );
}
