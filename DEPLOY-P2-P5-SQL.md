# Deploy P2 + P5: Instrucciones SQL

**Ejecutar en:** https://supabase.com/dashboard/project/iszodrpublcnsyvtgjcg/sql/new

---

## Paso 1: Ejecutar Migración P2 (Channel Costs)

Copiar y pegar el contenido completo de:
```
supabase/migrations/20260512_channel_costs.sql
```

Esto creará:
- Tabla `channel_costs`
- Function `get_channel_cost_comparison()`
- Seed data para Crediminuto y WeKall

---

## Paso 2: Ejecutar Migración P5 (Forecast Revenue)

Copiar y pegar el contenido completo de:
```
supabase/migrations/20260512_forecast_revenue.sql
```

Esto creará:
- Function `forecast_revenue()`
- Function `forecast_accuracy_check()`

---

## Paso 3: Validar Instalación

### Validar P2

```sql
-- Ver datos seed de channel_costs
SELECT * FROM public.channel_costs ORDER BY client_id, channel;

-- Probar función RPC P2
SELECT public.get_channel_cost_comparison('crediminuto');
```

**Resultado esperado P2:**
```json
{
  "costo_humano": 1363,
  "costo_vicky": 85,
  "ahorro_pct": 93.76,
  "volumen_vicky": 0,
  "volumen_humano": 0,
  "canales": [
    {"channel": "voz", "costo": 1363, "tiempo_seg": 180},
    {"channel": "vicky", "costo": 85, "tiempo_seg": 120},
    {"channel": "whatsapp", "costo": 50, "tiempo_seg": 90},
    {"channel": "email", "costo": 20, "tiempo_seg": 0}
  ]
}
```

### Validar P5

```sql
-- Probar forecast 7 días
SELECT * FROM public.forecast_revenue('crediminuto', 7);

-- Validar precisión del modelo
SELECT * FROM public.forecast_accuracy_check('crediminuto') LIMIT 10;
```

**Resultado esperado P5:**
```
fecha       | proyeccion_cop | intervalo_min | intervalo_max | confianza
------------|----------------|---------------|---------------|----------
2026-05-13  | 45000000       | 30000000      | 60000000      | alta
2026-05-14  | 46000000       | 31000000      | 61000000      | alta
...
```

---

## Paso 4: Troubleshooting

### Error: "relation does not exist"

- Verificar que las migraciones se ejecutaron en orden
- Verificar que `client_config` table existe (debería existir desde V30)

### Error: "function already exists"

- Normal si estás re-ejecutando. Agregar `OR REPLACE` ya está en los scripts.

### Volúmenes en cero

- Normal si no hay datos en `cdr_daily_metrics` con campo `voicebot_used`
- La función RPC funciona igual, solo retornará volúmenes = 0

### Forecast vacío

- Requiere al menos 30 registros en `financial_results` para el `client_id`
- Si no hay datos, el componente mostrará mensaje: "Sin datos suficientes..."

---

## Paso 5: Deploy Frontend

Una vez validado SQL:

```bash
cd /Users/celeru/.openclaw/workspace/WeIntelligence
npm run build
npx wrangler pages deploy dist --project-name=weintelligence
```

---

## Verificación Final

**URLs de validación:**
1. https://weintelligence.pages.dev/financial — Ver componente "Costo por Canal"
2. https://weintelligence.pages.dev/forecast — Ver componente "Forecast de Recaudo"

**Criterios de éxito:**
- ✅ Badge "Ahorro IA: X%" visible en Financial Intelligence
- ✅ Badge "ESTIMADO" visible en Forecast View
- ✅ Gráficos rendering correctamente
- ✅ No errores en console del browser

---

**Dudas o problemas:** Contactar al subagent o revisar logs en Supabase → Logs → Postgres
