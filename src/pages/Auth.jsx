import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import './Auth.css';

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

    // Nettoyer le numéro (supprimer tout sauf chiffres)
    const cleanNumber = localNumber.replace(/[^0-9]/g, '');
    // Validation RDC : 10 chiffres, doit commencer par 0
    if (!/^0\d{9}$/.test(cleanNumber)) {
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
      const formattedNumber = '+243' + cleanNumber.slice(1); // Retirer le 0
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
    <div className="auth-container">
      <h1 className="auth-title">SelfPay</h1>

      {!isOnline && (
        <div className="auth-offline-warning">
          {t('offlineWarning') || 'Pas de connexion internet. Connexion impossible.'}
        </div>
      )}

      <form onSubmit={confirmationResult ? handleVerifyOtp : handleSendCode} className="auth-form">
        <div className="auth-phone-input">
          <span className="auth-country-code">+243&nbsp;</span>
          <input
            type="tel"
            placeholder={t('numberConfig') || 'Commencer par 0'}
            value={localNumber}
            onChange={(e) => setLocalNumber(e.target.value)}
            disabled={!!confirmationResult || loading}
            autoFocus={!confirmationResult}
          />
        </div>

        {confirmationResult && (
          <input
            type="text"
            placeholder={t('enterOtp') || 'Code reçu par SMS'}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="auth-otp-input"
            disabled={loading}
            autoFocus
          />
        )}

        {error && <p className="auth-error">{error}</p>}

        <button
          type="submit"
          className={`auth-button ${loading || !isOnline ? 'disabled' : ''}`}
          disabled={loading || !isOnline}
        >
          {loading ? (
            <div className="auth-spinner">
              <div className="spinner"></div>
              {t('pleaseWait') || 'Patiente...'}
            </div>
          ) : confirmationResult ? t('verifyCode') || 'Vérifier le code' : t('sendCode') || 'Envoyer le code'}
        </button>
      </form>

      <div id="recaptcha-container"></div>
    </div>
  );
}
