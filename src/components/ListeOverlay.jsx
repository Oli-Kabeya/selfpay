import React, { useEffect, useState, useRef } from 'react';
import { auth } from '../firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import useTranslation from '../hooks/useTranslation';
import { useFooterVisibility } from '../context/FooterVisibilityContext';

export default function ListeOverlay({ onClose }) {
  const { t } = useTranslation();
  const db = getFirestore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setFooterVisible } = useFooterVisibility();

  const overlayRef = useRef(null);
  const touchStartX = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Cacher le footer quand overlay visible
  useEffect(() => {
    setFooterVisible(false);
    setIsVisible(true);
    return () => setFooterVisible(true);
  }, [setFooterVisible]);

  // Charger la liste au montage
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

  // Swipe vers la gauche ferme l'overlay
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX.current - touchEndX > 50) {
      triggerClose();
    }
  };

  const triggerClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <>
      {/* Fond flouté semi-transparent */}
      <div
        className="fixed inset-0 z-[998] bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={triggerClose}
        aria-hidden="true"
      />

      {/* Overlay latéral droit collé sans espace */}
      <aside
        ref={overlayRef}
        className={`
          fixed top-0 right-0 h-full w-[70%] max-w-[400px]
          bg-[var(--color-card)] text-[var(--color-text)]
          border-l border-[var(--color-border)]
          shadow-xl z-[999]
          flex flex-col overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label={t('shoppingList') || 'Liste de courses'}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <header className="flex items-center px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-semibold">{t('shoppingList') || 'Liste de courses'}</h2>
        </header>

        <main className="flex-grow p-4 flex flex-col justify-center items-center">
          {loading ? (
            <p className="text-sm text-[var(--color-muted)]">
              {t('loading') || 'Chargement...'}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              {t('emptyShoppingList') || 'Votre liste est vide.'}
            </p>
          ) : (
            <ul className="space-y-3 w-full">
              {items.map(({ id, nom, checked }) => (
                <li
                  key={id}
                  className="
                    flex items-center gap-3
                    p-3 rounded-lg
                    bg-[var(--color-card)]
                    border border-transparent
                    hover:border-[var(--color-primary)]
                    cursor-default select-none
                  "
                >
                  <input
                    type="checkbox"
                    checked={checked || false}
                    readOnly
                    aria-label={`${checked ? t('checked') : t('unchecked')} ${nom}`}
                    className="w-4 h-4 cursor-default accent-[var(--color-primary)]"
                    tabIndex={-1}
                  />
                  <span
                    className={`flex-grow text-base ${
                      checked ? 'line-through text-[var(--color-muted)]' : ''
                    }`}
                  >
                    {nom}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </main>
      </aside>
    </>
  );
}
