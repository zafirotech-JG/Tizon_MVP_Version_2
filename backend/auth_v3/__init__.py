"""
auth_v3 — Autenticación v3 con roles granulares + refresh tokens.

Módulo nuevo que coexiste con backend/auth.py (v2) hasta migración completa.
Expone:
  - Rol (Enum con jerarquía)
  - requiere_rol(Rol) — dependency FastAPI
  - crear_access_token, crear_refresh_token
  - get_current_usuario — lee JWT y retorna Usuario autenticado
"""
from backend.auth_v3.permissions import Rol, requiere_rol, requiere_tenant_activo
from backend.auth_v3.tokens import (
    crear_access_token,
    crear_refresh_token,
    decodificar_token,
    emitir_par_tokens,
    get_current_usuario,
)

__all__ = [
    "Rol",
    "requiere_rol",
    "requiere_tenant_activo",
    "crear_access_token",
    "crear_refresh_token",
    "decodificar_token",
    "emitir_par_tokens",
    "get_current_usuario",
]
