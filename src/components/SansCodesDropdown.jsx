// SansCodesDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { addPending, isOnline, syncPendingData, KEYS } from "../utils/offlineUtils";
import { fetchProductsFromAPI } from "../utils/openFoodFacts";
import './SansCodesDropdown.css';

export default function SansCodesDropdown({ onAdd, onClose }) {
  const { t } = useTranslation();
  const [produits, setProduits] = useState([]);
  const [filteredProduits, setFilteredProduits] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const listRef = useRef(null);

  // --- Recherche via API uniquement
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProduits([]);
      return;
    }

    const fetchAndFilter = async () => {
      setLoading(true);
      try {
        const results = await fetchProductsFromAPI(searchTerm);
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = results
          .map(p => ({ ...p, matchScore: p.nom.toLowerCase().includes(lowerTerm) ? 1 : 0 }))
          .sort((a,b)=>b.matchScore - a.matchScore);
        setProduits(filtered);
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
    await onAdd(selectedProduit);

    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1000);

    if (isOnline()) await syncPendingData();
    else addPending(KEYS.pending.panier, selectedProduit);

    setSelectedProduit(null);
    setSearchTerm("");

    if (onClose) onClose();
  };

  return (
    <div className="sans-codes-container">
      <div className="sans-codes-header">
        <button className="sans-codes-cancel" onClick={onClose}>
          {t('cancel')}
        </button>
      </div>

      <input
        type="text"
        className="dropdown-selected"
        placeholder={t('searchProduct')}
        value={searchTerm}
        onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && (
        <div className="dropdown-list" ref={listRef}>
          {filteredProduits.map((p, idx) => (
            <div
              key={p.code || p.id || idx}
              className="dropdown-item"
              onClick={() => handleSelect(p)}
            >
              <span className="item-nom">{p.nom}</span>
              <span className="item-prix">{Number(p.prix || 1).toFixed(2)} Fc</span>
            </div>
          ))}
          {loading && <div className="loading">{t('loading')}</div>}
          {!loading && filteredProduits.length === 0 && (
            <div className="dropdown-item disabled">{t('noProductsAvailable')}</div>
          )}
        </div>
      )}

      <button
        className={`sans-codes-add ${selectedProduit ? 'enabled' : ''} ${addedFeedback ? 'added-feedback' : ''}`}
        onClick={handleAddClick}
        disabled={!selectedProduit}
      >
        {addedFeedback ? '✓ ' + t('added') : t('add')}
      </button>
    </div>
  );
}
