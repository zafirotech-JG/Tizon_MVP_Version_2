"""
routes/auth.py — Login y registro de tenants (JWT)
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.logger import logger
from backend.db.session import get_db
from backend.models.orm import Tenant
from backend.schemas import LoginRequest, RegisterRequest, RegisterResponse, TokenResponse
from backend.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.username.strip()
    tenant = db.query(Tenant).filter(Tenant.email == email).first()
    if not tenant or not tenant.activo:
        logger.warning(f"Intento de login fallido: usuario no encontrado o inactivo - {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    if not verify_password(data.password, tenant.password_hash):
        logger.warning(f"Intento de login fallido: contraseña incorrecta - {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    if not tenant.plan_activo:
        logger.warning(f"Intento de login con cuenta suspendida - {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta suspendida. Contacta soporte.",
        )
    if tenant.fecha_vencimiento and tenant.fecha_vencimiento < datetime.utcnow():
        logger.warning(f"Intento de login con suscripción vencida - {email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Suscripción vencida. Contacta soporte.",
        )
    logger.info(f"Login exitoso - {email}")
    token = create_access_token(email=tenant.email, tenant_id=tenant.id, es_admin=tenant.es_admin)
    return TokenResponse(access_token=token, nombre=tenant.nombre, es_admin=tenant.es_admin)


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.strip()
    nombre = data.nombre.strip()
    if not email or not nombre or len(data.password) < 6:
        logger.warning(f"Intento de registro con datos inválidos - {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datos inválidos: campos requeridos o contraseña muy corta (mín. 6 chars)",
        )
    if len(data.password) > 72:
        logger.warning(f"Intento de registro con contraseña muy larga - {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña no puede superar 72 caracteres",
        )
    if db.query(Tenant).filter(Tenant.email == email).first():
        logger.warning(f"Intento de registro con email duplicado - {email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con ese correo",
        )
    tenant = Tenant(
        email=email,
        password_hash=hash_password(data.password),
        nombre=nombre,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    logger.info(f"Nuevo usuario registrado exitosamente - {email} (ID: {tenant.id})")
    token = create_access_token(email=tenant.email, tenant_id=tenant.id, es_admin=tenant.es_admin)
    return RegisterResponse(access_token=token, nombre=tenant.nombre, es_admin=tenant.es_admin)
