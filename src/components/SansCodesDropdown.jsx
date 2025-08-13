import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";
import "../pages/Scan.css";
import { 
  isOnline, 
  loadLocal, 
  saveLocal, 
  addPending, 
  syncPendingData,  // corrigé
  KEYS, 
  initOfflineSync 
} from "../utils/offlineUtils";

const LOCAL_KEY = "produits_sans_codes_offline";

export default function SansCodesDropdown({ onAdd }) {
  const { t } = useTranslation();
  const [produitsSansCodes, setProduitsSansCodes] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // --- Initialisation offline sync
  useEffect(() => {
    initOfflineSync();
  }, []);

  // --- Charger produits depuis Firestore ou localStorage si offline
  useEffect(() => {
    const fetchProduits = async () => {
      let produits = [];
      if (isOnline()) {
        try {
          const querySnapshot = await getDocs(collection(db, "produits_sans_codes"));
          produits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          saveLocal(LOCAL_KEY, produits);
        } catch (err) {
          console.error("Erreur chargement Firestore:", err);
          produits = loadLocal(LOCAL_KEY);
        }
      } else {
        produits = loadLocal(LOCAL_KEY);
      }
      setProduitsSansCodes(produits);
    };
    fetchProduits();
  }, []);

  // --- Sélection d’un produit
  const handleSelect = (produit) => {
    setSelectedProduit(produit);
    setIsOpen(false);
  };

  // --- Ajout au panier (offline-first)
  const handleAddClick = async () => {
    if (!selectedProduit) return;

    // --- Ajouter au panier local
    onAdd(selectedProduit);

    // --- File de synchronisation
    if (isOnline()) {
      // En ligne : Firestore sera mis à jour via syncPendingData
      await syncPendingData();
    } else {
      // Offline → ajouter dans pending
      addPending(KEYS.pending.panier, selectedProduit);
    }

    setSelectedProduit(null);
  };

  return (
    <div className="sans-codes-container">
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
            <img
              src={selectedProduit.imageUrl}
              alt={selectedProduit.nom}
              loading="lazy"
              onError={(e) => { e.target.src = "/icons/default_product.png"; }}
            />
            <span>{selectedProduit.nom} - {Number(selectedProduit.prix).toFixed(2)} FCFA</span>
          </>
        ) : (
          <span>{t('selectSansCodeProduct') || "Sélectionner un produit"}</span>
        )}
        <span className="arrow">{isOpen ? "▲" : "▼"}</span>
      </div>

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
              <img
                src={p.imageUrl}
                alt={p.nom}
                loading="lazy"
                onError={(e) => { e.target.src = "/icons/default_product.png"; }}
              />
              <div className="item-info">
                <span className="item-nom">{p.nom}</span>
                <span className="item-prix">{Number(p.prix).toFixed(2)} FCFA</span>
              </div>
            </div>
          ))}
          {produitsSansCodes.length === 0 && (
            <div className="dropdown-item disabled">
              {t('noProductsAvailable') || "Aucun produit disponible"}
            </div>
          )}
        </div>
      )}

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
