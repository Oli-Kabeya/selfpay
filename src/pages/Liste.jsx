import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';
import FooterNav from '../components/FooterNav'; // ✅ Footer ajouté

export default function Liste() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const db = getFirestore();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

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

  const updateFirestoreList = async (newItems) => {
    const user = auth.currentUser;
    if (!user) return;
    const docRef = doc(db, 'listes_courses', user.uid);
    await setDoc(docRef, { items: newItems }, { merge: true });
  };

  const toggleChecked = async (id) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    await updateFirestoreList(updatedItems);
  };

  const deleteChecked = async () => {
    const filtered = items.filter(item => !item.checked);
    setItems(filtered);
    await updateFirestoreList(filtered);
  };

  const deleteAll = async () => {
    const confirmed = window.confirm(t('confirmDeleteAll') || 'Supprimer toute la liste ?');
    if (!confirmed) return;
    setItems([]);
    const user = auth.currentUser;
    if (!user) return;
    const docRef = doc(db, 'listes_courses', user.uid);
    await setDoc(docRef, { items: [] }, { merge: true });
  };

  const addItem = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    const newItem = {
      id: Date.now().toString(),
      nom: trimmed,
      checked: false,
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewItemName('');
    await updateFirestoreList(updatedItems);
  };

  const startEditing = (id, currentName) => {
    setEditingId(id);
    setEditingText(currentName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEditing = async (id) => {
    const trimmed = editingText.trim();
    if (!trimmed) return cancelEditing();
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, nom: trimmed } : item
    );
    setItems(updatedItems);
    setEditingId(null);
    setEditingText('');
    await updateFirestoreList(updatedItems);
  };

  const deleteItem = async (id) => {
    const filtered = items.filter(item => item.id !== id);
    setItems(filtered);
    await updateFirestoreList(filtered);
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-lg min-h-screen" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}>
        {t('loading') || 'Chargement...'}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}>
      <div className="flex-grow max-w-md mx-auto p-4 pb-24"> {/* pb-24 pour espace Footer */}
        <h1 className="text-2xl font-bold mb-4">{t('shoppingList') || 'Liste de courses'}</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder={t('addNewItemPlaceholder') || 'Ajouter un produit...'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-grow rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            aria-label={t('addNewItem') || 'Ajouter un nouveau produit'}
            autoFocus
          />
          <button
            onClick={addItem}
            disabled={!newItemName.trim()}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 transition"
          >
            {t('add') || 'Ajouter'}
          </button>
        </div>

        {items.length === 0 ? (
          <p>{t('emptyShoppingList') || 'Votre liste de courses est vide.'}</p>
        ) : (
          <ul className="space-y-3 mb-6">
            {items.map(({ id, nom, checked }) => (
              <li
                key={id}
                className="flex items-center gap-3 p-3 rounded-lg shadow-md"
                style={{ backgroundColor: 'var(--color-card)' }}
              >
                <input
                  type="checkbox"
                  checked={checked || false}
                  onChange={() => toggleChecked(id)}
                  aria-label={`${checked ? t('uncheck') : t('check')} ${nom}`}
                />

                {editingId === id ? (
                  <>
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing(id);
                        else if (e.key === 'Escape') cancelEditing();
                      }}
                      onBlur={() => saveEditing(id)}
                      autoFocus
                      className="flex-grow rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      aria-label={t('editItem') || 'Modifier le produit'}
                    />
                    <button
                      onClick={() => saveEditing(id)}
                      className="ml-2 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                      aria-label={t('save') || 'Sauvegarder'}
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="ml-1 px-3 py-1 bg-gray-300 rounded hover:bg-gray-400 transition"
                      aria-label={t('cancel') || 'Annuler'}
                    >
                      ✗
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-grow cursor-pointer select-none ${checked ? 'line-through text-gray-400' : ''}`}
                      onClick={() => startEditing(id, nom)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') startEditing(id, nom);
                      }}
                      aria-label={t('editItem') || 'Modifier le produit'}
                      role="button"
                    >
                      {nom}
                    </span>
                    <button
                      onClick={() => deleteItem(id)}
                      className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      aria-label={t('deleteItem') || 'Supprimer le produit'}
                    >
                      🗑
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-4">
          <button
            onClick={deleteChecked}
            disabled={items.every(item => !item.checked)}
            className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition"
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

    </div>
  );
}
