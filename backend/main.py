"""
Punto de entrada FastAPI: CORS, creación de tablas al arranque, API y frontend estático.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.auth import hash_password
from backend.core.config import FRONTEND_DIR, cors_origins
from backend.core.logger import logger
from backend.db.session import Base, SessionLocal, engine
from backend.models import orm as _orm  # noqa: F401 — carga modelos para metadata
from backend.models.orm import OnboardingProgress, Sucursal, Tenant, TenantBranding, Usuario
from backend.routes import (
    admin, auth, auth_v3, branding, categorias,
    onboarding, ordenes, productos, reportes,
    sucursales, usuarios, ventas,
)

FRONTEND_RUNTIME_FILES = (
    ("index_html", "index.html"),
    ("admin_html", "admin.html"),
    ("login_html", "login.html"),
    ("register_html", "register.html"),
    ("main_css", "css/main.css"),
    ("logo_new", "assets/zafiro-logo-new.png"),
    ("logo_svg", "assets/zafiro-logo.svg"),
)


def _frontend_runtime_status() -> dict:
    frontend_dir = str(FRONTEND_DIR)
    files = {}
    for key, relative_path in FRONTEND_RUNTIME_FILES:
        path = os.path.join(frontend_dir, *relative_path.split("/"))
        exists = os.path.exists(path)
        files[key] = {
            "relative_path": relative_path,
            "path": path,
            "exists": exists,
            "size": os.path.getsize(path) if exists and os.path.isfile(path) else None,
        }

    dirs = {}
    for key, relative_path in (("css", "css"), ("js", "js"), ("assets", "assets")):
        path = os.path.join(frontend_dir, relative_path)
        dirs[key] = {
            "path": path,
            "exists": os.path.isdir(path),
        }

    return {
        "cwd": os.getcwd(),
        "frontend_dir": frontend_dir,
        "frontend_dir_exists": os.path.isdir(frontend_dir),
        "files": files,
        "dirs": dirs,
    }


def _log_frontend_runtime_status() -> None:
    status = _frontend_runtime_status()
    logger.info(
        "Frontend runtime: cwd=%s frontend_dir=%s exists=%s",
        status["cwd"],
        status["frontend_dir"],
        status["frontend_dir_exists"],
    )
    for key, item in status["files"].items():
        logger.info(
            "Frontend file %s: exists=%s size=%s path=%s",
            key,
            item["exists"],
            item["size"],
            item["path"],
        )


def _seed_admin() -> None:
    """Crea el primer usuario admin si no existe ninguno, usando ADMIN_EMAIL y ADMIN_PASSWORD.

    El email se normaliza a minúsculas para coincidir con la normalización del login
    (`auth_v3.login` hace `.strip().lower()` antes de buscar).
    """
    admin_email    = os.getenv("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not admin_email or not admin_password:
        return
    db = SessionLocal()
    try:
        exists = db.query(Tenant).filter(Tenant.es_admin == True).first()  # noqa: E712
        if exists:
            return
        admin_user = Tenant(
            email         = admin_email,
            password_hash = hash_password(admin_password),
            nombre        = "Super Admin",
            plan          = "admin",
            es_admin      = True,
            plan_activo   = True,
        )
        db.add(admin_user)
        db.commit()
        logger.info(f"Usuario admin creado: {admin_email}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error al crear usuario admin: {e}")
    finally:
        db.close()


def _backfill_tenants_v3() -> None:
    """Migración idempotente: crea branding/onboarding/usuario-owner para tenants existentes.

    Se ejecuta en cada arranque. Solo crea los registros faltantes (idempotente).
    """
    db = SessionLocal()
    try:
        tenants = db.query(Tenant).all()
        creados = 0
        for t in tenants:
            # 1) Branding default
            if not db.query(TenantBranding).filter_by(tenant_id=t.id).first():
                db.add(TenantBranding(
                    tenant_id        = t.id,
                    nombre_comercial = t.nombre or t.email.split("@")[0],
                    nicho            = "restaurante",
                ))
                creados += 1
            # 2) Onboarding progress — si es admin, lo marcamos como completado
            if not db.query(OnboardingProgress).filter_by(tenant_id=t.id).first():
                op = OnboardingProgress(tenant_id=t.id)
                if t.es_admin:
                    op.perfil_configurado = True
                    op.primer_producto    = True
                    op.primera_venta      = True
                    op.saltado            = True
                db.add(op)
            # 3) Sucursal default "Principal" si no tiene ninguna (solo tenants no-admin)
            sucursal_default_id = None
            if not t.es_admin:
                sucursal_existente = db.query(Sucursal).filter_by(
                    tenant_id=t.id, activo=True
                ).first()
                if sucursal_existente:
                    sucursal_default_id = sucursal_existente.id
                else:
                    s = Sucursal(tenant_id=t.id, nombre="Principal")
                    db.add(s)
                    db.flush()
                    sucursal_default_id = s.id

            # 4) Usuario owner/super_admin asociado
            rol_default = "super_admin" if t.es_admin else "owner"
            exists = db.query(Usuario).filter_by(tenant_id=t.id, email=t.email).first()
            if not exists:
                db.add(Usuario(
                    tenant_id     = t.id,
                    email         = t.email,
                    password_hash = t.password_hash,
                    nombre        = t.nombre or "Propietario",
                    rol           = rol_default,
                    sucursal_id   = sucursal_default_id,
                    activo        = True,
                ))
            elif not exists.sucursal_id and sucursal_default_id:
                # Asignar sucursal si el owner ya existía pero sin sucursal
                exists.sucursal_id = sucursal_default_id
        db.commit()
        if creados:
            logger.info(f"Backfill v3: creados registros de branding/onboarding/usuario para {creados} tenants")
    except Exception as e:
        db.rollback()
        logger.error(f"Error en backfill v3: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea tablas si no existen (SQLite crea tizon.db; PostgreSQL usa el schema configurado)."""
    logger.info("Iniciando aplicación Tizón POS")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos verificadas/creadas exitosamente")
        _seed_admin()
        _backfill_tenants_v3()
        _log_frontend_runtime_status()
    except Exception as e:
        logger.error(f"Error al crear tablas: {e}")
        raise
    
    yield
    
    logger.info("Cerrando aplicación Tizón POS")


