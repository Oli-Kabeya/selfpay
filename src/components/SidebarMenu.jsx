import React from 'react';
import './SidebarMenu.css';

export default function SidebarMenu({ isOpen, onClose, title, children }) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside className={`sidebar-menu ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="sidebar-header">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close panel">&times;</button>
        </header>
        <div className="sidebar-content">{children}</div>
      </aside>
    </>
  );
}
