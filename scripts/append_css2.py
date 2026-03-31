import pathlib

css_path = pathlib.Path('frontend/css/styles.css')
with open(css_path, 'a', encoding='utf-8') as f:
    f.write('''

/* ════════════════════════════════════════════════════════════════════════
   POS SPLIT LAYOUT (desktop: catálogo + pedido side by side)
   ════════════════════════════════════════════════════════════════════════ */
.pos-split {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

@media (min-width: 768px) {
  .pos-split {
    flex-direction: row;
    align-items: flex-start;
    gap: 20px;
    height: calc(100dvh - 120px);
  }
}

/* ── Catálogo (izquierda) ── */
.catalogo-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .catalogo-panel {
    overflow-y: auto;
    max-height: 100%;
    padding-right: 4px;
  }
}

.catalogo-search {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-base);
  padding-bottom: 4px;
}

.search-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
}

.search-icon-wrap .icon-sm {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
  margin-right: 0;
}

.search-icon-wrap .input-buscar {
  padding-left: 38px;
}

/* ── Category Tabs ── */
.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 2px 0;
}

.category-tab {
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: 20px;
  font-family: var(--font);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--t);
  white-space: nowrap;
  touch-action: manipulation;
}

.category-tab:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--accent);
}

.category-tab.active {
  background: var(--accent-dim);
  color: var(--accent-light);
  border-color: var(--accent);
}

/* ── Panel de pedido (derecha) ── siempre visible en desktop ── */
@media (min-width: 768px) {
  .panel-carrito {
    width: 320px;
    flex-shrink: 0;
    position: sticky !important;
    top: 0;
    transform: none !important;
    border-radius: var(--radius-lg) !important;
    background: var(--bg-card) !important;
    border-color: var(--border) !important;
    padding: 20px !important;
    max-height: 100% !important;
    overflow-y: auto;
    z-index: auto !important;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  @media (min-width: 1200px) {
    .panel-carrito {
      width: 360px;
    }
  }
}

/* ── Pago inline (dentro del panel de pedido) ── */
.pago-inline {
  padding: 12px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pago-inline-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

/* ── Gestión de categorías (admin) ── */
.cat-admin-lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.cat-admin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color var(--t);
}

.cat-admin-item:hover {
  border-color: var(--accent);
}

.cat-nombre {
  font-weight: 600;
  font-size: 0.9rem;
}

.cat-acciones {
  display: flex;
  gap: 6px;
}

/* Categoría badge en tabla inventario */
.cat-badge {
  display: inline-block;
  padding: 3px 10px;
  background: var(--accent-dim);
  color: var(--accent-light);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* ── Historial de ventas (admin dashboard) ── */
.venta-anulada td {
  opacity: 0.45;
  text-decoration: line-through;
}

.metodo-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.metodo-efectivo  { background: rgba(62,207,142,0.12); color: #3ecf8e; }
.metodo-nequi     { background: rgba(91,105,222,0.15); color: #8b95f0; }
.metodo-daviplata { background: rgba(224,64,104,0.12); color: #f06090; }
.metodo-tarjeta   { background: rgba(224,123,42,0.15); color: var(--accent-light); }
''')

print("CSS extendido correctamente")
