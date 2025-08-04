import React, { useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import './ListeOverlay.css';

export default function ListeOverlay({ onClose }) {
  const { t } = useTranslation();
  const db = getFirestore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const overlayRef = useRef(null);

  useEffect(() => {
    const fetchList = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docRef = doc(db, 'listes_courses', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setItems(data.items || []);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Erreur de chargement:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [db]);

  // Gérer le swipe gauche->droite pour fermer l'overlay
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    if (deltaX > 50) onClose(); // swipe gauche -> droite
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
            <p>{t('emptyShoppingList')}</p>
          ) : (
            <ul>
              {items.map(({ id, nom, checked }) => (
                <li key={id} className="item">
                  <input type="checkbox" checked={checked || false} readOnly />
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
