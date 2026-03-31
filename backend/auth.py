"""
auth.py — JWT creation & verification
Mantiene HTTPBearer igual que el original.
Cambios respecto al original:
  - create_access_token ahora recibe tenant_id además de subject
  - get_current_user ahora retorna dict {email, tenant_id} en vez de str
    para que las rutas puedan leer el tenant_id del usuario autenticado
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt

from backend.core.config import SECRET_KEY
ALGORITHM                 = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8   # duración de una jornada laboral

bearer_scheme = HTTPBearer(auto_error=False)   # igual que el original

# ── Helpers de contraseña ────────────────────────────────────────────────
def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        return False

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ── Token ────────────────────────────────────────────────────────────────
def create_access_token(email: str, tenant_id: int, es_admin: bool = False) -> str:
    """
    Genera JWT firmado con expiración.
    Incluye tenant_id para que cada ruta sepa qué datos puede ver.
    """
    expire  = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub":       email,
        "tenant_id": tenant_id,
        "es_admin":  es_admin,
        "exp":       expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── Dependency FastAPI ────────────────────────────────────────────────────
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """
    Valida el JWT y retorna {"email": str, "tenant_id": int}.
    Retorna dict en vez del str original porque las rutas
    necesitan el tenant_id para filtrar sus propios datos.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado. Inicia sesión nuevamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload   = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email     = payload.get("sub", "")
        tenant_id = payload.get("tenant_id")

        if not email or tenant_id is None:
            raise unauthorized

        return {
            "email":     email,
            "tenant_id": int(tenant_id),
            "es_admin":  bool(payload.get("es_admin", False)),
        }

    except JWTError:
        raise unauthorized
