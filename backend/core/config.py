"""
Configuración cargada desde el entorno (.env en la raíz del proyecto).
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Raíz del repo (directorio que contiene /backend y /frontend)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tizon.db")
SECRET_KEY   = os.getenv("SECRET_KEY",   "cambia-este-secreto-en-produccion")
ADMIN_PIN    = os.getenv("ADMIN_PIN",    "1234")

CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "*")

FRONTEND_DIR = PROJECT_ROOT / "frontend"


def cors_origins() -> list[str]:
    if not CORS_ORIGINS_STR:
        return ["*"]
    return [o.strip() for o in CORS_ORIGINS_STR.split(",") if o.strip()]
