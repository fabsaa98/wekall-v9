# Vicky Insights — Documentación del Prompt del Sistema

**Última actualización:** 21 abril 2026  
**Commit de referencia:** `8ee629c`  
**Archivo fuente:** `src/pages/VickyInsights.tsx` (variable `CONTEXT`, línea ~755)

---

## ¿Qué es este documento?

Documenta la arquitectura del prompt del sistema de Vicky Insights — la IA analítica de WeKall Intelligence. Este prompt es lo que define cómo Vicky piensa, qué datos usa, cómo responde y cuáles son sus límites.

---

## Principio de diseño: Prompt 100% dinámico

El prompt **no contiene datos hardcodeados de ningún cliente**. Todo lo que varía por cliente se inyecta en tiempo real desde:

| Fuente | Qué aporta |
|--------|-----------|
| `clientConfig` (Supabase) | Nombre, industria, países, agentes, costos, ticket promedio |
| `agentKPIs` hook | CSAT, FCR, ocupación, llamadas/hora en tiempo real |
| `agentsData` hook | Top/bottom agentes dinámicos del CDR |
| `cdr.latestDay` | Datos del día más reciente (tasa contacto, AHT, volumen) |
| `query_cdr_data` tool | Cualquier dato histórico consultado en tiempo real |

---

## Variables dinámicas disponibles en el prompt

```typescript
const _clientName          // Nombre del cliente activo
const _clientIndustry      // Industria (clientConfig.industry)
const _agentesActivos      // clientConfig.agentes_activos || agentKPIs.agentesActivos
const _costoAgenteMes      // clientConfig.costo_agente_mes
const _costoNomina         // _agentesActivos × _costoAgenteMes
const _ticketPromedio      // clientConfig.ticket_promedio_cop
const _costoAgenteHora     // _costoAgenteMes / (22 días × 8 horas)
const _costoAgenteMin      // _costoAgenteHora / 60
const _paises              // clientConfig.paises_operacion || [clientConfig.country]
const _hasMultiPais        // true si operación en más de un país
const _campanas            // clientConfig.campanas (lista de campañas configuradas)
const _topAgentes          // agentsData.agents ordenados desc por total_llamadas (top 10)
const _bottomAgentes       // agentsData.agents ordenados asc por total_llamadas (bottom 10)
const _hasTopAgentes       // true si agentsData tiene datos
const _hasFinancialConfig  // true si hay costo_agente_mes y agentes_activos configurados
const _cdrSection          // Datos del día más reciente del CDR
const _agentKPIsSection    // KPIs de agentes (CSAT, FCR, ocupación, etc.)
const _benchmarkCtx        // Benchmarks de industria generados dinámicamente
```

---

## Estructura del prompt (secciones)

### 1. Datos reales CDR
Inyecta `_cdrSection` y `_agentKPIsSection` con los datos del día actual.  
Si no hay datos, incluye instrucciones explícitas para usar `query_cdr_data`.

### 2. Regla de oro — nunca decir "no tengo datos" sin consultar
Flujo obligatorio antes de responder cualquier pregunta histórica:
1. Intentar `query_cdr_data` con el período solicitado
2. Solo decir "no tengo datos" si la query retorna vacío

### 3. Comparativas Year-over-Year
Instrucciones específicas para usar `query_type="year_over_year"`.

### 4. Análisis de transcripciones
Resultados agregados de las transcripciones con Whisper:
- Tasa de promesa de pago, objeciones frecuentes, frases reales
- **Nota:** Este bloque aún es semi-estático. Pendiente migrar a query dinámica.

### 5. Regla del Dialer automático
Instrucción crítica: el WeKall Dialer genera ~44% del volumen con tasa de contacto baja (5-8%). No reportar como anomalía sin mencionarlo.

### 6. Top/Bottom agentes *(dinámico)*
```typescript
${_hasTopAgentes ? `Top 10: ${_topAgentes.map(...).join('\n')}` : '(Sin datos — usar query_agents_data)'}
```

### 7. Ecosistema WeKall
Genérico: Business Phone · Engage360 · Messenger Hub · Notes

### 8. Estructura del cliente *(dinámico)*
```typescript
- Nombre: ${_clientName}
- Industria: ${clientConfig?.industry || 'contact center'}
- Agentes activos: ${_agentesActivos || 'consultar via query_agents_data'}
- Países: ${_hasMultiPais ? _paises.join(', ') : _paises[0]}
- Campañas: ${_campanas.length > 0 ? _campanas.join(' · ') : 'consultar via query_cdr_data'}
```

### 9. Benchmarks *(dinámico)*
Generados por `generateBenchmarkContext(_opType, _region)` — no hardcodeados.

### 10. Estimativos financieros / Ticket promedio *(dinámico)*
```typescript
${_ticketPromedio 
  ? `Ticket configurado: ${clientConfig?.currency || 'COP'} $${_ticketPromedio.toLocaleString()}`
  : 'Ticket no configurado — solicitar al CEO para cálculos de recaudo'}
```

