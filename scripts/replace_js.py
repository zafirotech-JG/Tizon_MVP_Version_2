import pathlib
import re

base_path = pathlib.Path('frontend/js')

# 1. pos.js
with open(base_path / 'pos.js', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = [
    ('<span class="carrito-vacio-icon">🛒</span>', '<span class="carrito-vacio-icon"><i data-lucide="shopping-cart" style="width: 48px; height: 48px"></i></span>'),
    ("item.cantidad === 1 ? '🗑' : '−'", "item.cantidad === 1 ? '<i data-lucide=\"trash-2\" class=\"icon-sm\"></i>' : '−'"),
    ('✅ Venta registrada —', 'Venta registrada —'),
    ('✅ Registrar Venta', '<i data-lucide="check-circle" class="icon-sm"></i> Registrar Venta'),
    ('carritoItems.innerHTML = html;', 'carritoItems.innerHTML = html;\n        if (window.lucide) window.lucide.createIcons();')
]

for old, new_ in replacements:
    text = text.replace(old, new_)

with open(base_path / 'pos.js', 'w', encoding='utf-8') as f:
    f.write(text)

# 2. inventario.js
with open(base_path / 'inventario.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('✏️', '<i data-lucide="pencil" class="icon-sm"></i>')
text = text.replace('🗑️', '<i data-lucide="trash-2" class="icon-sm"></i>')
text = text.replace('Producto actualizado ✅', 'Producto actualizado')
text = text.replace('Producto creado ✅', 'Producto creado')

# Add lucide.createIcons() after rendering table
text = re.sub(r'(tablaBody\.innerHTML = html;)', r'\1\n        if (window.lucide) window.lucide.createIcons();', text)

with open(base_path / 'inventario.js', 'w', encoding='utf-8') as f:
    f.write(text)

# 3. app.js
with open(base_path / 'app.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('>`Sucursal renombrada ✅`', '>`Sucursal renombrada`')
text = text.replace('>`Sucursal \\"${nombre}\\" creada ✅`', '>`Sucursal \\"${nombre}\\" creada`')
text = text.replace('✏️', '<i data-lucide="pencil" class="icon-sm"></i>')
text = text.replace('🗑️', '<i data-lucide="trash-2" class="icon-sm"></i>')

# Add lucide.createIcons() after rendering combos
text = re.sub(r'(selector\.innerHTML = html;)', r'\1\n        if (window.lucide) window.lucide.createIcons();', text)
text = re.sub(r'(listaAdmin\.innerHTML = html;)', r'\1\n    if (window.lucide) window.lucide.createIcons();', text)

with open(base_path / 'app.js', 'w', encoding='utf-8') as f:
    f.write(text)

# 4. utils.js (Toasts)
with open(base_path / 'utils.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Add a lucide icon to the Toast instead of just the class
# Replace the toast creation logic to inject an icon
toast_html_old = """
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
"""
toast_html_new = """
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'x-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `<i data-lucide="${iconName}" class="icon-sm"></i> <span>${msg}</span>`;
    if (window.lucide) {
        setTimeout(() => window.lucide.createIcons(), 0);
    }
"""
text = text.replace(toast_html_old, toast_html_new)

with open(base_path / 'utils.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done JS scripts")
