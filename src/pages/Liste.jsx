import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';

export default function Liste() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const db = getFirestore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger la liste depuis Firestore
  useEffect(() => {
    const fetchList = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const docRef = doc(db, 'listes_courses', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const allItems = data.items || [];
          setItems(allItems);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la liste :', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [db, navigate]);

  // Mise à jour Firestore après toute modification
  const updateFirestoreList = async (newItems) => {
    const user = auth.currentUser;
    if (!user) return;
    const docRef = doc(db, 'listes_courses', user.uid);
    await setDoc(docRef, { items: newItems }, { merge: true });
  };

  // Toggle checkbox d’un item
  const toggleChecked = async (id) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    await updateFirestoreList(updatedItems);
  };

  // Supprimer tous les items cochés
  const deleteChecked = async () => {
    const filtered = items.filter(item => !item.checked);
    setItems(filtered);
    await updateFirestoreList(filtered);
  };

  // Supprimer toute la liste après confirmation
  const deleteAll = async () => {
    const confirmed = window.confirm(t('confirmDeleteAll') || 'Supprimer toute la liste ?');
    if (!confirmed) return;
    setItems([]);
    const user = auth.currentUser;
    if (!user) return;
    const docRef = doc(db, 'listes_courses', user.uid);
    await setDoc(docRef, { items: [] }, { merge: true });
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-lg" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}>
        {t('loading') || 'Chargement...'}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}>
      <h1 className="text-2xl font-bold mb-4">{t('shoppingList') || 'Liste de courses'}</h1>

      {items.length === 0 ? (
        <p>{t('emptyShoppingList') || 'Votre liste de courses est vide.'}</p>
      ) : (
        <ul className="space-y-3 mb-6">
          {items.map(({ id, nom, checked }) => (
            <li key={id} className="flex items-center gap-3 p-3 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
              <input
                type="checkbox"
                checked={checked || false}
                onChange={() => toggleChecked(id)}
                aria-label={`${checked ? t('uncheck') : t('check')} ${nom}`}
              />
              <span className={checked ? 'line-through text-gray-400' : ''}>{nom}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-4">
        <button
          onClick={deleteChecked}
          disabled={items.every(item => !item.checked)}
          className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {t('deleteChecked') || 'Supprimer cochés'}
        </button>

        <button
          onClick={deleteAll}
          className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
        >
          {t('deleteAll') || 'Tout supprimer'}
        </button>
      </div>
    </div>
  );
}
