# Color Contrast Mapping - UI Labels

**Regla:** Labels con fondo claro deben tener texto oscuro del mismo tono.

## Mapeo de Colores

### Verde (Green/Emerald)
- `bg-green-50` / `bg-green-100` / `bg-emerald-50` / `bg-emerald-100` → `text-green-800` / `text-emerald-800`
- `bg-green-500/10` / `bg-emerald-500/10` → `text-green-700` / `text-emerald-700`

### Azul (Blue/Sky/Cyan)
- `bg-blue-50` / `bg-blue-100` / `bg-sky-50` / `bg-cyan-50` → `text-blue-800` / `text-sky-800` / `text-cyan-800`
- `bg-blue-500/10` / `bg-sky-500/10` → `text-blue-700` / `text-sky-700`

### Amarillo/Naranja (Yellow/Amber)
- `bg-yellow-50` / `bg-yellow-100` / `bg-amber-50` → `text-amber-800` / `text-orange-800`
- `bg-yellow-500/10` / `bg-amber-500/10` → `text-amber-700` / `text-orange-700`

### Morado (Purple/Violet)
- `bg-purple-50` / `bg-purple-100` / `bg-violet-50` → `text-purple-800` / `text-violet-800`
- `bg-purple-500/10` → `text-purple-700`

### Rojo (Red)
- `bg-red-50` / `bg-red-100` → `text-red-800`
- `bg-red-500/10` → `text-red-700`

### Rosa (Pink)
- `bg-pink-50` / `bg-pink-100` → `text-pink-800`
- `bg-pink-500/10` → `text-pink-700`

## Dark Mode
En dark mode, mantener los colores actuales (ej: `dark:text-emerald-300`) ya que funcionan bien con fondos oscuros.

## Pattern a Buscar
```tsx
// ❌ Antes (texto claro sobre fondo claro)
<span className="bg-emerald-100 text-emerald-400">Label</span>

// ✅ Después (texto oscuro sobre fondo claro)
<span className="bg-emerald-100 text-emerald-800 dark:text-emerald-400">Label</span>
```
