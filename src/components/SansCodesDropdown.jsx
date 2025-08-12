import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";
import "../pages/Scan.css";

export default function SansCodesDropdown({ onAdd }) {
  const { t } = useTranslation();
  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Charger les produits depuis Firestore
  useEffect(() => {
    const fetchProduits = async () => {
      const querySnapshot = await getDocs(collection(db, "produits_sans_codes"));
      const produits = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProduitsSansCodes(produits);
    };
    fetchProduits();
  }, []);

  const handleSelect = (produit) => {
    setSelectedProduit(produit);
    setIsOpen(false);
  };

  const handleAddClick = () => {
    if (selectedProduit) {
      onAdd(selectedProduit);
      setSelectedProduit(null);
    }
  };

  return (
    <div className="sans-codes-container">
      {/* Bouton qui ouvre/ferme la liste */}
      <div
        className="dropdown-selected"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedProduit ? (
          <>
            <img src={selectedProduit.imageUrl} alt={selectedProduit.nom} />
            <span>{selectedProduit.nom} - {Number(selectedProduit.prix).toFixed(2)} FCFA</span>
          </>
        ) : (
          <span>{t('selectSansCodeProduct') || "Sélectionner un produit"}</span>
        )}
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>

      {/* Liste déroulante custom */}
      {isOpen && (
        <div className="dropdown-list" role="listbox" tabIndex={-1}>
          {produitsSansCodes.map(p => (
            <div
              key={p.id}
              className="dropdown-item"
              onClick={() => handleSelect(p)}
              role="option"
              aria-selected={selectedProduit?.id === p.id}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(p)}
            >
              <img src={p.imageUrl} alt={p.nom} />
              <div className="item-info">
                <span className="item-nom">{p.nom}</span>
                <span className="item-prix">{Number(p.prix).toFixed(2)} FCFA</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton ajouter, visible uniquement si produit sélectionné */}
      <button
        className={`sans-codes-add ${selectedProduit ? 'enabled' : ''}`}
        onClick={handleAddClick}
        disabled={!selectedProduit}
      >
        {t('add') || "Ajouter"}
      </button>
    </div>
  );
}
