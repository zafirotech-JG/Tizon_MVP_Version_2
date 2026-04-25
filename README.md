# Zafiro POS v3

Sistema **Punto de Venta white-label multi-tenant** para restaurantes y retail, con **branding personalizable por negocio**, **multi-sucursal**, **roles (owner / manager / cajero / inventario)** y **onboarding gamificado**.

Backend en **FastAPI** (Python 3.10+) y frontend SPA en **JavaScript modular ES6** sin build step. La app se sirve desde un único proceso.

---

## Características principales

- **POS con carrito**, métodos de pago, atajos de teclado (F1, F2, ESC) y onboarding por rol
- **White-label**: cada tenant configura su logo, nombre comercial y paleta de colores
- **Multi-sucursal e inventario por sede**, con gestión de productos y categorías
- **Multi-usuario por tenant** con roles diferenciados:
  - `owner` — propietario del negocio (acceso total)
  - `manager` — administrador con todo excepto eliminación de cuenta
  - `cajero` — solo POS y consulta de productos
  - `inventario` — gestión de productos y stock
- **Reportes diarios** del cierre de caja (totales, productos top, métodos de pago)
- **Mini-tutoriales contextuales** por vista (POS, dashboard, inventario, equipo, ajustes)
- **Checklist de onboarding** con FAB de progreso para owners
- **Auto-refresh proactivo** del JWT (renueva antes de expirar para evitar logouts)
- **Panel super admin** en `/admin` (gestión global de tenants)

---

## Estructura del proyecto

```
Tizon_MVP_Version_2/
├── backend/
│   ├── main.py              # App FastAPI: lifespan, CORS, no-cache middleware,
│   │                        # routers, mounts estáticos
│   ├── auth.py              # JWT, hash de contraseñas, get_current_user
│   ├── core/
│   │   ├── config.py        # PROJECT_ROOT, FRONTEND_DIR, CORS, env vars
│   │   └── logger.py        # Logging centralizado
│   ├── db/
│   │   └── session.py       # Engine SQLAlchemy, Base, SessionLocal, get_db
│   ├── models/
│   │   ├── orm.py           # Tenant, Sucursal, Usuario, Producto, Categoria,
│   │   │                    # Venta, Orden, TenantBranding, OnboardingProgress
│   │   └── __init__.py
│   ├── schemas/
│   │   └── api.py           # Schemas Pydantic
│   └── routes/              # Un router por dominio
│       ├── auth.py          # Registro/login (compat v2)
│       ├── auth_v3.py       # Auth con roles + /me + refresh tokens
│       ├── admin.py         # Super admin
│       ├── usuarios.py      # CRUD del equipo del tenant
│       ├── branding.py      # Branding (público + autenticado)
│       ├── onboarding.py    # Progreso de onboarding por tenant
│       ├── sucursales.py
│       ├── productos.py
│       ├── categorias.py
│       ├── ventas.py        # Ventas (legacy, todavía soportado)
│       ├── ordenes.py       # Órdenes (flujo principal de checkout)
│       └── reportes.py
├── frontend/
│   ├── index.html           # SPA shell + loading/error UI
│   ├── login.html           # Login
│   ├── register.html        # Registro de negocio
│   ├── admin.html           # Panel super admin
│   ├── manifest.json        # PWA manifest
│   ├── css/
│   │   ├── main.css         # Entry point — importa todo lo demás
│   │   ├── core/            # variables.css, reset.css, utilities.css
│   │   ├── layouts/         # master.css (sidebar, top-header, page-content)
│   │   ├── components/      # buttons, cards, forms, app-ui, combobox, tutorial
│   │   ├── themes/          # dark.css, light.css
│   │   └── views/           # cajero.css, admin.css
│   └── js/
│       ├── core/
│       │   ├── api-client.js     # Fetch wrapper, auto-refresh JWT, ZafiroAPI.*
│       │   ├── app-shell.js      # Layout, sidebar, routing, mobile-menu
│       │   ├── ui.js             # toast/modal/confirm/prompt + onMount
│       │   ├── combobox.js       # <select> custom con búsqueda
│       │   ├── tutorial-manager.js  # Mini-tours por vista (driver.js)
│       │   └── onboarding.js     # Checklist + FAB de progreso
│       └── views/
│           ├── pos.js            # Punto de venta (catálogo + carrito)
│           ├── dashboard.js      # Métricas + reporte del día
│           ├── inventario.js     # Productos + categorías
│           ├── usuarios.js       # Equipo (CRUD usuarios)
│           └── config.js         # Branding + sucursales + datos del negocio
├── scripts/                 # Utilidades de desarrollo
│   ├── test_dev.py          # Suite de tests funcionales (53 tests)
│   ├── check_css_vars.ps1   # Detector de variables CSS huérfanas
│   └── README.md
├── data/                    # SQLite local (gitignored)
├── logs/                    # Logs (gitignored)
├── docs/                    # Documentación adicional
├── requirements.txt
├── Procfile                 # Despliegue
├── .env.example
└── README.md
```

