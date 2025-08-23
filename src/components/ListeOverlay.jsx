import React, { useEffect, useRef, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './ListeOverlay.css';
import { loadLocal, saveLocal, KEYS, isOnline } from '../utils/offlineUtils';

export default function ListeOverlay({ onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const overlayRef = useRef(null);
  const touchStartX = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // ⚡ Charger depuis localStorage immédiatement
    const localData = loadLocal(KEYS.liste) || [];
    setItems(localData);
    setLoading(false);

    // 🔄 Sync Firestore si online
    const syncFirestore = async () => {
      if (!isOnline()) return;
      try {
        const docRef = doc(db, 'listes_courses', user.uid);
        const docSnap = await getDoc(docRef);
        const firestoreItems = docSnap.exists() ? docSnap.data().items || [] : [];

        // Fusion : priorité aux données locales
        const map = new Map();
        [...firestoreItems, ...localData].forEach(p => map.set(p.id || JSON.stringify(p), p));
        const unique = Array.from(map.values());

        setItems(unique);
        saveLocal(KEYS.liste, unique);
        await setDoc(docRef, { items: unique }, { merge: true });
      } catch (err) {
        console.error('Erreur de chargement Firestore:', err);
      }
    };

    syncFirestore();

    // ⚡ Écoute stockage local pour mise à jour live
    const handleStorageChange = (e) => {
      if (e.key === KEYS.liste) {
        setItems(loadLocal(KEYS.liste) || []);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleChecked = async (id) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);
    saveLocal(KEYS.liste, updatedItems);

    const user = auth.currentUser;
    if (!user) return;
    if (isOnline()) {
      try {
        const docRef = doc(db, 'listes_courses', user.uid);
        await setDoc(docRef, { items: updatedItems }, { merge: true });
      } catch (err) {
        console.error('Erreur Firestore:', err);
      }
    }
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 50) onClose();
  };

  return (
    <div className="liste-overlay-container">
      <div className="overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={overlayRef}
        className="liste-overlay-panel"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="liste-overlay-header">
          <h2>{t('shoppingList')}</h2>
        </div>
        <div className="liste-overlay-content">
          {loading ? (
            <p>{t('loading')}</p>
          ) : items.length === 0 ? (
            <div className="empty-overlay">
              <p>{t('emptyShoppingList')}</p>
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => navigate('/liste'), 50);
                }}
                className="go-to-liste-btn"
              >
                {t('addNewItem')}
              </button>
            </div>
          ) : (
            <ul>
              {items.map(({ id, nom, checked }) => (
                <li key={id} className="item">
                  <input
                    type="checkbox"
                    checked={checked || false}
                    onChange={() => toggleChecked(id)}
                    aria-label={`${checked ? t('uncheck') : t('check')} ${nom}`}
                  />
                  <span className={checked ? 'checked' : ''}>{nom}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
