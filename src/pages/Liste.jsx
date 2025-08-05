import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';
import FooterNav from '../components/FooterNav';
import './Liste.css';

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
    try {
      const docRef = doc(db, 'listes_courses', user.uid);
      await setDoc(docRef, { items: newItems }, { merge: true });
    } catch (error) {
      console.error('Erreur Firestore :', error);
    }
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
      ajoute_le: new Date()
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
    <div className="liste-page">
      <div className="liste-content">
        <h1 className="liste-title">{t('shoppingList') || 'Liste de courses'}</h1>

        {items.length === 0 ? (
          <p>{t('emptyShoppingList') || 'Votre liste de courses est vide.'}</p>
        ) : (
          <ul className="liste-ul">
            {items.map(({ id, nom, checked }) => (
              <li key={id} className="liste-item">
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
                      className="edit-input"
                      inputMode="text"
                      style={{ fontSize: '16px' }} // Pour éviter le zoom mobile
                    />
                    <button onClick={() => saveEditing(id)} className="save-btn" aria-label={t('save')}>✓</button>
                    <button onClick={cancelEditing} className="cancel-btn" aria-label={t('cancel')}>✗</button>
                  </>
                ) : (
                  <>
                    <span
                      className={`item-name ${checked ? 'checked' : ''}`}
                      onClick={() => startEditing(id, nom)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') startEditing(id, nom);
                      }}
                      aria-label={t('editItem')}
                      role="button"
                    >
                      {nom}
                    </span>
                    <button onClick={() => deleteItem(id)} className="delete-btn" aria-label={t('deleteItem')}>🗑</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="liste-actions">
            <button
              onClick={deleteChecked}
              disabled={items.every(item => !item.checked)}
              className="action-btn"
            >
              {t('deleteChecked')}
            </button>

            <button onClick={deleteAll} className="action-btn delete-all">
              {t('deleteAll')}
            </button>
          </div>
        )}
      </div>

      <div className="liste-input-container">
        <input
          type="text"
          placeholder={t('addNewItemPlaceholder')}
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          aria-label={t('addNewItem')}
          inputMode="text"
          style={{ fontSize: '16px' }} // évite zoom mobile
        />
        <button onClick={addItem} disabled={!newItemName.trim()}>
          {t('add')}
        </button>
      </div>

      <FooterNav />
    </div>
  );
}