**Capas backend:** `core` (config) → `db` (sesión) → `models.orm` (datos) → `schemas` (validación) → `routes` (endpoints).

**Capas frontend:** `core/api-client` (red) → `core/app-shell` (layout/router) → `core/ui` (modales/toasts) → `views/*` (CRUD por dominio).

---

## Cómo ejecutar el proyecto en local

### Requisitos previos

- **Python 3.10+** (en Windows: `py --version`)
- **pip** (incluido con Python)
- Navegador moderno (Chrome, Edge, Firefox)

### Pasos exactos (Windows / PowerShell)

```powershell
# 1) Clonar el repo y entrar
git clone https://github.com/zafirotech-JG/Tizon_MVP_Version_2.git
cd Tizon_MVP_Version_2

# 2) Crear entorno virtual e instalar dependencias
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3) Variables de entorno (la primera vez)
copy .env.example .env
# Edita .env y pon un SECRET_KEY propio (cualquier string largo)

# 4) Arrancar el servidor (puerto 8000 explícito + autoreload)
py -3 -m uvicorn backend.main:app --reload --port 8000
```

### Pasos exactos (macOS / Linux / WSL)

```bash
git clone https://github.com/zafirotech-JG/Tizon_MVP_Version_2.git
cd Tizon_MVP_Version_2

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edita .env y define SECRET_KEY

python3 -m uvicorn backend.main:app --reload --port 8000
```

### URLs disponibles

Una vez arranque verás `INFO: Uvicorn running on http://127.0.0.1:8000`. Abre:

| Ruta | Descripción |
|------|-------------|
| `http://localhost:8000` | App POS principal (login → SPA) |
| `http://localhost:8000/login` | Pantalla de login |
| `http://localhost:8000/register` | Registro de un nuevo negocio |
| `http://localhost:8000/admin` | Panel super admin (requiere `es_admin=true`) |
| `http://localhost:8000/docs` | Documentación interactiva de la API |
| `http://localhost:8000/api/health` | Health check JSON |

> **Nota:** el frontend se sirve desde el mismo proceso FastAPI. No hay que correr ningún `npm run dev` ni servidor adicional.

### 🛠️ Guía rápida de comandos

| Acción | Comando | Qué hace cada parte |
|---|---|---|
| **Arrancar servidor (dev)** | `py -3 -m uvicorn backend.main:app --reload --port 8000` | `py -3` → lanza Python 3 en Windows (en Linux/Mac: `python3`) · `-m uvicorn` → ejecuta el módulo Uvicorn (servidor ASGI) · `backend.main:app` → apunta al objeto `app = FastAPI()` dentro de `backend/main.py` · `--reload` → recarga código al guardar archivos · `--port 8000` → puerto TCP donde escuchar |
| **Detener servidor** | `Ctrl + C` | En la terminal donde corre Uvicorn. Envía SIGINT y cierra conexiones gracefully |
| **Cambiar puerto** | `... --port 3000` | Sustituye `8000` por cualquier puerto libre (3000, 5000, 8080…) |
| **Forzar matar puerto ocupado (Win)** | `Get-NetTCPConnection -LocalPort 8000 \| Stop-Process -Id $_.OwningProcess -Force` | Busca el PID que tiene el puerto 8000 y lo termina. Útil cuando un Uvicorn anterior quedó colgado |
| **Forzar matar puerto (Linux/Mac)** | `lsof -ti:8000 \| xargs kill -9` | Equivalente para Unix |
| **Ver qué usa el puerto (Win)** | `netstat -ano \| findstr :8000` | Muestra el PID del proceso que tiene el puerto |
| **Refrescar navegador** | `Ctrl + Shift + R` o `Ctrl + F5` | Hard refresh: ignora caché y descarga todo de nuevo. Equivalente Mac: `Cmd + Shift + R` |
| **Acceder desde otra máquina** | `... --host 0.0.0.0 --port 8000` | Bind a todas las interfaces de red (LAN/WiFi). Útil para probar desde el móvil en la misma red |
| **Logs verbose** | `... --log-level debug` | Uvicorn imprime cada request, headers y errores con stacktrace completo |
| **Tests funcionales** | `py -3 scripts\test_dev.py` | Corre 53 tests E2E contra el servidor que esté en `:8000` |
| **Auditoría CSS** | `powershell -ExecutionPolicy Bypass -File scripts\check_css_vars.ps1` | Detecta variables CSS huérfanas (definidas pero no usadas) |

