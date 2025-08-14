import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, query, orderBy, limit, startAfter } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";
import "../pages/Scan.css";
import {
  isOnline,
  loadLocal,
  saveLocal,
  addPending,
  syncPendingData,
  KEYS,
  initOfflineSync
} from "../utils/offlineUtils";

const LOCAL_KEY = "produits_offline";
const PAGE_SIZE = 20;

export default function SearchProduits({ onAdd }) {
  const { t } = useTranslation();
  const [produits, setProduits] = useState([]);
  const [filteredProduits, setFilteredProduits] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const listRef = useRef(null);

  // --- Initialisation offline sync
  useEffect(() => {
    initOfflineSync();
  }, []);

  // --- Chargement initial
  useEffect(() => {
    fetchProduits(true);
  }, []);

  // --- Filtrer produits
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProduits(produits);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredProduits(
        produits.filter(p => p.nom.toLowerCase().includes(lowerTerm))
      );
    }
  }, [searchTerm, produits]);

  // --- Fonction de chargement (pagination)
  const fetchProduits = async (reset = false) => {
    if (!isOnline() && !reset) return;
    setLoading(true);

    try {
      let produitsData = [];
      if (isOnline()) {
        let q = query(collection(db, "produits"), orderBy("nom"), limit(PAGE_SIZE));
        if (!reset && lastDoc) {
          q = query(collection(db, "produits"), orderBy("nom"), startAfter(lastDoc), limit(PAGE_SIZE));
        }
        const snapshot = await getDocs(q);
        produitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (reset) {
          saveLocal(LOCAL_KEY, produitsData);
          setProduits(produitsData);
        } else {
          saveLocal(LOCAL_KEY, [...produits, ...produitsData]);
          setProduits(prev => [...prev, ...produitsData]);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } else {
        // Offline
        produitsData = loadLocal(LOCAL_KEY) || [];
        setProduits(produitsData);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Erreur chargement Firestore:", err);
    }

    setLoading(false);
  };

  // --- Scroll bas
  const handleScroll = () => {
    if (!listRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      fetchProduits(false);
    }
  };

  const handleSelect = (produit) => {
    setSelectedProduit(produit);
    setSearchTerm(produit.nom);
    setIsOpen(false);
  };

  const handleAddClick = async () => {
    if (!selectedProduit) return;
    onAdd(selectedProduit);

    if (isOnline()) {
      await syncPendingData();
    } else {
      addPending(KEYS.pending.panier, selectedProduit);
    }

    setSelectedProduit(null);
    setSearchTerm("");
  };

  return (
    <div className="sans-codes-container">
      <input
        type="text"
        className="dropdown-selected"
        placeholder={t('searchProduct')}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && (
        <div
          className="dropdown-list"
          ref={listRef}
          onScroll={handleScroll}
          role="listbox"
          tabIndex={-1}
        >
          {filteredProduits.map(p => (
            <div
              key={p.id}
              className="dropdown-item"
              onClick={() => handleSelect(p)}
              role="option"
              aria-selected={selectedProduit?.id === p.id}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(p)}
            >
              <div className="item-info">
                <span className="item-nom">{p.nom}</span>
                <span className="item-prix">{Number(p.prix).toFixed(2)} Fc</span>
              </div>
            </div>
          ))}
          {loading && <div className="loading">{t('loading')}</div>}
          {!loading && filteredProduits.length === 0 && (
            <div className="dropdown-item disabled">
              {t('noProductsAvailable')}
            </div>
          )}
        </div>
      )}

      <button
        className={`sans-codes-add ${selectedProduit ? 'enabled' : ''}`}
        onClick={handleAddClick}
        disabled={!selectedProduit}
      >
        {t('add')}
      </button>
    </div>
  );
}
