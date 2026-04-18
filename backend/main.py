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
from backend.models.orm import Tenant
from backend.routes import admin, auth, categorias, ordenes, productos, reportes, sucursales, ventas


def _seed_admin() -> None:
    """Crea el primer usuario admin si no existe ninguno, usando ADMIN_EMAIL y ADMIN_PASSWORD."""
    admin_email    = os.getenv("ADMIN_EMAIL", "").strip()
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea tablas si no existen (SQLite crea tizon.db; PostgreSQL usa el schema configurado)."""
    logger.info("Iniciando aplicación Tizón POS")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos verificadas/creadas exitosamente")
        _seed_admin()
    except Exception as e:
        logger.error(f"Error al crear tablas: {e}")
        raise
    
    yield
    
    logger.info("Cerrando aplicación Tizón POS")


app = FastAPI(
    title="Tizón POS API",
    description="Sistema de Punto de Venta para Asadero Colombiano — Multi-tenant",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sucursales.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(ordenes.router)
app.include_router(reportes.router)
app.include_router(admin.router)

_frontend = str(FRONTEND_DIR)

app.mount("/css", StaticFiles(directory=os.path.join(_frontend, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(_frontend, "js")), name="js")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(_frontend, "index.html"))

@app.get("/admin", include_in_schema=False)
@app.get("/admin.html", include_in_schema=False)
def serve_admin():
    return FileResponse(os.path.join(_frontend, "admin.html"))

@app.get("/manifest.json", include_in_schema=False)
def serve_manifest():
    return FileResponse(os.path.join(_frontend, "manifest.json"))
