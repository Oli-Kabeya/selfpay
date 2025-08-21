// Liste.jsx
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../hooks/useTranslation';
import FooterNav from '../components/FooterNav';
import { 
  loadLocal, saveLocal, addPending, syncPendingData, isOnline, KEYS 
} from '../utils/offlineUtils';
import './Liste.css';

export default function Liste() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // --- Chargement initial
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/auth');
      return;
    }

    // ⚡ Affiche d'abord la version locale
    const localItems = loadLocal(KEYS.liste) || [];
    setItems(localItems);
    setLoading(false); // ← UI débloquée immédiatement

    // 🔄 Ensuite synchro Firestore si online
    const syncFirestore = async () => {
      if (!isOnline()) return;
      try {
        const docRef = doc(db, 'listes_courses', user.uid);
        const snap = await getDoc(docRef);
        const firestoreItems = snap.exists() ? snap.data().items || [] : [];
        const pending = loadLocal(KEYS.pending.liste) || [];

        // Fusion + déduplication
        const merged = [...firestoreItems, ...pending, ...localItems];
        const unique = Array.from(new Map(merged.map(p => [p.id || JSON.stringify(p), p])).values());

        setItems(unique);
        saveLocal(KEYS.liste, unique);

        await setDoc(docRef, { items: unique }, { merge: true });
        saveLocal(KEYS.pending.liste, []);
      } catch (err) {
        console.error('Erreur chargement liste:', err);
      } finally {
        syncPendingData();
      }
    };

    syncFirestore();
  }, [navigate]);

  const updateList = async (newItems) => {
    setItems(newItems);
    saveLocal(KEYS.liste, newItems);

    const user = auth.currentUser;
    if (user && isOnline()) {
      try {
        const ref = doc(db, 'listes_courses', user.uid);
        await setDoc(ref, { items: newItems }, { merge: true });
        syncPendingData();
      } catch {
        addPending(KEYS.pending.liste, { type: 'setList', items: newItems });
      }
    } else {
      addPending(KEYS.pending.liste, { type: 'setList', items: newItems });
    }
  };

  const addItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    const newItem = { 
      id: Date.now().toString(), 
      nom: trimmed, 
      checked: false, 
      ajoute_le: new Date().toISOString() 
    };
    updateList([...items, newItem]);
    setNewItemName('');
  };

  const toggleChecked = (id) => {
    const updated = items.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    updateList(updated);
  };

  const deleteItem = (id) => updateList(items.filter(item => item.id !== id));
  const deleteChecked = () => updateList(items.filter(item => !item.checked));
  const deleteAll = () => {
    if (window.confirm(t('confirmDeleteAll') || 'Supprimer toute la liste ?')) updateList([]);
  };

  const startEditing = (id, nom) => { setEditingId(id); setEditingText(nom); };
  const cancelEditing = () => { setEditingId(null); setEditingText(''); };
  const saveEditing = (id) => {
    const trimmed = editingText.trim();
    if (!trimmed) return cancelEditing();
    const updated = items.map(item => item.id === id ? { ...item, nom: trimmed } : item);
    cancelEditing();
    updateList(updated);
  };

  if (loading) {
    return <div className="p-6 text-center min-h-screen">{t('loading') || 'Chargement...'}</div>;
  }

  return (
    <div className="liste-page">
      <div className="liste-content">
        <h1 className="liste-title">{t('shoppingList') || 'Liste de courses'}</h1>
        {items.length === 0 ? (
          <p>{t('emptyShoppingList') || 'Votre liste est vide.'}</p>
        ) : (
          <ul className="liste-ul">
            {items.map(({ id, nom, checked }) => (
              <li key={id} className="liste-item">
                <input 
                  type="checkbox" 
                  checked={checked || false} 
                  onChange={() => toggleChecked(id)} 
                />
                {editingId === id ? (
                  <>
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={e => { 
                        if (e.key==='Enter') saveEditing(id); 
                        else if (e.key==='Escape') cancelEditing(); 
                      }}
                      onBlur={() => saveEditing(id)}
                      autoFocus
                      className="edit-input"
                    />
                    <button onClick={() => saveEditing(id)} className="save-btn">✓</button>
                    <button onClick={cancelEditing} className="cancel-btn">✗</button>
                  </>
                ) : (
                  <>
                    <span 
                      onClick={() => startEditing(id, nom)} 
                      className={`item-name ${checked?'checked':''}`} 
                      role="button"
                    >
                      {nom}
                    </span>
                    <button onClick={() => deleteItem(id)} className="delete-btn">🗑</button>
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
              className="delete-checked" 
              disabled={items.every(i => !i.checked)}
            >
              {t('deleteChecked')}
            </button>
            <button onClick={deleteAll} className="delete-all">{t('deleteAll')}</button>
          </div>
        )}
      </div>

      <div className="liste-input-container">
        <input
          type="text"
          placeholder={t('addNewItemPlaceholder')}
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key==='Enter' && addItem()}
        />
        <button onClick={addItem} disabled={!newItemName.trim()}>{t('add')}</button>
      </div>

      <FooterNav />
    </div>
  );
}
