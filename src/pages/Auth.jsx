import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function Auth() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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
    if (!phone.startsWith('+243')) {
      setError('Le numéro doit commencer par +243...');
      return;
    }

    try {
      setLoading(true);
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
    } catch (err) {
      setError("Erreur lors de l'envoi du code. Vérifie le numéro.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await confirmationResult.confirm(otp);
      alert('Connexion réussie ✅');
      navigate('/scan');
    } catch (err) {
      setError('Code incorrect. Réessaie.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-white dark:bg-[#121212] px-4 page-transition">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-[#F5F5F5] mb-8">SelfPay</h1>

      <form onSubmit={confirmationResult ? handleVerifyOtp : handleSendCode} className="space-y-4 w-full max-w-sm">
        <input
          type="tel"
          placeholder="+243..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#1E1E1E] text-gray-900 dark:text-[#F5F5F5]"
          disabled={!!confirmationResult || loading}
          autoFocus={!confirmationResult}
        />
        {confirmationResult && (
          <input
            type="text"
            placeholder="Code reçu par SMS"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-[#1E1E1E] text-gray-900 dark:text-[#F5F5F5]"
            disabled={loading}
            autoFocus
          />
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className={`w-full p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-[#FF5E3A] to-[#FFBA00] shadow ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
          }`}
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Patiente...
            </div>
          ) : confirmationResult ? 'Vérifier le code' : 'Envoyer le code'}
        </button>
      </form>

      <div id="recaptcha-container"></div>
    </div>
  );
}
