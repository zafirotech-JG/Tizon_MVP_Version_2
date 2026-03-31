import pathlib

css_path = pathlib.Path('frontend/css/styles.css')
with open(css_path, 'a', encoding='utf-8') as f:
    f.write('''

/* ════════════════════════════════════════════════════════════════════════
   LUCIDE ICONS
   ════════════════════════════════════════════════════════════════════════ */
.lucide {
  display: inline-block;
  vertical-align: middle;
  stroke-width: 2;
  stroke: currentColor;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-sm {
  width: 18px;
  height: 18px;
  margin-right: 4px; /* small gap for text next to it */
  vertical-align: text-bottom;
}

.icon-md {
  width: 24px;
  height: 24px;
  margin-right: 6px;
  vertical-align: bottom;
}

.icon-lg {
  width: 32px;
  height: 32px;
}

/* Fix specific spacing */
.nav-item .icon .lucide {
  margin-right: 0;
}
.btn-icon .lucide {
  margin-right: 0;
}
''')
print("CSS updated")