### 11. Motor EBITDA *(condicional)*
Solo se activa si `_hasFinancialConfig = true`:
```typescript
${_hasFinancialConfig 
  ? `Costo agente: ${_costoAgenteMes} / Nómina total: ${_costoNomina}...`
  : 'Configurar costo_agente_mes y agentes_activos en Administración'}
```

### 12. Fórmulas de impacto
Genéricas — no hardcodeadas al cliente. Usan variables dinámicas cuando están disponibles.

### 13. Identidad y voz de Vicky
Completamente genérico — no depende del cliente.

### 14. Reglas de datos e integridad
- El cliente puede operar en múltiples países — usar `query_cdr_data` para el desglose
- Nunca asumir datos sin consultar
- `country_comparison` disponible para comparar operaciones por país/campaña

---

## Tools disponibles (Function Calling)

| Tool | Cuándo usarla |
|------|--------------|
| `calcularImpactoAHT` | Preguntas sobre eficiencia, tiempo de atención, ahorro por reducir AHT |
| `calcularImpactoContactRate` | Impacto de mejorar tasa de contacto efectivo |
| `calcularImpactoAgentes` | Impacto de subir rendimiento del peor cuartil |
| `getEstadoOperativo` | Resumen ejecutivo, estado general, KPIs actuales |
| `buscarDatoOficial` | Datos externos no en CDR (salarios de otros países, regulaciones, etc.) |
| `query_cdr_data` | Cualquier dato histórico del CDR (anuales, mensuales, tendencias, YoY, comparativa países) |
| `query_agents_data` | Rendimiento de agentes específicos, top/bottom, CSAT individual |
| `get_client_config` | Configuración del cliente, número agentes, costos configurados |
| `query_benchmarks` | Comparar KPIs vs benchmarks de industria |

### `query_cdr_data` — tipos de consulta

| `query_type` | Descripción | Parámetros requeridos |
|---|---|---|
| `annual_summary` | Totales por año | ninguno |
| `monthly_summary` | Totales por mes | `year` |
| `date_range` | Rango específico | `from_date`, `to_date` |
| `top_agents` | Ranking agentes | `limit`, `order` |
| `daily_trend` | Últimos N días | `days` |
| `year_over_year` | Comparativa mismo período año anterior | `from_date`, `to_date` del período ACTUAL |
| `country_comparison` | Desglose por país/campaña | ninguno (usa datos configurados) |

**Parámetro adicional:** `country` — `"colombia"` / `"peru"` / `"both"` (default)

---

## Qué fue eliminado (vs versión anterior)

| Eliminado | Reemplazado por |
|-----------|----------------|
| "Teresa Meza, Juan Gutierrez..." (top agentes hardcodeados) | `_topAgentes` desde `agentsData` |
| "91 Colombia + 48 Perú + 2 otros" | `_agentesActivos` desde `clientConfig` |
| "12,083,522 llamadas totales" | query dinámica `annual_summary` |
| "6,832,540 llamadas Colombia / 1,955,779 Perú" | `country_comparison` tool |
| Lista de supervisores hardcodeada | Eliminada — no aporta valor al prompt |
| "COP $3,000,000/agente, 81 agentes" | `_costoAgenteMes` / `_agentesActivos` desde `clientConfig` |
| "Cobranzas Crediminuto Colombia S.A.S" | `_campanas` desde `clientConfig.campanas` |
| "CrediSmart SAS Perú" | `country_comparison` tool |
| "Crediminuto opera en DOS países..." | Instrucción genérica + `country_comparison` |

---

## Pendientes (deuda técnica)

- [ ] **Análisis de transcripciones dinámico:** El bloque de objeciones/resultados aún usa porcentajes hardcodeados. Migrar a query dinámica de `transcriptions` en Supabase por `client_id`.
- [ ] **Fórmulas EBITDA con valores dinámicos:** Las referencias "16,129 llamadas" y "6,951 contactos efectivos" en las fórmulas aún son hardcodeadas. Deben venir del CDR más reciente.
- [ ] **Configuración en Admin UI:** Agregar campos `costo_agente_mes`, `ticket_promedio_cop`, `paises_operacion`, `campanas` al panel de Administración para que cada cliente los configure sin tocar código.
- [ ] **Transcripciones count dinámico:** El número "62 grabaciones" se actualiza manualmente. Debería consultarse como `COUNT(*)` de `transcriptions WHERE client_id = ?`.

---

## Cómo agregar un cliente nuevo

1. Crear registro en `client_config` con:
   - `client_id`, `client_name`, `industry`, `country`
   - `costo_agente_mes` (activa Motor EBITDA)
   - `agentes_activos`
   - `ticket_promedio_cop` (activa cálculos de recaudo)
   - `paises_operacion` (array, ej: `["Colombia", "Perú"]`)
   - `campanas` (array, ej: `["Cobranzas", "Servicio al Cliente"]`)

2. Cargar CDR del cliente en `cdr_daily_metrics` con el `client_id` correcto

3. Vicky ya funciona automáticamente — sin modificar código

---

*Documento generado por GlorIA — WeKall Intelligence · Scale-G · 21 abr 2026*