#### Snippet PowerShell — arrancar limpio (libera puerto si está ocupado)

```powershell
# 1) Liberar puerto 8000 si quedó colgado
$pids = (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue).OwningProcess | Sort-Object -Unique
foreach ($p in $pids) { try { Stop-Process -Id $p -Force; Write-Host "Killed PID $p" } catch {} }

# 2) Activar venv
.venv\Scripts\Activate.ps1

# 3) Arrancar
py -3 -m uvicorn backend.main:app --reload --port 8000
```

### ⚠️ Si no ves los cambios después de modificar el frontend

El backend ya envía `Cache-Control: no-cache` para `/css`, `/js`, `/assets` y `.html`, pero si el navegador cacheó algo previo:

- **Chrome/Edge:** `Ctrl + F5` o `Ctrl + Shift + R`
- **DevTools abierto:** click derecho sobre el botón de recarga → **"Vaciar caché y recargar"**
- **Modo incógnito** garantiza no usar caché en absoluto

---

## Usuarios y contraseñas

**No hay usuarios preconfigurados.** Cada negocio es un **tenant** que se crea al registrarse.

### 1. Crear el primer tenant (negocio + propietario)

1. Abre `http://localhost:8000/register`
2. Completa: nombre del negocio, email, nombre del propietario, contraseña (mín. 6 caracteres)
3. El sistema crea automáticamente:
   - El tenant
   - Un usuario `owner` con tu nombre/email
   - Un branding default
   - Una sucursal "Principal"
   - El registro de progreso de onboarding
4. Quedas autenticado y puedes empezar a usar la app

### 2. Invitar miembros del equipo (otros usuarios)

Desde el rol owner/manager: **Equipo → Nuevo usuario** → define rol (`manager`, `cajero` o `inventario`), email, contraseña y opcionalmente PIN para login rápido en POS.

### 3. Promover a super administrador (`/admin`)

`/admin` requiere `es_admin = true` en la columna del tenant. Para promover tu cuenta:

```bash
sqlite3 data/zafiro.db
```

```sql
UPDATE tenants SET es_admin = 1 WHERE email = 'tu@correo.com';
.quit
```

Después entra en `http://localhost:8000/admin` con tus credenciales normales.

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `DATABASE_URL` | SQLite local o PostgreSQL en producción | `sqlite:///./data/zafiro.db` |
| `SECRET_KEY` | Firma de los JWT — **obligatorio cambiar** en producción | — |
| `CORS_ORIGINS` | Orígenes permitidos (CSV) o `*` en dev | `*` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | (opcional) Crea un super admin al primer arranque | — |

---

## Tests

La suite `scripts/test_dev.py` ejecuta **53 tests funcionales** end-to-end contra el servidor (registro, login, /me, refresh, branding, onboarding, sucursales, productos, ordenes, reportes, usuarios y seguridad).

```bash
# 1) Servidor corriendo en otra terminal
py -3 -m uvicorn backend.main:app --port 8000

# 2) Tests
py -3 scripts\test_dev.py
```

Salida esperada: `Resultado: TODO OK` con `Passed: 53`.

---

## Stack y decisiones de diseño

- **Backend:** FastAPI + SQLAlchemy + Pydantic v2 + JWT (PyJWT) + bcrypt
- **Frontend:** ES6 modules nativos, **sin bundler**. Tailwind/shadcn NO se usan; en su lugar:
  - CSS variables propias (`/css/core/variables.css`) con paleta cool-neutral + Zafiro blue
  - Custom comboboxes (sin libs externas) con búsqueda integrada
  - Phosphor Icons vía CDN
  - Driver.js para los mini-tutoriales (vía CDN)
  - Chart.js para reportes (vía CDN)
- **PWA:** manifest.json + theme-color + apple-touch-icon
- **Mobile-first:** sidebar se transforma en bottom-nav en `<1024px`, con menú deslizable
- **Multi-tenant:** todo el aislamiento por `tenant_id` en backend; el frontend obtiene el branding tras login y aplica los CSS variables del tenant
- **Cache-busting en dev:** middleware que envía `no-cache` para `/css`, `/js`, `/assets`, `.html`

---

## Despliegue

`Procfile`:

```
web: uvicorn backend.main:app --host=0.0.0.0 --port=${PORT:-8000} --proxy-headers
```

Configura `DATABASE_URL` (PostgreSQL en producción), `SECRET_KEY` (random largo), y `CORS_ORIGINS` (lista del dominio frontend) en tu plataforma.

---

## Licencia

Propietario — **ZafiroTech**. Todos los derechos reservados.
