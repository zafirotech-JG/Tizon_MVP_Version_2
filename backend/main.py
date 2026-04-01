"""
Punto de entrada FastAPI: CORS, creación de tablas al arranque, API y frontend estático.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.core.config import FRONTEND_DIR, cors_origins
from backend.core.logger import logger
from backend.db.session import Base, engine
from backend.models import orm as _orm  # noqa: F401 — carga modelos para metadata
from backend.routes import admin, auth, categorias, productos, reportes, sucursales, ventas


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea tablas si no existen (SQLite crea tizon.db; PostgreSQL usa el schema configurado)."""
    logger.info("Iniciando aplicación Tizón POS")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Tablas de base de datos verificadas/creadas exitosamente")
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

# ¡CORS CONFIGURADO DIRECTAMENTE (A PRUEBA DE FALLOS)!
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tizonmvpversion2-production.up.railway.app",
        "http://localhost:8000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sucursales.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(reportes.router)
app.include_router(admin.router)

_frontend = str(FRONTEND_DIR)

app.mount("/css", StaticFiles(directory=os.path.join(_frontend, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(_frontend, "js")), name="js")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(_frontend, "index.html"))


@app.get("/admin", include_in_schema=False)
def serve_admin():
    return FileResponse(os.path.join(_frontend, "admin.html"))
