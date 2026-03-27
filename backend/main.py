"""
main.py — Tizón POS · FastAPI app principal
Cambios respecto al original:
  - Agrega evento startup que crea las tablas SQL si no existen
  - Elimina la importación de sheets (ya no se usa)
  - Todo lo demás (CORS, static files, rutas) es idéntico
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import engine
from backend import models_db                          # para crear tablas
from backend.routes import auth, productos, ventas, reportes, categorias, sucursales, admin

app = FastAPI(
    title="Tizón POS API",
    description="Sistema de Punto de Venta para Asadero Colombiano — Multi-tenant",
    version="2.0.0",
)


# ── Crear tablas al arrancar ─────────────────────────────────────────────
@app.on_event("startup")
def startup():
    """
    Crea todas las tablas definidas en models_db.py si no existen.
    En SQLite esto crea el archivo tizon.db automáticamente.
    En PostgreSQL crea las tablas en el schema public.
    """
    models_db.Base.metadata.create_all(bind=engine)


# ── CORS ─────────────────────────────────────────────────────────────────
cors_origins_str = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins_str.split(",")] if cors_origins_str else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins     = origins,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Rutas API ─────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(sucursales.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(reportes.router)
app.include_router(admin.router)


# ── Archivos estáticos (frontend) ─────────────────────────────────────────
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)

app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js",  StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")),  name="js")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/admin", include_in_schema=False)
def serve_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin.html"))
