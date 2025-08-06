import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import './ListeOverlay.css';
import { loadListeFromStorage, saveListeToStorage } from '../utils/offlineUtils';

export default function ListeOverlay({ onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const db = getFirestore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef(null);

  useEffect(() => {
    const fetchList = async () => {
      const localData = loadListeFromStorage();
      setItems(localData);
      setLoading(false);

      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, 'listes_courses', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreItems = data.items || [];
          setItems(firestoreItems);
          saveListeToStorage(firestoreItems);
        }
      } catch (error) {
        console.error('Erreur de chargement:', error);
      }
    };
    fetchList();
  }, [db]);

  const updateFirestoreList = async (newItems) => {
    setItems(newItems);
    saveListeToStorage(newItems);
    const user = auth.currentUser;
    if (!user) return;
    try {
      const docRef = doc(db, 'listes_courses', user.uid);
      await setDoc(docRef, { items: newItems }, { merge: true });
    } catch (error) {
      console.error('Erreur Firestore:', error);
    }
  };

  const toggleChecked = async (id) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    await updateFirestoreList(updatedItems);
  };

  const touchStartX = useRef(null);
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
