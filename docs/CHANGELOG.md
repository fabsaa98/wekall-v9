
## v22.1.0 — 2026-04-14

### Nuevas funcionalidades
- **Sprint 1:** Soporte semántico para ventas (esExitoso ventas, objeciones, calcularImpactoConversion, churn detection, calcularImpactoFCR, CSAT inferido)
- **Sprint 2A:** KPIs reales de CX en dashboard (CSAT/FCR/escalaciones de Engage360), Equipos ordenables por CSAT/FCR
- **Sprint 2B:** Ocupación estimada, cuotas vs meta, alertas CSAT/FCR/ocupación, Vicky con contexto Engage360
- **Sprint 3:** Motor de forecast (822 días CDR, confianza alta), Erlang C, nueva página /forecast

### Tests
- 990 tests UAT desde 4 roles ejecutivos (CEO, VP Ventas, VP CX, VP Ops)
- 878 tests en suite total (216 unitarios + 150 Vicky UAT + 212 CEO + 300 nuevos roles)

### Commits
- 353cfd2 Sprint Ventas — detectOperationType, esExitoso ventas, objeciones, calcularImpactoConversion
- 9b6ff6e Sprint CX — churn detection badge, calcularImpactoFCR, CSAT inferido 1-5
- 11e9fc6 Sprint 2A — KPIs CX reales, Equipos ordenables, costo/llamada dashboard
- fb66d59 Sprint 2B — ocupación estimada, cuotas vs meta, alertas, Vicky KPIs reales
- 28a2eaa Sprint 3 — Forecast volumen, Erlang C, dimensionamiento por hora, ForecastView nueva

### Backup
- Tag: v22.1-post-sprints
- Rama: backup/v22.1-post-sprints
- Doc maestro: backups/wekall-intelligence-v22.1/ESTADO-v22.1.md
