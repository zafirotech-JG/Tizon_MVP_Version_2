# 🔥 Tizón POS

> Sistema de Punto de Venta multi-tenant para asaderos y restaurantes colombianos — construido con FastAPI + vanilla JS.

---

## ¿Qué es Tizón?

Tizón es un POS (Punto de Venta) SaaS diseñado específicamente para restaurantes de parrilla colombiana. Reemplaza el caos de las hojas de cálculo con un sistema web moderno, rápido y accesible desde cualquier dispositivo.

Cada restaurante tiene su propio espacio aislado, puede manejar múltiples sucursales, y el dueño tiene visibilidad total de sus ventas en tiempo real.

---

## ✨ Funcionalidades

### Para el restaurante
- 🛒 **POS con carrito multi-producto** — agrega, edita y elimina productos en segundos
- 💳 **Métodos de pago** — Efectivo, Nequi, Daviplata, Tarjeta con cálculo de cambio automático
- 🧾 **Recibo imprimible** — ticket estilo caja registradora con un clic
- 🏪 **Multi-sucursal** — maneja varias sedes desde una sola cuenta
- 📦 **Inventario** — productos y categorías con soft delete
- 🛵 **Domicilios** — recargo automático por unidad, registrado en caja
- 📊 **Cierre de caja** — reporte diario por sucursal con desglose por método de pago y gráfico de top productos

### Para el operador (super admin)
- 👑 **Panel de administración** en `/admin`
- 👥 **Gestión de clientes** — ver todos los tenants registrados
- 🔒 **Control de suscripciones** — activar, suspender, renovar (+30 días)
- ⏰ **Bloqueo automático** — el sistema corta el acceso cuando vence la suscripción

---

## 🏗️ Arquitectura

```
tizon_migrado/
├── backend/
│   ├── main.py          # App entry point, CORS, rutas, archivos estáticos
│   ├── database.py      # SQLAlchemy — auto-detecta SQLite vs PostgreSQL
│   ├── models_db.py     # ORM: Tenant, Sucursal, Producto, Categoria, Venta
│   ├── models.py        # Pydantic schemas
│   ├── auth.py          # JWT: creación, verificación, get_current_user
│   └── routes/
│       ├── auth.py      # Login, registro
│       ├── admin.py     # Super admin — gestión de tenants
│       ├── sucursales.py
│       ├── productos.py
│       ├── categorias.py
│       ├── ventas.py
│       └── reportes.py  # Cierre de caja diario
└── frontend/
    ├── index.html       # SPA principal
    ├── admin.html       # Panel super admin (standalone)
    ├── css/styles.css
    └── js/
        ├── app.js       # Router SPA + selector de sucursal
        ├── api.js       # Fetch wrapper con JWT automático
        ├── auth.js      # Login/registro UI
        ├── sucursal.js  # Estado compartido de sucursal activa
        ├── pos.js       # Carrito, pago, recibo
        ├── inventario.js
        ├── dashboard.js # Reportes y cierre de caja
        └── utils.js     # Toast, formatCOP
```

### Multi-tenancy + Multi-sucursal

Aislamiento en dos niveles:
1. **Tenant** — `tenant_id` en el JWT, cada query filtra por él
2. **Sucursal** — `sucursal_id` en cada request, productos/ventas/categorías pertenecen a una sede específica

---

## 🚀 Inicio rápido

### Requisitos
- Python 3.10+
- pip

### Instalación

```bash
# Clonar el repo
git clone https://github.com/zafirotech-JG/Tizon_MVP_Version_2.git
cd Tizon_MVP_Version_2

# Crear entorno virtual
python -m venv .venv
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # Mac/Linux

# Instalar dependencias
pip install -r requirements.txt

# Crear archivo de variables de entorno
cp .env.example .env
# Edita .env con tu SECRET_KEY

# Correr el servidor
python -m uvicorn backend.main:app --reload
```

Abre `http://localhost:8000` en el navegador.

---

## ⚙️ Variables de entorno

```env
DATABASE_URL=sqlite:///./tizon.db   # Dev local
SECRET_KEY=tu-clave-secreta-aqui    # JWT signing key — cámbiala en producción
CORS_ORIGINS=*                      # Restringir en producción
```

Para producción con Supabase:
```env
DATABASE_URL=postgresql://usuario:password@host:5432/tizon
```

---

## 🗄️ Base de datos

En desarrollo, SQLite se crea automáticamente al arrancar el servidor.

Para producción (PostgreSQL / Supabase), correr en el SQL Editor:

```sql
CREATE TABLE sucursales (
    id TEXT PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    nombre TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);
ALTER TABLE productos  ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
ALTER TABLE categorias ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
ALTER TABLE ventas      ADD COLUMN sucursal_id TEXT REFERENCES sucursales(id);
```

---

## 👑 Activar el primer super admin

```bash
# 1. Regístrate normalmente en el sistema
# 2. Abre SQLite y actualiza:
.\sqlite3.exe tizon.db
UPDATE tenants SET es_admin = 1 WHERE email = 'tu@email.com';
.quit

# 3. Accede al panel en:
#    http://localhost:8000/admin
```

---

## 🌐 Despliegue en producción

El proyecto está configurado para Railway + Supabase.

1. Sube el repo a GitHub
2. Conecta en [railway.app](https://railway.app)
3. Railway detecta el `Procfile` y despliega automáticamente
4. Agrega las variables de entorno en el panel de Railway
5. Conecta tu dominio personalizado

---

## 🛣️ Roadmap

- [ ] Período de prueba automático (15 días al registrarse)
- [ ] PWA — instalable en tablet sin App Store
- [ ] Exportar cierre de caja en CSV/PDF
- [ ] Comanda digital para cocina
- [ ] QR por mesa para pedidos del cliente
- [ ] Bot de WhatsApp para confirmación de domicilios

---

## 🧱 Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + SQLAlchemy |
| Base de datos | SQLite (dev) / PostgreSQL (prod) |
| Autenticación | JWT (python-jose + passlib bcrypt) |
| Frontend | Vanilla JS SPA |
| Despliegue | Railway + Supabase |

---

## 📄 Licencia

Propietario — ZafiroTech. Todos los derechos reservados.