app = FastAPI(
    title="Zafiro POS API",
    description="POS White-Label Multi-tenant — Zafiro v3",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache_static(request, call_next):
    """Evita cache agresivo del navegador para assets estáticos en desarrollo.

    En producción puedes invertir esto poniendo ENV=prod y usar versionado de assets.
    """
    response = await call_next(request)
    path = request.url.path
    if path.startswith(("/css", "/js", "/assets")) or path.endswith((".html", ".js", ".css")):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.include_router(auth.router)
app.include_router(sucursales.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(ordenes.router)
app.include_router(reportes.router)
app.include_router(admin.router)
# ── v3 — Auth con roles + gestión de usuarios + branding + onboarding ─
app.include_router(auth_v3.router)
app.include_router(usuarios.router)
app.include_router(branding.router)
app.include_router(onboarding.router)

_frontend = str(FRONTEND_DIR)

app.mount("/css", StaticFiles(directory=os.path.join(_frontend, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(_frontend, "js")), name="js")
app.mount("/assets", StaticFiles(directory=os.path.join(_frontend, "assets")), name="assets")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(_frontend, "index.html"))

@app.get("/admin", include_in_schema=False)
@app.get("/admin.html", include_in_schema=False)
def serve_admin():
    return FileResponse(
        os.path.join(_frontend, "admin.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )

@app.get("/login", include_in_schema=False)
@app.get("/login.html", include_in_schema=False)
def serve_login():
    return FileResponse(
        os.path.join(_frontend, "login.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )

@app.get("/register", include_in_schema=False)
@app.get("/register.html", include_in_schema=False)
def serve_register():
    return FileResponse(
        os.path.join(_frontend, "register.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )

@app.get("/legacy", include_in_schema=False)
def serve_legacy():
    path = os.path.join(_frontend, "index-legacy.html")
    if os.path.exists(path):
        return FileResponse(path)
    return FileResponse(os.path.join(_frontend, "index.html"))

@app.get("/manifest.json", include_in_schema=False)
def serve_manifest():
    return FileResponse(os.path.join(_frontend, "manifest.json"))

@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint para monitoreo y tests."""
    return {"status": "ok", "version": "3.0.0", "service": "zafiro-pos"}


@app.get("/api/debug/static", include_in_schema=False)
def debug_static():
    return _frontend_runtime_status()
