import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import FooterNav from '../components/FooterNav';

export default function Profile() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
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

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center bg-gray-100">
        <p className="text-lg">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100 page-transition pb-20">
      <h1 className="text-xl font-bold mb-4">Mon Profil</h1>
      <p className="text-lg">Téléphone : {phone}</p>
      <button
        onClick={handleLogout}
        className="mt-6 bg-gray-800 text-white px-4 py-2 rounded"
      >
        Déconnexion
      </button>
      <FooterNav />
    </div>
  );
}
