"""
database.py — Motor SQLAlchemy para Tizón
Usa SQLite en desarrollo. Para producción con Supabase cambia DATABASE_URL
en .env a: postgresql://user:password@host:5432/dbname
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tizon.db")

# check_same_thread solo es necesario para SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """
    Dependency de FastAPI.
    Abre una sesión por request y la cierra al terminar, aunque haya error.
    Uso: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
