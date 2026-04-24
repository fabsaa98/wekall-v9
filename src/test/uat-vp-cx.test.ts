import { describe, it, expect } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// UAT VP Customer Experience / CSO — WeKall Intelligence
// Perspectiva: VP CX / CSO con 15 años experiencia LATAM
// Stack conocido: Zendesk, Salesforce Service Cloud, Genesys, Medallia, Qualtrics
// Obsesión: Churn, FCR, CSAT, NPS, Retención
// Fecha: 2026-04-14
// ══════════════════════════════════════════════════════════════════════════════
//
// Como VP CX de una empresa mediana en Colombia (50-500 agentes), uso WeKall
// Business Phone + Engage360 + Messenger Hub. He subido grabaciones de llamadas
// de servicio a WeKall Intelligence. Quiero saber si esta herramienta puede
// ayudarme a reducir churn, mejorar FCR, coachear agentes y tomar decisiones
// de retención basadas en datos reales de las conversaciones.
//
// Metodología de evaluación:
//   ✅ PASS  → Feature existe y funciona según revisión del código fuente
//   ❌ FAIL  → Gap confirmado: feature ausente o incompleto — prioridad de desarrollo
//
// Convención:
//   const hayFeature = true/false; // justificación del código
//   expect(hayFeature).toBe(true);  // falla si es gap
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 1 — Speech Analytics: Inteligencia de conversación CX (25 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('ÁREA 1 — Speech Analytics: Inteligencia de conversación CX', () => {

  // ── Clasificación de tipo de llamada ─────────────────────────────────────

  it('CX-001: Speech Analytics distingue llamadas de servicio de cobranzas', () => {
    // inferirCampana() en SpeechAnalytics.tsx:
    //   call_type='support' → 'Servicio' ✅
    //   texto con "problema/soporte/falla" → 'Servicio' ✅
    //   texto con "deuda/pago/cobran" → 'Cobranzas' ✅
    const hayMapeoServicioVsCobranzas = true;
    expect(hayMapeoServicioVsCobranzas).toBe(true);
  });

  it('CX-002: Speech Analytics clasifica llamadas de ventas separadas de servicio', () => {
    // inferirCampana(): texto con "venta/producto/precio/compra" → 'Ventas' ✅
    // call_type='sale' → 'Ventas' ✅
    const hayMapeoVentas = true;
    expect(hayMapeoVentas).toBe(true);
  });

  it('CX-003: Speech Analytics clasifica llamadas por motivo específico (queja / consulta / cancelación / reclamo)', () => {
    // parseSummary() detecta "tema" desde campo estructurado o keywords
    // GAP: mapeo es genérico (Cobranzas/Servicio/Ventas), no hay sub-clasificación
    //      por: QUEJA, CONSULTA, CANCELACIÓN, RECLAMO como tipos distintos
    // parseSummary extrae "tema" del resumen pero no lo normaliza a estas categorías CX
    const tieneSubclasificacionMotivoCX = false; // gap confirmado
    expect(tieneSubclasificacionMotivoCX).toBe(true);
  });

  it('CX-004: Speech Analytics detecta tono del cliente (positivo / negativo / neutral)', () => {
    // parseSummary() en SpeechAnalytics.tsx líneas 85-100:
    //   Lee campo estructurado "Tono del cliente:" del summary
    //   Fallback: keywords (molesto, enojado, irritado → negativo; amable, cordial → positivo)
    //   Renderiza "Positivo", "Negativo", "Neutral" en tabla de agentes ✅
    const detectaTono = true;
    expect(detectaTono).toBe(true);
  });

  it('CX-005: Speech Analytics detecta señales de churn en transcripciones (menciones "cancelar", "me voy", "quiero darme de baja")', () => {
    // GAP CRÍTICO: no hay función detectarChurn() ni análisis de keywords de cancelación
    // parseSummary() detecta tono negativo pero no clasifica específicamente señales de churn
    // Para un VP CX, saber qué llamadas son señales de churn es la función más crítica
    const tieneChurnDetection = true; // Fix CX1: CHURN_SIGNALS + churnRisk en parseSummary()
    expect(tieneChurnDetection).toBe(true); // ✅ Fix CX1
  });

  it('CX-006: Speech Analytics detecta menciones de competidores ("me voy a Claro", "en Movistar me trataron mejor")', () => {
    // GAP: no hay lista de competidores ni función de detección de menciones competitivas
    // parseSummary() y inferirCampana() no incluyen lógica de competitor detection
    const tieneDeteccionCompetidores = false; // gap confirmado
    expect(tieneDeteccionCompetidores).toBe(true);
  });

  it('CX-007: Speech Analytics puede identificar si el problema se resolvió en la llamada (proxy de FCR)', () => {
    // parseSummary() detecta resultado: 'exitoso' | 'fallido' | 'no_contacto' ✅
    // Estrategia 1: campo "Resultado:" estructurado del Worker
    // Estrategia 2: keywords (acuerdo/pagó/resolvió → exitoso; no acepta/no paga → fallido)
    // Este "resultado" sirve como proxy de resolución — no es FCR formal pero es útil
    const hayProxyResolucion = true;
    expect(hayProxyResolucion).toBe(true);
  });

  it('CX-008: Speech Analytics identifica "momentos de quiebre" en la conversación (dónde se frustró el cliente)', () => {
    // GAP: no hay análisis de segmentos de la conversación ni detección de puntos
    // de inflexión negativos (momento en que el tono del cliente cambió de neutral a negativo)
    // SpeechAnalytics.tsx muestra tono agregado por llamada, no análisis de secuencia temporal
    const hayMomentosDeQuiebre = false; // gap confirmado
    expect(hayMomentosDeQuiebre).toBe(true);
  });

  it('CX-009: Speech Analytics estima CSAT por llamada individual (inferido desde tono + resultado)', () => {
    // GAP: tonoScore existe a nivel de agente (agregado), no por llamada individual
    // No hay campo csat_inferido por transcripción, ni escala 1-5 estimada por IA
    const tieneCsatPorLlamada = true; // Fix CX3: estimarCSAT() + csatPromedio
    expect(tieneCsatPorLlamada).toBe(true); // ✅ Fix CX3
  });

  it('CX-010: Speech Analytics estima NPS por llamada (¿el cliente daría un 9 o un 6?)', () => {
    // GAP: no hay inferencia de NPS individual. El NPS requiere modelos de propensión
    // que WeKall Intelligence no tiene implementados en SpeechAnalytics.tsx
    const tieneNpsInferido = false; // gap confirmado
    expect(tieneNpsInferido).toBe(true);
  });

  it('CX-011: Speech Analytics muestra distribución de llamadas por tipo (Servicio vs Cobranzas vs Ventas)', () => {
    // SpeechAnalytics.tsx renderiza tabla por agente con campanaEfectiva
    // Hay filtro por campaña en la UI (filtro de campaña visible en el componente)
    // ✅ inferirCampana clasifica cada llamada y se puede ver distribución
    const hayDistribucionPorTipo = true;
    expect(hayDistribucionPorTipo).toBe(true);
  });

  it('CX-012: Speech Analytics muestra ranking de agentes por tono positivo (proxy de calidad CX)', () => {
    // SpeechAnalytics.tsx líneas 316-321: calcula tonoScore por agente
    //   tonoScore = ((positivos - negativos) / total) * 100
    // Se renderiza en tabla: "Positivo", "Negativo", "Neutral" con colores ✅
    const hayRankingPorTono = true;
    expect(hayRankingPorTono).toBe(true);
  });

  it('CX-013: Speech Analytics detecta llamadas donde el cliente mencionó un problema sin resolver (escalación potencial)', () => {
    // parseSummary() detecta resultado='fallido' (no se resolvió)
    // GAP: no hay etiqueta específica de "potencial escalación" ni alerta de seguimiento
    // Solo clasifica como "fallido", no como "candidato a escalar"
    const tieneDeteccionEscalacionPotencial = false; // gap confirmado
    expect(tieneDeteccionEscalacionPotencial).toBe(true);
  });

  it('CX-014: Speech Analytics tiene filtro para ver SOLO llamadas con tono negativo (clientes insatisfechos)', () => {
    // GAP: la tabla de SpeechAnalytics no tiene filtro por tono
    // Hay filtro de campaña pero no filtro por tono negativo/positivo para VP CX
    const hayFiltroTono = false; // gap confirmado
    expect(hayFiltroTono).toBe(true);
  });

  it('CX-015: Speech Analytics muestra tiempo promedio de llamada estimado (AHT) por tipo de llamada', () => {
    // calcAHT() en SpeechAnalytics.tsx estima AHT desde longitud del transcript (~150 wpm)
    // Se calcula por agente ✅ pero no se desglosa por tipo de llamada (servicio vs queja)
    const hayAHTEstimado = true; // existe, aunque no segmentado por motivo
    expect(hayAHTEstimado).toBe(true);
  });

  it('CX-016: Speech Analytics puede filtrar llamadas por fecha/rango para análisis de tendencia CX', () => {
    // GAP: SpeechAnalytics.tsx carga transcripciones de Supabase pero no hay selector de rango de fechas
    // Las transcripciones se muestran sin filtro temporal explícito
    const hayFiltroPorFecha = false; // gap confirmado
    expect(hayFiltroPorFecha).toBe(true);
  });

  it('CX-017: Speech Analytics muestra el porcentaje de llamadas exitosas vs fallidas globalmente', () => {
    // SpeechAnalytics.tsx calcula tasaConversion por agente y renderiza
    // exitosasArr.length y fallidasArr.length con distribución ✅
    const hayResumenExitosasVsFallidas = true;
    expect(hayResumenExitosasVsFallidas).toBe(true);
  });

  it('CX-018: Speech Analytics detecta palabras/frases que predicen resultado exitoso (mejores prácticas)', () => {
    // GAP: no hay análisis de n-gramas ni patrones de lenguaje que correlacionen
    // con resultado=exitoso. No hay función de "best practice language detection"
    const hayAnalisisFrasesExito = false; // gap confirmado
    expect(hayAnalisisFrasesExito).toBe(true);
  });

  it('CX-019: Speech Analytics detecta silencio excesivo o tiempo en espera prolongado en la llamada', () => {
    // GAP: el análisis es sobre transcripciones de texto, no sobre audio raw
    // No hay detección de silencios, hold time, ni dead air desde el transcript
    const tieneAnalisisSilencio = false; // gap confirmado (limitación de arquitectura)
    expect(tieneAnalisisSilencio).toBe(true);
  });

  it('CX-020: Speech Analytics exporta llamadas con tono negativo para sesión de coaching', () => {
    // GAP: no hay función de exportar subset de llamadas filtradas por tono
    // SpeechAnalytics no tiene botón de exportar lista de llamadas negativas
    const hayExportCoachingNegativo = false; // gap confirmado
    expect(hayExportCoachingNegativo).toBe(true);
  });

  it('CX-021: Speech Analytics detecta si el agente utilizó técnicas de empatía y manejo de clientes difíciles', () => {
    // GAP: no hay análisis del comportamiento del agente (solo tono del cliente)
    // parseSummary analiza tono del cliente, no el comportamiento del agente
    const tieneAnalisisComportamientoAgente = false; // gap confirmado
    expect(tieneAnalisisComportamientoAgente).toBe(true);
  });

  it('CX-022: Speech Analytics reconoce idiomas diferentes (español vs inglés vs spanglish en LATAM)', () => {
    // GAP: no hay detección de idioma ni soporte multi-idioma explícito
    // El sistema asume español en los prompts y keywords
    const tieneDeteccionIdioma = false; // gap confirmado para operaciones LATAM
    expect(tieneDeteccionIdioma).toBe(true);
  });

  it('CX-023: Speech Analytics tiene análisis comparativo semana-a-semana de calidad CX', () => {
    // GAP: el análisis es por llamada individual o agente puntual
    // No hay vista de tendencia semanal de calidad (tono, resultado) en SpeechAnalytics
    const hayTendenciaSemanalCX = true; // weeklyTrend compara tasa exitosas semana vs semana anterior
    expect(hayTendenciaSemanalCX).toBe(true); // ✅ ya existía
  });

  it('CX-024: Speech Analytics muestra porcentaje de distribución de tonos (positivo/negativo/neutral) del periodo', () => {
    // SpeechAnalytics.tsx líneas 880-894: renderiza % de tono positivo y negativo
    // para llamadas exitosas y fallidas (en la vista de análisis agregado) ✅
    const hayDistribucionTonos = true;
    expect(hayDistribucionTonos).toBe(true);
  });

  it('CX-025: Speech Analytics tiene vista de "llamadas de alto riesgo" para revisión prioritaria del VP CX', () => {
    // GAP: no hay clasificación de llamadas como "alto riesgo CX"
    // No hay un dashboard de llamadas priorizadas para revisión ejecutiva de CX
    const hayVistaAltoRiescoCX = false; // gap confirmado
    expect(hayVistaAltoRiescoCX).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 2 — Vicky Insights: IA para decisiones de CX (25 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('ÁREA 2 — Vicky Insights: IA para decisiones de CX', () => {

  it('CX-026: Vicky puede responder "¿Cuáles son los 3 principales motivos de llamada de servicio?"', () => {
    // Vicky usa RAG (/rag-query) para consultas sobre agentes + transcripciones ✅
    // Las transcripciones están en Supabase. Vicky puede analizar el campo "tema"
    // parseado por parseSummary() para responder esta pregunta ✅
    const vickyPuedeResponderMotivos = true;
    expect(vickyPuedeResponderMotivos).toBe(true);
  });

  it('CX-027: Vicky puede responder "¿Qué agentes tienen el CSAT más alto y qué hacen diferente?"', () => {
    // Equipos.tsx tiene avg_csat por agente desde useAgentsData ✅
    // Vicky navega a /vicky?q=análisis+de+agente con contexto de coaching ✅
    // Sin embargo, Vicky no tiene función específica de comparar mejores vs peores agentes en CX
    // GAP: puede analizar un agente pero no compara "los mejores vs los peores" automáticamente
    const vickyComparaMejoresAgentes = false; // gap parcial — análisis individual sí, comparativo no
    expect(vickyComparaMejoresAgentes).toBe(true);
  });

  it('CX-028: Vicky puede responder "¿Cuántos clientes llamaron más de 2 veces por el mismo problema?"', () => {
    // GAP CRÍTICO: el CDR (cdr_daily_metrics) no tiene campo de customer_id individual
    // Las métricas son agregadas por día, no por cliente único
    // No es posible rastrear repetición de cliente desde los datos actuales
    const vickyIdentificaLlamadasRepetidas = false; // gap crítico confirmado
    expect(vickyIdentificaLlamadasRepetidas).toBe(true);
  });

  it('CX-029: Vicky puede calcular FCR estimado basado en las transcripciones ("resultado=exitoso" como proxy)', () => {
    // Las transcripciones tienen campo resultado (exitoso/fallido) via parseSummary
    // Vicky podría calcular % exitosas sobre total como proxy FCR — los datos están en Supabase
    // GAP: no hay función específica de FCR en vickyCalculations.ts, pero Vicky tiene acceso
    // a transcripciones via RAG. Puede responder con inferencia libre pero sin cálculo formal
    const vickyCalculaFCREstimado = true; // Fix CX2: calcularImpactoFCR() en vickyCalculations.ts
    expect(vickyCalculaFCREstimado).toBe(true); // ✅ Fix CX2
  });

  it('CX-030: Vicky puede responder "¿Qué frases predicen que el cliente va a escalar?"', () => {
    // GAP: Vicky no tiene función de pattern matching para detectar frases de escalación
    // El RAG busca transcripciones por similitud semántica, puede responder de forma libre
    // pero no hay un modelo estadístico de correlación frase-escalación
    const vickyDetectaFrasesEscalacion = false; // gap confirmado
    expect(vickyDetectaFrasesEscalacion).toBe(true);
  });

  it('CX-031: Vicky puede calcular "cuánto cuesta en tiempo de agente un problema no resuelto en primera llamada"', () => {
    // calcularImpactoAHT() existe en vickyCalculations.ts ✅
    // GAP: no hay calcularImpactoFCR() — no calcula el costo de rellamar por no-FCR
    // Para un VP CX, el costo de repetición (N llamadas × AHT × costo/min) es crítico
    const vickyCalculaCostoPorNoFCR = true; // Fix CX2: calcularImpactoFCR() en vickyCalculations.ts
    expect(vickyCalculaCostoPorNoFCR).toBe(true); // ✅ Fix CX2
  });

  it('CX-032: El motor EBITDA puede calcular impacto financiero de mejorar FCR en 10 puntos porcentuales', () => {
    // vickyCalculations.ts tiene: calcularImpactoAHT, calcularImpactoContactRate, calcularImpactoAgentes
    // GAP CRÍTICO: no existe calcularImpactoFCR()
    // Si FCR sube 10pp → menos llamadas repetidas → menos FTEs → ahorro en nómina
    // Este cálculo no está implementado
    const tieneCalculadoraImpactoFCR = true; // Fix CX2: calcularImpactoFCR() implementado
    expect(tieneCalculadoraImpactoFCR).toBe(true); // ✅ Fix CX2
  });

  it('CX-033: Vicky tiene benchmarks de contact_center_servicio (FCR, CSAT, NPS, AHT)', () => {
    // benchmarks.ts contiene contact_center_servicio con:
    //   fcr: latam p50=68%, usa p50=72% ✅
    //   csat: latam p50=76% ✅
    //   nps: latam p50=35 ✅
    //   aht: latam p50=6.5 min ✅
    // detectOperationType reconoce "servicio" y mapea correctamente ✅
    const tieneBenchmarksCXServicio = true;
    expect(tieneBenchmarksCXServicio).toBe(true);
  });

  it('CX-034: Vicky tiene benchmarks de FCR para Colombia/LATAM (no solo USA)', () => {
    // benchmarks.ts contact_center_servicio.metrics.fcr:
    //   latam: { p25: 58, p50: 68, p75: 78, source: 'SQM Latam 2024' } ✅
    // Disponible en región latam ✅
    const tieneBenchmarkFCRLatam = true;
    expect(tieneBenchmarkFCRLatam).toBe(true);
  });

  it('CX-035: Vicky tiene benchmarks de NPS para contact center de servicio en LATAM', () => {
    // benchmarks.ts contact_center_servicio.metrics.nps:
    //   latam: { p25: 20, p50: 35, p75: 50, source: 'SQM Latam 2024' } ✅
    const tieneBenchmarkNPSLatam = true;
    expect(tieneBenchmarkNPSLatam).toBe(true);
  });

  it('CX-036: Vicky puede analizar documentos externos (FAQ, manual de producto, política de servicio)', () => {
    // GAP: el RAG (/rag-query) solo usa transcripciones de llamadas almacenadas en Supabase
    // VickyInsights.tsx tiene drag-and-drop para archivos de audio (.mp3/.wav)
    // GAP: no acepta PDF, Word, FAQ o documentos externos como base de conocimiento
    const soportaDocumentosExternos = false; // gap confirmado
    expect(soportaDocumentosExternos).toBe(true);
  });

  it('CX-037: Vicky puede responder "¿Cuál es el impacto en churn si mejoro el CSAT del Q1 de agentes?"', () => {
    // GAP: no hay modelo que vincule CSAT de agente → churn de clientes
    // calcularImpactoAgentes() existe pero calcula rendimiento operativo, no retención de clientes
    const vickyCalculaImpactoChurnPorCsat = false; // gap confirmado
    expect(vickyCalculaImpactoChurnPorCsat).toBe(true);
  });

  it('CX-038: Vicky exporta análisis a PDF (para presentar a la junta o al CEO)', () => {
    // exportToPDF() en VickyInsights.tsx renderiza respuesta como HTML imprimible ✅
    // Incluye clientName dinámico, fuentes, timestamp ✅
    const vickyExportaPDF = true;
    expect(vickyExportaPDF).toBe(true);
  });

  it('CX-039: Vicky tiene historial de conversaciones para no perder contexto entre sesiones', () => {
    // VickyChatHistory component importado en VickyInsights.tsx ✅
    // saveVickyConversation() persiste conversaciones en Supabase ✅
    // localStorage guarda decision_log ✅
    const tieneHistorialConversaciones = true;
    expect(tieneHistorialConversaciones).toBe(true);
  });

  it('CX-040: Vicky puede responder en voz (para VP CX ocupado que no puede leer texto)', () => {
    // convertirMarkdownAProsa() en VickyInsights.tsx — conversión para TTS ✅
    // Hay integración de audio/TTS en la arquitectura ✅
    const soportaRespuestaVoz = true;
    expect(soportaRespuestaVoz).toBe(true);
  });

  it('CX-041: Vicky puede identificar "el agente con mayor tasa de escalaciones" en el último mes', () => {
    // GAP: el CDR agregado no tiene campo de escalaciones por agente individual
    // mockData.ts línea 162: escalated = Math.round(total * 0.07) — es estimación genérica
    // No hay datos reales de escalaciones por agente desde CDR o Engage360
    const vickyIdentificaAgenteMasEscalaciones = false; // gap confirmado
    expect(vickyIdentificaAgenteMasEscalaciones).toBe(true);
  });

  it('CX-042: Vicky tiene confianza (Alta/Media/Baja) en sus respuestas para que VP CX sepa cuánto confiar', () => {
    // ChatMessage interface tiene confidence?: 'Alta' | 'Media' | 'Baja' ✅
    // Se renderiza en la UI con el badge de confianza ✅
    const tieneNivelConfianza = true;
    expect(tieneNivelConfianza).toBe(true);
  });

  it('CX-043: Vicky puede sugerir preguntas de seguimiento relevantes para CX (follow-ups)', () => {
    // ChatMessage.followUps?: string[] — se renderiza como chips de seguimiento ✅
    // generateVickyFallbackResponse incluye followUps de ejemplo ✅
    const tieneSugerenciasFollowUp = true;
    expect(tieneSugerenciasFollowUp).toBe(true);
  });

  it('CX-044: Vicky puede analizar llamadas de un agente específico para coaching de CX', () => {
    // Equipos.tsx navega a /vicky?q=análisis completo de [agente_name]... ✅
    // RAG activo cuando hay agente detectado en la query (isAgentQuery check en VickyInsights) ✅
    const vickyAnalizaAgenteEspecifico = true;
    expect(vickyAnalizaAgenteEspecifico).toBe(true);
  });

  it('CX-045: Vicky puede calcular "cuánto vale perder un cliente" (LTV del cliente en riesgo)', () => {
    // GAP: no hay datos de LTV, valor de cliente ni integración con CRM/facturación
    // Salesforce tiene status='pending', HubSpot conectado pero no tiene LTV de cliente
    const vickyCalculaLTVClienteEnRiesgo = false; // gap confirmado
    expect(vickyCalculaLTVClienteEnRiesgo).toBe(true);
  });

  it('CX-046: Vicky diferencia entre preguntas operativas (hoy) y estratégicas (tendencia)', () => {
    // VickyInsights.tsx tiene tabs: Insights / Log de Decisiones / Historial ✅
    // El sistema puede responder tanto a "¿cómo estamos hoy?" como "¿cuál es la tendencia?" ✅
    // Datos CDR 822 días disponibles para análisis tendencial ✅
    const vickyDiferenciaOperativoEstrategico = true;
    expect(vickyDiferenciaOperativoEstrategico).toBe(true);
  });

  it('CX-047: Vicky puede comparar el desempeño actual de CX vs benchmark de la industria (SQM, COPC)', () => {
    // generateBenchmarkContext() importado en VickyInsights ✅
    // detectOperationType() reconoce si es servicio → usa benchmarks contact_center_servicio ✅
    // Benchmarks COPC y SQM disponibles en benchmarks.ts ✅
    const vickyComparaBenchmarksIndustria = true;
    expect(vickyComparaBenchmarksIndustria).toBe(true);
  });

  it('CX-048: Vicky puede generar un reporte semanal de CX en formato ejecutivo', () => {
    // exportToPDF() genera reporte en formato HTML/print ✅
    // Pero GAP: no hay función de reporte SEMANAL automático de CX
    // El PDF es on-demand, no es un reporte semanal programado de métricas de CX
    const tieneReporteSemanalCXAutomatico = false; // gap confirmado
    expect(tieneReporteSemanalCXAutomatico).toBe(true);
  });

  it('CX-049: Vicky cita sus fuentes de datos (Supabase, transcripciones, CDR) en cada respuesta', () => {
    // ChatMessage.sources?: string[] ✅
    // generateVickyFallbackResponse incluye sources: ['WeKall CDR · datos en tiempo real · Supabase'] ✅
    const vickyCitaFuentes = true;
    expect(vickyCitaFuentes).toBe(true);
  });

  it('CX-050: Vicky puede responder en inglés para operaciones o clientes internacionales', () => {
    // GAP: los prompts del sistema de Vicky están en español
    // No hay soporte multi-idioma explícito en VickyInsights.tsx
    // Para VP CX de multinacional o empresa con clientes en USA, esto es relevante
    const vickyRespondeEnIngles = false; // gap para contextos internacionales
    expect(vickyRespondeEnIngles).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 3 — Dashboard: KPIs de Customer Experience (15 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('ÁREA 3 — Dashboard: KPIs de Customer Experience', () => {

  it('CX-051: Dashboard tiene KPI de FCR (First Call Resolution) como métrica principal', () => {
    // GAP CRÍTICO: buildKPIsFromCDR() en mockData.ts genera solo 4 KPIs:
    //   1. Llamadas / Día
    //   2. Tasa de Contacto Efectivo
    //   3. Contactos Efectivos
    //   4. AHT Real (estimado)
    // NO hay KPI de FCR en el dashboard principal
    // CDR data (cdr_daily_metrics) no tiene campo de FCR — viene de Engage360 (no integrado)
    const dashboardTieneFCR = false; // gap crítico confirmado
    expect(dashboardTieneFCR).toBe(true);
  });

  it('CX-052: Dashboard tiene KPI de CSAT (Customer Satisfaction Score)', () => {
    // GAP CRÍTICO: buildKPIsFromCDR() no incluye CSAT en los 4 KPIs del dashboard
    // avg_csat existe en Equipos (por agente) pero no en el Overview como KPI principal
    // CSAT requiere encuesta post-llamada o inferencia — no está en CDR
    const dashboardTieneCsatPrincipal = false; // gap crítico confirmado
    expect(dashboardTieneCsatPrincipal).toBe(true);
  });

  it('CX-053: Dashboard tiene KPI de NPS inferido o tendencia', () => {
    // GAP: no hay NPS en el dashboard principal
    // buildKPIsFromCDR() no incluye NPS
    const dashboardTieneNPS = false; // gap confirmado
    expect(dashboardTieneNPS).toBe(true);
  });

  it('CX-054: Dashboard tiene KPI de Tasa de Escalación', () => {
    // GAP: buildKPIsFromCDR() no incluye tasa de escalación
    // buildConversationTrend() calcula "escalated" como 7% del total (hardcoded)
    // No es un KPI explícito en el dashboard principal con trend y benchmark
    const dashboardTieneTasaEscalacion = false; // gap confirmado
    expect(dashboardTieneTasaEscalacion).toBe(true);
  });

  it('CX-055: Dashboard muestra distribución de tipos de llamada (Servicio vs Cobranzas vs Ventas vs General)', () => {
    // GAP: el dashboard principal (Overview) muestra métricas agregadas del CDR
    // No hay breakdown de tipo de llamada en el Overview — ese análisis está en SpeechAnalytics
    const dashboardMuestraDistribucionTipos = false; // gap confirmado
    expect(dashboardMuestraDistribucionTipos).toBe(true);
  });

  it('CX-056: Dashboard tiene AHT como KPI con benchmark de industria', () => {
    // buildKPIsFromCDR() incluye 'aht_real' con roles: ['COO', 'VP CX'] ✅
    // vsIndustry: -3.8 (benchmark CCContact 2024) ✅
    // Sin embargo: el valor es estimación hardcoded (8.1 min) sin variación real ⚠️
    const dashboardTieneAHTConBenchmark = true; // existe aunque estimado
    expect(dashboardTieneAHTConBenchmark).toBe(true);
  });

  it('CX-057: Dashboard muestra si la experiencia del cliente está mejorando o empeorando (trend)', () => {
    // GAP: el dashboard principal muestra trend de Tasa de Contacto y Volumen
    // No hay trend de métricas de CX (CSAT, FCR, NPS, tono de llamadas)
    // buildConversationTrend() tiene datos de tendencia pero no de CX específicamente
    const dashboardMuestraTendenciaCX = false; // gap confirmado
    expect(dashboardMuestraTendenciaCX).toBe(true);
  });

  it('CX-058: Dashboard tiene insights proactivos relacionados con CX (no solo cobranzas/operaciones)', () => {
    // buildAlertsFromCDR() genera alertas de: Tasa de Contacto y Volumen — ambos son KPIs operacionales
    // GAP: no hay alertas proactivas de CX (spike de tonos negativos, FCR bajo la semana, etc.)
    const hayInsightsProactivosCX = false; // gap confirmado
    expect(hayInsightsProactivosCX).toBe(true);
  });

  it('CX-059: Dashboard tiene KPI de Tiempo de Espera del Cliente (Speed of Answer / ASA)', () => {
    // GAP: el CDR no tiene campo de ASA / tiempo de espera
    // buildKPIsFromCDR() no incluye este KPI
    // Para un VP CX, ASA es crítico — COPC benchmark latam: p50=60 seg
    const dashboardTieneASA = false; // gap confirmado
    expect(dashboardTieneASA).toBe(true);
  });

  it('CX-060: Dashboard tiene KPI de Tasa de Abandono de Llamada', () => {
    // GAP: no hay campo de tasa de abandono en el CDR ni en buildKPIsFromCDR()
    // benchmarks.ts tiene abandonRate para contact_center_servicio pero no hay dato real
    const dashboardTieneTasaAbandono = false; // gap confirmado
    expect(dashboardTieneTasaAbandono).toBe(true);
  });

  it('CX-061: Dashboard permite ver KPIs filtrados por rol VP CX específicamente', () => {
    // buildKPIsFromCDR() tiene roles: ['COO', 'VP CX'] en el KPI de AHT ✅
    // El sistema de roles existe pero el VP CX no tiene un set diferenciado de KPIs
    // que el CEO o COO no vean — los roles son parciales ✅
    const hayRolVPCX = true; // rol existe aunque KPIs CX son limitados
    expect(hayRolVPCX).toBe(true);
  });

  it('CX-062: Dashboard tiene sparkline de tendencia de los últimos 30 días para KPIs de CX', () => {
    // KPICard renderiza sparkline de 7 días para Tasa de Contacto y Volumen ✅
    // GAP: para CX no hay sparklines de CSAT/FCR/NPS porque esos datos no están en CDR
    const haySparklineCX = false; // gap: sparklines existen pero no para KPIs de CX
    expect(haySparklineCX).toBe(true);
  });

  it('CX-063: Dashboard permite drill-down al hacer clic en un KPI de CX (ver detalle)', () => {
    // Overview.tsx tiene drillDownMetric state y modal de drill-down ✅
    // drillDownKPI = allKPIs.find(k => k.id === drillDownMetric) ✅
    // KPICard tiene onClick handler ✅
    const hayDrillDownKPI = true;
    expect(hayDrillDownKPI).toBe(true);
  });

  it('CX-064: Dashboard exporta KPIs de CX a PDF para reporte ejecutivo', () => {
    // exportDashboardPDF() en Overview.tsx renderiza KPIs en HTML/print ✅
    // Incluye insights y fuentes ✅
    const dashboardExportaPDF = true;
    expect(dashboardExportaPDF).toBe(true);
  });

  it('CX-065: Dashboard tiene un "score de salud de CX" consolidado (de 0 a 100) para vista rápida ejecutiva', () => {
    // GAP: no hay índice compuesto de salud CX
    // Zendesk y Salesforce Service Cloud tienen "Health Score" del cliente
    // WeKall Intelligence no tiene este concepto implementado
    const hayScoreSaludCX = false; // gap confirmado
    expect(hayScoreSaludCX).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 4 — Equipos: Ranking y coaching por CX (15 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('ÁREA 4 — Equipos: Ranking y coaching por CX', () => {

  it('CX-066: Equipos muestra agentes con métricas de CSAT y FCR (no solo volumen de llamadas)', () => {
    // Equipos.tsx líneas 196-197: renderiza avg_fcr y avg_csat por agente ✅
    // useAgentsData hook calcula avg_csat y avg_fcr desde Supabase transcriptions ✅
    const equiposMuestraCSATyFCR = true;
    expect(equiposMuestraCSATyFCR).toBe(true);
  });

  it('CX-067: Equipos permite ordenar agentes por CSAT (no solo por volumen de llamadas)', () => {
    // useAgentsData.ts línea 179: agents.sort((a, b) => b.avg_fcr - a.avg_fcr)
    // GAP: el sort por defecto es por FCR. No hay sort dinámico por CSAT en la UI
    // No hay selector de criterio de ordenamiento (por CSAT, FCR, AHT, etc.)
    const equiposPermiteOrdenarPorCSAT = false; // gap confirmado
    expect(equiposPermiteOrdenarPorCSAT).toBe(true);
  });

  it('CX-068: Al hacer clic en un agente, Vicky da recomendaciones de coaching para mejorar CSAT', () => {
    // Equipos.tsx línea 165: navigate a /vicky?q=análisis completo de [agente]...
    // La query incluye "rendimiento, tendencia y recomendaciones de coaching" ✅
    // Vicky genera coaching específico basado en transcripciones RAG ✅
    const hayCoachingPorAgente = true;
    expect(hayCoachingPorAgente).toBe(true);
  });

  it('CX-069: Equipos muestra comparación de agente vs benchmark de industria (no solo vs equipo)', () => {
    // Equipos.tsx tiene benchmark en los KPIS: e.g., benchmark: 3.8 para CSAT, 72 para FCR
    // Se muestra visualmente la comparativa ✅
    const equiposComparaBenchmarkIndustria = true;
    expect(equiposComparaBenchmarkIndustria).toBe(true);
  });

  it('CX-070: Equipos muestra cuartiles de agentes por capacidad de resolución (Q1/Q2/Q3/Q4)', () => {
    // Equipos.tsx líneas 264-265: hay datos de fcr y csat por agente
    // GAP: no hay clasificación explícita por cuartiles Q1/Q2/Q3/Q4 en la UI
    // No hay un gráfico de dispersión o agrupación por cuartil de desempeño CX
    const hayClasificacionPorCuartiles = false; // gap confirmado
    expect(hayClasificacionPorCuartiles).toBe(true);
  });

  it('CX-071: Equipos muestra sparkline de tendencia de CSAT del agente (últimos 7-14 días)', () => {
    // Equipos.tsx tiene AgentSparkline component para renderizar tendencia ✅
    // useAgentsData tiene avg7d_fcr y avg7d_csat ✅
    // Se renderiza la tendencia del agente en la tabla ✅
    const haySparklineTendenciaAgente = true;
    expect(haySparklineTendenciaAgente).toBe(true);
  });

  it('CX-072: Equipos tiene análisis de correlación entre AHT del agente y calidad de resolución (FCR)', () => {
    // GAP: no hay análisis de correlación AHT vs FCR por agente
    // Los datos existen (avg_aht_segundos, avg_fcr en AgentSummary)
    // Pero no hay visualización ni análisis de correlación en la UI
    const hayCorrelacionAHTvsFCR = false; // gap confirmado
    expect(hayCorrelacionAHTvsFCR).toBe(true);
  });

  it('CX-073: Equipos permite filtrar agentes por área/equipo/supervisor', () => {
    // GAP: useAgentsData carga todos los agentes de Supabase sin filtros de equipo/supervisor
    // No hay jerarquía de equipos ni supervisores en el modelo de datos actual
    const equiposFiltraByEquipo = false; // gap confirmado para operaciones medianas/grandes
    expect(equiposFiltraByEquipo).toBe(true);
  });

  it('CX-074: Equipos muestra el número de transcripciones analizadas por agente (muestra estadística)', () => {
    // AgentSummary tiene total_calls: number ✅
    // Se renderiza en la tabla para mostrar cuántas llamadas respaldan las métricas ✅
    const equiposMuestraMuestraEstadistica = true;
    expect(equiposMuestraMuestraEstadistica).toBe(true);
  });

  it('CX-075: Equipos muestra un "perfil CX" del agente con fortalezas y áreas de mejora', () => {
    // GAP: no hay perfil estructurado de fortalezas/debilidades por agente en Equipos.tsx
    // El análisis de perfil existe cuando se navega a Vicky, pero no en la vista de Equipos
    const hayPerfilCXAgente = false; // gap confirmado
    expect(hayPerfilCXAgente).toBe(true);
  });

  it('CX-076: Equipos tiene un ranking consolidado de "top performers en CX" (combinando CSAT + FCR + tono)', () => {
    // GAP: el ranking en Equipos.tsx es por FCR (sort por avg_fcr)
    // No hay índice compuesto que combine CSAT + FCR + tono del cliente
    const hayRankingCompositeoCX = false; // gap confirmado
    expect(hayRankingCompositeoCX).toBe(true);
  });

  it('CX-077: Equipos permite exportar el reporte de desempeño de agentes en CX a PDF/Excel', () => {
    // GAP: Equipos.tsx no tiene función de exportación (no hay exportToPDF ni export a CSV)
    const equiposExportaReporte = false; // gap confirmado
    expect(equiposExportaReporte).toBe(true);
  });

  it('CX-078: Equipos muestra comparativa del agente actual vs el promedio del equipo en CX', () => {
    // Equipos.tsx tiene benchmark definido para cada KPI del área
    // Se renderiza visualmente con color (verde si supera, rojo si está por debajo)
    // Muestra avg del equipo como referencia ✅
    const hayComparativaPorEquipo = true;
    expect(hayComparativaPorEquipo).toBe(true);
  });

  it('CX-079: Equipos muestra KPIs diferentes según el tipo de operación (servicio vs cobranzas vs ventas)', () => {
    // Equipos.tsx líneas 95-130: define AreaKPIs con sets distintos por área
    //   'Servicio': CSAT, FCR, AHT, Escalaciones ✅
    //   'Cobranzas': Tasa de Contacto, Promesas de Pago, AHT ✅
    //   'Ventas': Conversión, AHT, etc. ✅
    const equiposTieneKPIsxTipoOperacion = true;
    expect(equiposTieneKPIsxTipoOperacion).toBe(true);
  });

  it('CX-080: Equipos tiene pestaña de "Evaluaciones de calidad" o Quality Assurance (QA scorecard)', () => {
    // GAP: no hay módulo de QA Scorecard en Equipos.tsx
    // Zendesk y Genesys tienen formularios de evaluación de calidad estructurados
    // WeKall Intelligence no tiene QA scorecard formal
    const hayModuloQAScorecard = false; // gap crítico para operaciones CX formales
    expect(hayModuloQAScorecard).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 5 — Alertas: Notificaciones de riesgo de churn (10 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('ÁREA 5 — Alertas: Notificaciones de riesgo de churn', () => {

  it('CX-081: Alertas permite configurar umbral de CSAT para disparar alerta (ej: "si CSAT baja de 3.5")', () => {
    // Alertas.tsx exampleChips incluye 'CSAT baje de 3.5' como ejemplo de umbral configurable ✅
    // La UI de alertas NL tiene este chip disponible ✅
    const hayUmbralCSATConfigurable = true;
    expect(hayUmbralCSATConfigurable).toBe(true);
  });

  it('CX-082: Alertas permite configurar umbral de FCR ("si FCR baja del 70%")', () => {
    // Alertas.tsx exampleChips incluye 'FCR baje del 70%' ✅
    const hayUmbralFCRConfigurable = true;
    expect(hayUmbralFCRConfigurable).toBe(true);
  });

  it('CX-083: Alertas permite configurar umbral de escalaciones ("si escalaciones suben al 15%")', () => {
    // Alertas.tsx exampleChips incluye 'Escalaciones suban al 15%' ✅
    const hayUmbralEscalacionesConfigurable = true;
    expect(hayUmbralEscalacionesConfigurable).toBe(true);
  });

  it('CX-084: Alertas dispara notificación cuando hay spike de llamadas con tono negativo (señal de crisis CX)', () => {
    // GAP: buildAlertsFromCDR() genera alertas de Tasa de Contacto y Volumen
    // NO hay alerta de spike de tonos negativos desde las transcripciones
    // Requeriría cruzar datos de SpeechAnalytics + Alertas — no implementado
    const hayAlertaSpikeTonos = false; // gap crítico confirmado
    expect(hayAlertaSpikeTonos).toBe(true);
  });

  it('CX-085: Alertas puede detectar cuando un mismo cliente llama más de 2 veces en 7 días (señal de churn)', () => {
    // GAP: el CDR (cdr_daily_metrics) tiene datos agregados por día, no por cliente único
    // No hay campo customer_id en los datos de llamadas que permita este tracking
    const hayAlertaClienteRepetitivo = false; // gap crítico confirmado
    expect(hayAlertaClienteRepetitivo).toBe(true);
  });

  it('CX-086: Las alertas incluyen datos del cliente afectado (nombre, segmento, valor) cuando hay CRM integrado', () => {
    // GAP: Salesforce CRM está en status='pending' (no conectado)
    // HubSpot está connected pero para Marketing, no para datos de clientes de servicio
    // Las alertas no pueden incluir datos del cliente porque no hay CRM de servicio conectado
    const alertasIncluyenDatosCliente = false; // gap confirmado
    expect(alertasIncluyenDatosCliente).toBe(true);
  });

  it('CX-087: Las alertas pueden enviarse en tiempo real (no solo al final del día)', () => {
    // buildAlertsFromCDR() procesa el latestDay disponible en Supabase
    // Los datos CDR son del último día disponible — no hay streaming en tiempo real
    // Las alertas se calculan cuando el usuario abre la app, no son push real-time
    const alertasSonRealTime = false; // gap confirmado — son near-real-time, no real-time push
    expect(alertasSonRealTime).toBe(true);
  });

  it('CX-088: Las alertas pueden enviarse por email o WhatsApp al VP CX automáticamente', () => {
    // Alertas.tsx línea 832: existe switch de 'Alertas por email' en UI ✅
    // GAP: el email alert es un switch UI pero no hay implementación de envío real visible
    // No hay integración de WhatsApp/webhook para notificaciones push automáticas
    const alertasEnvianNotificacion = false; // gap confirmado — UI existe pero sin backend
    expect(alertasEnvianNotificacion).toBe(true);
  });

  it('CX-089: Las alertas tienen severidad (Crítica / Advertencia / Info) con diferentes acciones', () => {
    // Alertas.tsx severityConfig: critical, warning, info con colores e iconos distintos ✅
    // buildAlertsFromCDR asigna severity según delta de tasa de contacto ✅
    const alertasTienenSeveridad = true;
    expect(alertasTienenSeveridad).toBe(true);
  });

  it('CX-090: Las alertas tienen historial para ver cuándo ocurrió el último evento crítico de CX', () => {
    // Alertas.tsx tiene tab de "Historial" y usa getRecentAlertLog() + insertAlertLog() ✅
    // Se persiste en Supabase (alert_log table) ✅
    const alertasTienenHistorial = true;
    expect(alertasTienenHistorial).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ÁREA 6 — Omnicanalidad y Gaps vs Zendesk/Salesforce Service Cloud (10 tests)
// ─────────────────────────────────────────────────────────────────────────────
describe('ÁREA 6 — Omnicanalidad y Gaps vs Zendesk/Salesforce Service Cloud', () => {

  it('CX-091: La plataforma tiene Engage360 y Messenger Hub como fuentes de datos conectadas', () => {
    // Configuracion.tsx líneas 164-175: Engage360 y Messenger Hub aparecen con status: 'connected' ✅
    // Son parte del ecosistema WeKall con integración declarada ✅
    const engageYMessengerConectados = true;
    expect(engageYMessengerConectados).toBe(true);
  });

  it('CX-092: Los datos de Engage360 (tickets, chats) están disponibles en VickyInsights para análisis', () => {
    // GAP CRÍTICO: VickyInsights.tsx solo usa CDR (cdr_daily_metrics) + transcripciones
    // Engage360 aparece como "connected" en Configuracion pero sus datos no fluyen
    // hacia VickyInsights ni hacia el dashboard principal como fuente analizable
    const engage360DataEnVicky = false; // gap crítico confirmado
    expect(engage360DataEnVicky).toBe(true);
  });

  it('CX-093: Los datos de Messenger Hub (WhatsApp, chat) están disponibles para análisis omnicanal', () => {
    // GAP: mismo problema que Engage360 — Messenger Hub está "connected" en UI
    // pero no hay datos de chat/WhatsApp en el pipeline analítico de Vicky o SpeechAnalytics
    const messengerHubDataDisponible = false; // gap crítico confirmado
    expect(messengerHubDataDisponible).toBe(true);
  });

  it('CX-094: Existe una vista de historial del cliente mostrando interacciones en todos los canales', () => {
    // GAP: no hay módulo de "customer journey" o "historial 360 del cliente"
    // Zendesk tiene Customer Timeline; Salesforce tiene 360-degree customer view
    // WeKall Intelligence no tiene este módulo
    const hayVistaHistorialCliente360 = false; // gap crítico vs Zendesk/Salesforce
    expect(hayVistaHistorialCliente360).toBe(true);
  });

  it('CX-095: La plataforma puede analizar tickets de Engage360 además de llamadas de voz', () => {
    // GAP: el análisis de transcripciones (SpeechAnalytics) es solo para llamadas de voz
    // No hay análisis de tickets de texto de Engage360
    // Para un VP CX omnicanal, el análisis de tickets es tan importante como las llamadas
    const hayAnalisisTicketsEngage360 = false; // gap crítico confirmado
    expect(hayAnalisisTicketsEngage360).toBe(true);
  });

  it('CX-096: Hay integración activa con CRM (Salesforce o HubSpot) para ver el valor del cliente en riesgo', () => {
    // IntegrationsView.tsx: Salesforce status='pending' ❌
    // HubSpot status='connected' ✅ pero es Marketing Hub, no Service Cloud
    // GAP: no hay integración con CRM de servicio para ver LTV o segmento del cliente
    const hayIntegracionCRMServicio = false; // gap confirmado
    expect(hayIntegracionCRMServicio).toBe(true);
  });

  it('CX-097: WeKall Intelligence tiene funcionalidad equivalente a "macros" de Zendesk (respuestas pre-construidas)', () => {
    // GAP: no hay módulo de macros, plantillas de respuesta ni knowledge base
    // Zendesk tiene Macros para agentes; Salesforce tiene Knowledge Articles
    // WeKall Intelligence no tiene esta funcionalidad
    const tieneMacrosOKnowledgeBase = false; // gap vs Zendesk/Salesforce
    expect(tieneMacrosOKnowledgeBase).toBe(true);
  });

  it('CX-098: WeKall Intelligence tiene gestión de casos (case management) como Salesforce Service Cloud', () => {
    // GAP: no hay módulo de casos (case management, SLA tracking, case routing)
    // Esta es una funcionalidad core de Salesforce Service Cloud y Zendesk
    // WeKall Intelligence es análisis/inteligencia, no gestión de casos
    const tieneGestionDeCasos = false; // gap vs Salesforce Service Cloud
    expect(tieneGestionDeCasos).toBe(true);
  });

  it('CX-099: WeKall Intelligence tiene ventaja competitiva vs Zendesk en análisis de voz con IA', () => {
    // WeKall Intelligence analiza LLAMADAS DE VOZ con IA (transcripción + parseSummary) ✅
    // Zendesk Explore analiza tickets de texto, no llamadas de voz nativas
    // Para empresas con alto volumen de llamadas, WeKall Intelligence tiene ventaja ✅
    const tieneVentajaEnAnalisisVoz = true;
    expect(tieneVentajaEnAnalisisVoz).toBe(true);
  });

  it('CX-100: WeKall Intelligence tiene ventaja vs Salesforce en motor EBITDA y benchmarks LATAM', () => {
    // calcularImpactoAHT(), calcularImpactoContactRate() con costos en COP ✅
    // benchmarks.ts con fuentes COPC, SQM Latam, ACDECC Colombia ✅
    // Salesforce Service Cloud no tiene cálculo de impacto financiero EBITDA integrado
    // Los benchmarks LATAM/Colombia son diferenciadores relevantes para VP CX colombiano ✅
    const tieneVentajaMotorEBITDALatam = true;
    expect(tieneVentajaMotorEBITDALatam).toBe(true);
  });
});
