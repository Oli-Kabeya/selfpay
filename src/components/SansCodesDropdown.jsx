import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { addPending, isOnline, syncPendingData, KEYS } from "../utils/offlineUtils";
import { fetchProductsFromAPI } from "../utils/openFoodFacts"; // fonction que tu auras à créer pour rechercher l'API
import "../pages/Scan.css";

export default function SearchProduits({ onAdd }) {
  const { t } = useTranslation();
  const [produitsAPI, setProduitsAPI] = useState([]);
  const [filteredProduits, setFilteredProduits] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const listRef = useRef(null);

  // --- Recherche approximative via API
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProduits([]);
      return;
    }

    const fetchAndFilter = async () => {
      setLoading(true);
      try {
        const results = await fetchProductsFromAPI(searchTerm);
        // Recherche approximative sur le nom (fuzzy match simple)
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = results
          .map(p => ({
            ...p,
            matchScore: p.nom.toLowerCase().includes(lowerTerm) ? 1 : 0
          }))
          .sort((a, b) => b.matchScore - a.matchScore);
        setProduitsAPI(filtered);
        setFilteredProduits(filtered);
      } catch (err) {
        console.error("Erreur recherche API:", err);
        setFilteredProduits([]);
      }
      setLoading(false);
    };

    fetchAndFilter();
  }, [searchTerm]);

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

  const handleScroll = () => {
    // Optionnel : si l'API supporte pagination, tu peux ajouter ici
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
              key={p.code || p.id || p.nom} 
              className="dropdown-item"
              onClick={() => handleSelect(p)}
              role="option"
              aria-selected={selectedProduit?.id === p.id}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(p)}
            >
              <div className="item-info">
                <span className="item-nom">{p.nom}</span>
                <span className="item-prix">{Number(p.prix || 1).toFixed(2)} Fc</span>
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
