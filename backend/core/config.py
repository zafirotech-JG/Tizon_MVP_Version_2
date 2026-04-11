"""
Configuración cargada desde el entorno (.env en la raíz del proyecto).
"""
from __future__ import annotations

import os
import secrets
import warnings
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Raíz del repo (directorio que contiene /backend y /frontend)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tizon.db")

# ── Security — fail loudly if defaults are used ──────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY.startswith("cambia"):
    SECRET_KEY = secrets.token_hex(32)
    warnings.warn(
        "⚠️  SECRET_KEY no configurado. Se generó uno temporal. "
        "Configura SECRET_KEY en .env para producción.",
        stacklevel=2,
    )

ADMIN_PIN = os.getenv("ADMIN_PIN", "")
if not ADMIN_PIN or ADMIN_PIN == "1234":
    warnings.warn(
        "⚠️  ADMIN_PIN no configurado o es '1234'. "
        "Cámbialo en .env antes de producción.",
        stacklevel=2,
    )
    if not ADMIN_PIN:
        ADMIN_PIN = "1234"

CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "")

FRONTEND_DIR = PROJECT_ROOT / "frontend"


def cors_origins() -> list[str]:
    if not CORS_ORIGINS_STR or CORS_ORIGINS_STR.strip() == "*":
        return ["*"]
    return [o.strip() for o in CORS_ORIGINS_STR.split(",") if o.strip()]
