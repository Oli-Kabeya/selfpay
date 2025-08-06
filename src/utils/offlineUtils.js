export const isOnline = () => navigator.onLine;

export const saveToLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erreur sauvegarde locale:', e);
  }
};

export const loadFromLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Erreur chargement local:', e);
    return null;
  }
};

export const syncWithFirestore = async (key, fetchFromFirestore, onNewData) => {
  const localData = loadFromLocal(key);
  if (localData) onNewData(localData); // 1. Charger local d'abord

  if (isOnline()) {
    try {
      const firestoreData = await fetchFromFirestore();
      if (JSON.stringify(firestoreData) !== JSON.stringify(localData)) {
        onNewData(firestoreData);
        saveToLocal(key, firestoreData); // 2. Sauvegarde locale
      }
    } catch (e) {
      console.error('Erreur Firestore:', e);
    }
  }
};

// 🔽 Fonctions spécifiques pour liste
export const loadListeFromStorage = () => loadFromLocal('liste') || [];
export const saveListeToStorage = (liste) => saveToLocal('liste', liste);

// 🔽 Fonctions génériques aliasées pour Scan.jsx
export const loadLocalData = loadFromLocal;
export const saveLocalData = saveToLocal;
