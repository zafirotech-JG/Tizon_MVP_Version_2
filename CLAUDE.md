# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tizón** is a multi-tenant SaaS POS (Point-of-Sale) system built for Colombian barbershop restaurants (asaderos). It uses FastAPI (backend) + vanilla JS SPA (frontend) with SQLite (dev) / PostgreSQL (prod).

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server (with auto-reload)
uvicorn backend.main:app --reload

# Run on specific port
uvicorn backend.main:app --reload --port 8001
```

The frontend is served as static files by FastAPI — no separate frontend build step.

## Architecture

### Backend (`backend/`)

- `main.py` — App entry point: creates tables, mounts route routers, serves static frontend files
- `database.py` — SQLAlchemy engine/session; auto-detects SQLite vs PostgreSQL from `DATABASE_URL`
- `models_db.py` — ORM models: `Tenant`, `Sucursal`, `Producto`, `Categoria`, `Venta`
- `models.py` — Pydantic schemas for request/response validation
- `auth.py` — JWT creation/verification, `get_current_user` FastAPI dependency
- `routes/` — One file per domain: `auth.py`, `sucursales.py`, `productos.py`, `categorias.py`, `ventas.py`, `reportes.py`

### Frontend (`frontend/`)

- `js/app.js` — SPA router + sucursal selector logic; loads branches after login and on page reload
- `js/sucursal.js` — Shared state module: `getSucursalId()`, `setSucursal()`, `resetSucursal()` — imported by all feature modules
- `js/api.js` — Fetch wrapper; injects `Authorization: Bearer` token, handles 401 by logging out
- `js/auth.js` — Login/register UI + localStorage token management
- `js/pos.js` — Shopping cart, delivery surcharge, payment method, change calculation
- `js/inventario.js` — Product and category CRUD per branch
- `js/dashboard.js` — Daily sales summary and cash reconciliation per branch
- `js/utils.js` — Toast notifications, currency formatting

### Multi-tenancy + Multi-sucursal

Data isolation is two-level:
1. **Tenant level**: `tenant_id` in JWT payload, every query filters by it
2. **Branch level**: `sucursal_id` passed as query param (GET) or request body field (POST) — all products, categories, and sales belong to a specific branch

`Sucursal` belongs to `Tenant`. `Producto`, `Categoria`, and `Venta` each have both `tenant_id` and `sucursal_id` FKs.

The frontend stores the active branch in `sucursal.js` (backed by `localStorage.tizon_sucursal_id`). All API calls include the branch ID. When the user switches branches, all modules reset and reload.

### Data design notes

- **Soft deletes**: Products, categories, and branches use `activo: bool` — never hard-deleted
- **Denormalized sales**: `Venta` stores `producto_nombre` and `precio_unitario` as snapshots
- **Server-side totals**: Frontend sends items + quantities; backend multiplies by stored price
- **Branch guard**: The backend validates that `sucursal_id` belongs to the authenticated `tenant_id` on every write operation

### Database migration for existing installs

`SQLAlchemy create_all` won't add columns to existing tables. Run manually:

**SQLite (local dev):** delete `tizon.db` and restart the server.

**PostgreSQL (Supabase):** run in the SQL Editor:
```sql
CREATE TABLE sucursales (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);
ALTER TABLE productos  ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
ALTER TABLE categorias ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
ALTER TABLE ventas      ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
```

## Environment Variables

See `.env.example`:

```
DATABASE_URL=sqlite:///./tizon.db   # or postgresql://... for production
SECRET_KEY=<random string>          # JWT signing key
CORS_ORIGINS=*                      # Restrict in production
```

## Deployment

- Hosted on Railway (previously Heroku). `Procfile` defines the startup command.
- Production database is Supabase (PostgreSQL).
- Tables are created automatically on startup via `Base.metadata.create_all()` — no migration tool.
