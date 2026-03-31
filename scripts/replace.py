import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = [
    ("🔥 Tizón", "<i data-lucide=\"flame\" class=\"icon-sm\"></i> Tizón"),
    ('title="Cerrar Sesión">🚪', 'title="Cerrar Sesión"><i data-lucide="log-out" class="icon-sm"></i>'),
    ("<h1>🔥", "<h1><i data-lucide=\"flame\" class=\"icon-md\"></i>"),
    ('title="Gestionar sucursales">⚙️', 'title="Gestionar sucursales"><i data-lucide="settings" class="icon-sm"></i>'),
    ('<span class="icon">🛒</span><span>Punto de Venta', '<span class="icon"><i data-lucide="shopping-cart"></i></span><span>Punto de Venta'),
    ('<span class="icon">📦</span><span>Inventario', '<span class="icon"><i data-lucide="package"></i></span><span>Inventario'),
    ('<span class="icon">📊</span><span>Dashboard', '<span class="icon"><i data-lucide="layout-dashboard"></i></span><span>Dashboard'),
    ('🚪 Salir', '<i data-lucide="log-out" class="icon-sm"></i> Salir'),
    ('🛒 Ver Carrito', '<i data-lucide="shopping-cart" class="icon-sm"></i> Ver Carrito'),
    (' placeholder="🔍 Buscar', ' placeholder=" Buscar'),
    ('<h3>🛒 Resumen de Venta</h3>', '<h3><i data-lucide="shopping-cart" class="icon-sm"></i> Resumen de Venta</h3>'),
    ('title="Cerrar">✕</button>', 'title="Cerrar"><i data-lucide="x" class="icon-sm"></i></button>'),
    ('<span class="carrito-vacio-icon">🛒</span>', '<span class="carrito-vacio-icon"><i data-lucide="shopping-cart" style="width: 48px; height: 48px"></i></span>'),
    ('🏍️ Envío a Domicilio', '<i data-lucide="bike" class="icon-sm"></i> Envío a Domicilio'),
    ('🏍️ Domicilio', '<i data-lucide="bike" class="icon-sm"></i> Domicilio'),
    ('💰 Cobrar', '<i data-lucide="circle-dollar-sign" class="icon-sm"></i> Cobrar'),
    ('🗑️ Vaciar Carrito', '<i data-lucide="trash-2" class="icon-sm"></i> Vaciar Carrito'),
    ('💰 Total del Día', '<i data-lucide="circle-dollar-sign" class="icon-sm"></i> Total del Día'),
    ('💵 Efectivo', '<i data-lucide="banknote" class="icon-sm"></i> Efectivo'),
    ('💜 Nequi', '<i data-lucide="smartphone" class="icon-sm"></i> Nequi'),
    ('🔴 Daviplata', '<i data-lucide="smartphone" class="icon-sm"></i> Daviplata'),
    ('💳 Tarjeta', '<i data-lucide="credit-card" class="icon-sm"></i> Tarjeta'),
    ('<span class="icon">🛒</span><span>Caja', '<span class="icon"><i data-lucide="shopping-cart"></i></span><span>Caja'),
    ('<span class="icon">📦</span><span>Menú', '<span class="icon"><i data-lucide="package"></i></span><span>Menú'),
    ('<span class="icon">📊</span><span>Reportes', '<span class="icon"><i data-lucide="layout-dashboard"></i></span><span>Reportes'),
    ('<h3 class="modal-title">💰 Pasarela de Pago</h3>', '<h3 class="modal-title"><i data-lucide="circle-dollar-sign" class="icon-sm"></i> Pasarela de Pago</h3>'),
    ('✅ Registrar Venta', '<i data-lucide="check-circle" class="icon-sm"></i> Registrar Venta'),
    ('<h3 class="modal-title">⚙️ Gestionar Sucursales</h3>', '<h3 class="modal-title"><i data-lucide="settings" class="icon-sm"></i> Gestionar Sucursales</h3>'),
    ('<h3 class="modal-title">👋 ¡Bienvenido a Tizón!</h3>', '<h3 class="modal-title"><i data-lucide="hand" class="icon-sm"></i> ¡Bienvenido a Tizón!</h3>'),
    ('<script type="module" src="js/app.js"></script>', '<script src="https://unpkg.com/lucide@latest"></script>\n  <script type="module" src="js/app.js"></script>')
]

for old, new_ in replacements:
    text = text.replace(old, new_)

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

with open('frontend/admin.html', 'r', encoding='utf-8') as f:
    admin_text = f.read()

admin_replacements = [
    ("<h1>🔥", "<h1><i data-lucide=\"flame\" class=\"icon-md\"></i>"),
    ('🚪 Salir', '<i data-lucide="log-out" class="icon-sm"></i> Salir'),
    ('<script type="module" src="js/admin.js"></script>', '<script src="https://unpkg.com/lucide@latest"></script>\n  <script type="module" src="js/admin.js"></script>')
]

for old, new_ in admin_replacements:
    admin_text = admin_text.replace(old, new_)

with open('frontend/admin.html', 'w', encoding='utf-8') as f:
    f.write(admin_text)

print("Done index.html and admin.html")
