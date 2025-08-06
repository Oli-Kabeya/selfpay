import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const [localNumber, setLocalNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => console.log('reCAPTCHA résolu'),
      });
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');

    if (!localNumber.match(/^0\d{8}$/)) {
      setError(t('invalidPhone') || 'Numéro incorrect. Exemple : 0812345678');
      return;
    }
    if (!isOnline) {
      setError(t('noConnection') || 'Connexion internet requise.');
      return;
    }

    try {
      setLoading(true);
      setupRecaptcha();
      const formattedNumber = '+243' + localNumber.trim().replace(/^0/, '');
      const result = await signInWithPhoneNumber(auth, formattedNumber, window.recaptchaVerifier);
      setConfirmationResult(result);
    } catch (err) {
      setError(t('sendCodeError') || "Erreur lors de l'envoi du code.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!isOnline) {
      setError(t('noConnection') || 'Connexion requise pour valider le code.');
      return;
    }
    try {
      setLoading(true);
      await confirmationResult.confirm(otp);
      alert(t('loginSuccess') || 'Connexion réussie ✅');
      navigate('/scan');
    } catch (err) {
      setError(t('wrongCode') || 'Code incorrect. Réessaie.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white dark:bg-[#121212] px-4 page-transition">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-[#F5F5F5] mb-8">SelfPay</h1>

      {!isOnline && (
        <div className="text-center mb-4 text-red-600 dark:text-red-400 text-sm font-medium">
          {t('offlineWarning') || 'Pas de connexion internet. Connexion impossible.'}
        </div>
      )}

      <form onSubmit={confirmationResult ? handleVerifyOtp : handleSendCode} className="space-y-4 w-full max-w-sm">
        {/* CHAMP TELEPHONE AVEC +243 FIXE */}
        <div className="relative w-full">
          <span className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-600 dark:text-gray-400">+243</span>
          <input
            type="tel"
            placeholder="812345678"
            value={localNumber}
            onChange={(e) => setLocalNumber(e.target.value)}
            className="w-full pl-14 p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#1E1E1E] text-gray-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-yellow-400"
            disabled={!!confirmationResult || loading}
            autoFocus={!confirmationResult}
          />
        </div>

        {/* OTP */}
        {confirmationResult && (
          <input
            type="text"
            placeholder={t('enterOtp') || 'Code reçu par SMS'}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#1E1E1E] text-gray-900 dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-yellow-400"
            disabled={loading}
            autoFocus
          />
        )}

        {/* ERREUR */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* BOUTON */}
        <button
          type="submit"
          className={`w-full p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#FF5E3A] to-[#FFBA00] shadow ${
            loading || !isOnline ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          disabled={loading || !isOnline}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {t('pleaseWait') || 'Patiente...'}
            </div>
          ) : confirmationResult ? t('verifyCode') || 'Vérifier le code' : t('sendCode') || 'Envoyer le code'}
        </button>
      </form>

      <div id="recaptcha-container"></div>
    </div>
  );
}
