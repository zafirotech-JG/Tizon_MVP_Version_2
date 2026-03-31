# Tizón POS - Project Structure

## Overview
This document describes the organized structure of the Tizón POS project after cleanup and reorganization.

## Directory Structure

```
Tizon_MVP_Version_2/
├── backend/                 # Backend application (FastAPI)
│   ├── core/               # Core configuration
│   ├── db/                 # Database session management
│   ├── models/             # ORM models
│   ├── routes/             # API endpoints
│   └── schemas/            # Pydantic schemas
├── frontend/               # Frontend application (HTML/JS/CSS)
│   ├── css/               # Stylesheets
│   └── js/                # JavaScript modules
├── scripts/                # Development and maintenance utilities
├── data/                   # Database backups (gitignored)
├── logs/                   # Application logs (gitignored)
├── docs/                   # Additional documentation
├── .venv/                  # Python virtual environment (gitignored)
└── Configuration files

```

## Key Directories

### `/backend`
Contains all server-side code:
- **core/**: Configuration and environment variables
- **db/**: SQLAlchemy session management
- **models/**: Database ORM models (Tenant, Sucursal, Producto, etc.)
- **routes/**: API route handlers organized by domain
- **schemas/**: Pydantic models for request/response validation

### `/frontend`
Static files served by FastAPI:
- **css/**: Application styles
- **js/**: Client-side JavaScript modules
- **index.html**: Main POS interface
- **admin.html**: Admin panel

### `/scripts`
Development utilities (not for production):
- `migrate.py`: Database migration helper
- `append_css.py`, `append_css2.py`: CSS utilities
- `replace.py`, `replace_js.py`: Code refactoring tools

### `/data`
Database backup files (excluded from version control)

### `/logs`
Application log files (excluded from version control)

### `/docs`
Additional project documentation

## Files Excluded from Git

The following are automatically ignored (see `.gitignore`):
- `.env` - Environment variables
- `__pycache__/` - Python bytecode cache
- `*.pyc` - Compiled Python files
- `.venv/`, `venv/` - Virtual environments
- `data/` - Database backups
- `logs/` - Log files
- `*.db`, `*.db-journal` - Database files
- IDE and OS-specific files

## Clean Project Practices

1. **Database files**: Keep only `tizon.db` in root for development; backups go in `/data`
2. **Logs**: All log files should be written to `/logs` directory
3. **Scripts**: Development utilities belong in `/scripts` with documentation
4. **Cache files**: Regularly clean `__pycache__` directories (already gitignored)
5. **Documentation**: Additional docs go in `/docs` directory

## Running the Project

From the project root:
```bash
# Activate virtual environment
.venv\Scripts\activate

# Run the server
python -m uvicorn backend.main:app --reload
```

## Maintenance

To clean temporary files:
```powershell
# Remove all __pycache__ directories
Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force

# Remove .pyc files
Get-ChildItem -Path . -Recurse -Filter "*.pyc" | Remove-Item -Force
```
