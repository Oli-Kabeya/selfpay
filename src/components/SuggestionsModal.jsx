import React, { useState, useEffect } from 'react';
import './SuggestionsModal.css';
import { X } from 'lucide-react';

export default function SuggestionsModal({ suggestions, onClose, onSelect }) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 200); // durée fade-out
  };

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={`modal-overlay ${closing ? 'fade-out' : ''}`}>
      <div className={`modal-container ${closing ? 'fade-out-scale' : ''}`}>
        <div className="modal-header">
          <h2>Choisissez un produit</h2>
          <button className="close-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {suggestions.map((p, i) => (
            <div
              key={i}
              className="suggestion-item"
              onClick={() => {
                handleClose();
                setTimeout(() => onSelect(p), 200); // attendre fade-out
              }}
            >
              <span className="suggestion-name">{p.nom}</span>
              <span className="suggestion-price">{Number(p.prix).toFixed(2)} Fc</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
