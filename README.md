# Tizón POS

Sistema de Punto de Venta multi-tenant para asaderos y restaurantes — **FastAPI** en el backend y **JavaScript** en el frontend (sin build).

### Características principales

- POS con carrito, métodos de pago y recibo imprimible  
- Multi-sucursal e inventario por sede  
- Reportes y cierre de caja  
- Panel super admin en `/admin` (gestión de tenants y suscripciones)  

---

## Estructura del proyecto

```
Tizon_MVP_Version_2/
├── backend/
│   ├── main.py              # App FastAPI: tablas al arranque, CORS, routers, estáticos
│   ├── auth.py              # JWT, hash de contraseñas, dependencia get_current_user
│   ├── core/
│   │   └── config.py        # Variables de entorno y rutas (PROJECT_ROOT, FRONTEND_DIR, CORS)
│   ├── db/
│   │   └── session.py       # Engine SQLAlchemy, Base, SessionLocal, get_db
│   ├── models/
│   │   ├── orm.py           # Tablas: Tenant, Sucursal, Producto, Categoria, Venta
│   │   └── __init__.py      # Reexporta modelos ORM
│   ├── schemas/
│   │   ├── api.py           # Schemas Pydantic (requests/responses)
│   │   └── __init__.py
│   └── routes/              # Un router por dominio de API
│       ├── auth.py          # Registro e inicio de sesión (tenants)
│       ├── admin.py         # Super admin: listado y gestión de tenants
│       ├── sucursales.py
│       ├── productos.py
│       ├── categorias.py
│       ├── ventas.py
│       └── reportes.py
├── frontend/
│   ├── index.html           # SPA principal (POS)
│   ├── admin.html           # Panel super administrador
│   ├── css/styles.css
│   └── js/                  # app.js, api.js, auth.js, pos.js, etc.
├── scripts/                 # Utilidades de desarrollo y mantenimiento
│   ├── migrate.py
│   ├── append_css.py
│   ├── append_css2.py
│   ├── replace.py
│   ├── replace_js.py
│   └── README.md
├── data/                    # Archivos de base de datos (gitignored)
│   └── *.db backups
├── logs/                    # Archivos de log (gitignored)
│   └── *.log
├── docs/                    # Documentación adicional
│   └── CLAUDE.md
├── requirements.txt
├── Procfile                 # Despliegue (p. ej. Railway)
├── .env.example             # Plantilla de variables (copiar a .env)
├── .gitignore               # Archivos y directorios ignorados por Git
└── README.md
```

**Capas:** `core` (configuración) → `db` (sesión y `Base`) → `models.orm` (datos) → `schemas` (validación API) → `routes` (endpoints).

---

## Cómo ejecutar el proyecto

### Requisitos

- Python 3.10 o superior  
- `pip`

### Pasos

1. **Clonar e ir al directorio del repo**

   ```bash
   git clone https://github.com/zafirotech-JG/Tizon_MVP_Version_2.git
   cd Tizon_MVP_Version_2
   ```

2. **Entorno virtual e instalación**

   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Variables de entorno**

   ```bash
   copy .env.example .env
   ```

   Edita `.env` y define al menos un **`SECRET_KEY`** propio (en producción nunca uses el valor de ejemplo). Para desarrollo local con SQLite puedes dejar `DATABASE_URL=sqlite:///./tizon.db`.

4. **Arrancar el servidor** (desde la raíz del repo, donde está `backend/`)

   ```bash
   python -m uvicorn backend.main:app --reload
   ```

5. **Abrir en el navegador**

   - Aplicación POS: [http://localhost:8000](http://localhost:8000)  
   - Documentación API: [http://localhost:8000/docs](http://localhost:8000/docs)

El frontend se sirve desde el mismo proceso FastAPI; no hace falta otro servidor ni paso de build.

---

## Usuarios y contraseñas

El sistema **no trae usuarios ni contraseñas por defecto**. Cada cuenta de negocio es un **tenant** en la tabla `tenants` (correo + contraseña hasheada).

### 1. Usuario de restaurante (POS)

1. En [http://localhost:8000](http://localhost:8000) elige **Registrarse** y crea una cuenta (correo, nombre y contraseña; mínimo 6 caracteres).  
2. Tras registrarte quedas autenticado; puedes crear sucursales, productos y usar el POS.  
3. En siguientes visitas usa **Iniciar sesión** con el **mismo correo y contraseña**.

Las credenciales son las que **tú definiste** al registrarte; no hay un usuario demo fijo en el código.

### 2. Super administrador (`/admin`)

El panel [http://localhost:8000/admin](http://localhost:8000/admin) solo acepta cuentas con el flag **`es_admin = true`** en la base de datos.

1. **Primero** crea un usuario normal con el registro del paso anterior (mismo correo y contraseña que usarás después).  
2. **Marca ese usuario como admin** en la base de datos, por ejemplo con SQLite:

   ```bash
   sqlite3 tizon.db
   ```

   ```sql
   UPDATE tenants SET es_admin = 1 WHERE email = 'tu@correo.com';
   .quit
   ```

3. Entra en [http://localhost:8000/admin](http://localhost:8000/admin) e inicia sesión con **el mismo correo y contraseña** del registro. El backend usa `POST /api/admin/login`, que exige `es_admin` y las mismas credenciales almacenadas para ese tenant.

**Resumen:** no existen contraseñas preconfiguradas en el repositorio; el flujo es **registro → (opcional) promover a admin en BD → login** según la pantalla (POS o panel admin).

---

## Variables de entorno

| Variable        | Descripción |
|----------------|-------------|
| `DATABASE_URL` | SQLite local o cadena PostgreSQL en producción |
| `SECRET_KEY`   | Firma de los JWT — debe ser secreta y estable |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma, o `*` en desarrollo |

---

## Despliegue

El `Procfile` ejecuta:

`uvicorn backend.main:app --host=0.0.0.0 --port=${PORT:-8000} --proxy-headers`

Configura las mismas variables de entorno en tu plataforma (Railway, etc.) y usa PostgreSQL en producción si aplica.

---

## Licencia

Propietario — ZafiroTech. Todos los derechos reservados.
