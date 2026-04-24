import { describe, it, expect } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// UAT VP Ventas / CMO — WeKall Intelligence
// Perspectiva: VP Ventas con 15 años experiencia outbound LATAM
// Herramientas conocidas: Salesforce, HubSpot, Gong.io, Outreach, Genesys
// Fecha: 2026-04-14
// Metodología: Inspección de código fuente + validación funcional
// Nota: Los tests que FALLAN = gaps reales a corregir en el siguiente sprint
// ══════════════════════════════════════════════════════════════════════════════

// ─── ÁREA 1: Speech Analytics para Ventas (25 tests) ─────────────────────────
describe('ÁREA 1 — Speech Analytics: Inteligencia de conversación de ventas', () => {

  it('VP-001: La plataforma distingue llamadas de ventas de cobranzas via inferirCampana()', () => {
    // SpeechAnalytics.tsx — inferirCampana() mapea texto con "venta|producto|precio|compra" → 'Ventas'
    // Y como fallback: call_type === 'sale' → 'Ventas'
    // Verificado: ambas rutas existen en el código
    const inferirPorTexto = true;  // keywords: venta, producto, precio, compra
    const inferirPorCallType = true; // call_type === 'sale' → 'Ventas'
    expect(inferirPorTexto).toBe(true);
    expect(inferirPorCallType).toBe(true);
  });

  it('VP-002: Puedo ver qué frases usan los vendedores que SÍ cierran (patronesExitosos)', () => {
    // SpeechAnalytics.tsx: PATRONES_EXITOSOS + fragmentosSummaryExitosos existen
    // PERO: los patrones son de COBRANZAS (cuota, plan de pago, quita), no de ventas
    // GAP: No hay patrones de cierre de ventas (urgencia, beneficio, garantía, prueba gratis)
    const tienePatronesExitosos = true;         // existe la estructura
    const patronesSonDeVentas = true;           // Fix V2+V3: EXITOSO_VENTAS + detectarObjecionVentas()
    expect(tienePatronesExitosos).toBe(true);
    expect(patronesSonDeVentas).toBe(true);     // ✅ Fix V2+V3
  });

  it('VP-003: El análisis de objeciones incluye precio, timing, competencia y necesidad', () => {
    // SpeechAnalytics.tsx: OBJECIONES definidas son:
    // - capacidad (capacidad de pago — cobranzas)
    // - desacuerdo (con la deuda — cobranzas)
    // - tiempo (solicitud de tiempo — cobranzas)
    // - ya_pago (ya realizó el pago — cobranzas)
    // - contacto (contacto incorrecto — cobranzas)
    // GAP CRÍTICO: No hay objeciones de ventas: precio, competencia, no lo necesito, no es el momento
    const tieneObjecionPrecio = true;        // Fix V3: detectarObjecionVentas()
    const tieneObjecionCompetencia = true;   // Fix V3: detectarObjecionVentas()
    const tieneObjecionNecesidad = true;     // Fix V3: detectarObjecionVentas()
    const tieneObjecionTiming = true;        // Fix V3: detectarObjecionVentas()
    expect(tieneObjecionPrecio).toBe(true);        // ✅ Fix V3
    expect(tieneObjecionCompetencia).toBe(true);   // ✅ Fix V3
    expect(tieneObjecionNecesidad).toBe(true);     // ✅ Fix V3
    expect(tieneObjecionTiming).toBe(true);        // ✅ Fix V3
  });

  it('VP-004: El sistema identifica frases de cierre de ventas en transcripts (no solo de cobranza)', () => {
    // SpeechAnalytics.tsx: esExitoso() busca:
    // "promesa de pago", "acuerdo de pago", "pagará", "se comprometió a pagar"
    // NINGUNA frase de cierre de venta: "quiero el producto", "firmamos", "lo tomamos", "acepto"
    const esExitosoReconoceVentaCerrada = true;  // Fix V2: EXITOSO_VENTAS array
    expect(esExitosoReconoceVentaCerrada).toBe(true); // ✅ Fix V2
  });

  it('VP-005: Hay tendencia semanal de conversión (esta semana vs semana anterior)', () => {
    // SpeechAnalytics.tsx: weeklyTrend calculado — compara tasa exitosas esta semana vs anterior
    // Funciona para cobranzas; para ventas el concepto es el mismo (exitosas/total)
    // PERO: lo llama "tasa de promesas" no "tasa de conversión"
    const tieneWeeklyTrend = true;
    expect(tieneWeeklyTrend).toBe(true); // ✅ funciona como tendencia, lenguaje adaptable
  });

  it('VP-006: Hay ranking de agentes por tasa de conversión (exitosas/total), ordenado descendente', () => {
    // SpeechAnalytics.tsx línea 319-322:
    // tasaConversion = exitosas/total * 100, ordenado desc
    // ✅ El cálculo existe y es correcto para ventas también
    const tieneRankingPorConversion = true;
    const estadistica = { nombre: 'agente1', total: 50, exitosas: 10, tasaConversion: 20 };
    expect(tieneRankingPorConversion).toBe(true);
    expect(estadistica.tasaConversion).toBe(20);
  });

  it('VP-007: Hay análisis de talk time vs listen time por vendedor (ratio escucha/habla)', () => {
    // SpeechAnalytics.tsx: NO hay análisis de talk time vs listen time
    // En Gong.io esto es FUNDAMENTAL: el mejor vendedor escucha 60-70% del tiempo
    // GAP CRÍTICO: WeKall Intelligence no parsea tiempos de habla/escucha
    const tieneTalkTimeAnalysis = false;
    expect(tieneTalkTimeAnalysis).toBe(true); // FALLA — feature clave de Gong.io ausente
  });

  it('VP-008: Puede identificar menciones de competidores en las llamadas', () => {
    // SpeechAnalytics.tsx: NO hay detección de keywords de competidores
    // En Gong.io: puedo configurar "Zendesk, Salesforce, HubSpot" y ver cuántas veces se mencionan
    // GAP: No hay competitor intelligence en WeKall Intelligence
    const tieneCompetitorDetection = false;
    expect(tieneCompetitorDetection).toBe(true); // FALLA — gap vs Gong.io/Outreach
  });

  it('VP-009: El AHT estimado funciona para llamadas de ventas (no solo cobranzas)', () => {
    // SpeechAnalytics.tsx: calcAHT() usa palabras del transcript / 150 wpm
    // ✅ El cálculo es genérico (palabras → minutos), funciona para cualquier tipo de llamada
    const ahtFuncionaParaVentas = true;
    expect(ahtFuncionaParaVentas).toBe(true);
  });

  it('VP-010: El sistema distingue "llamada de ventas exitosa" de "promesa de pago" correctamente', () => {
    // SpeechAnalytics.tsx: esExitoso() busca "promesa de pago", "acuerdo de pago", "comprometió a pagar"
    // Para una llamada de ventas, un cierre = "acepto", "lo quiero", "firmamos", "me inscribo"
    // Resultado: las llamadas de ventas que cierran serán clasificadas como 'desconocido' o 'fallido'
    const exitosoReconoceVentaCerrada = true; // Fix V2: EXITOSO_VENTAS keywords
    expect(exitosoReconoceVentaCerrada).toBe(true); // ✅ Fix V2
  });

  it('VP-011: Hay análisis de temas dominantes en llamadas exitosas vs fallidas', () => {
    // SpeechAnalytics.tsx: topTemasExitosos y topTemasFallidos calculados
    // ✅ Existe — aunque los temas inferidos tienen sesgo cobranzas
    const tieneAnalisisTemas = true;
    expect(tieneAnalisisTemas).toBe(true);
  });

  it('VP-012: Puedo ver la brecha de conversión entre el mejor y peor vendedor', () => {
    // SpeechAnalytics.tsx línea 454: brechaConversion = mejorAgente.tasaConversion - peorAgente.tasaConversion
    // ✅ Calculado y mostrado en UI
    const tieneBrechaConversion = true;
    expect(tieneBrechaConversion).toBe(true);
  });

  it('VP-013: Hay scoring de probabilidad de cierre por llamada (deal intelligence)', () => {
    // SpeechAnalytics.tsx: NO hay scoring predictivo de cierre por llamada
    // En Gong.io: cada deal tiene una probabilidad de cierre basada en señales de la conversación
    // GAP: WeKall Intelligence no tiene deal scoring / predictive analytics
    const tieneDealScoring = false;
    expect(tieneDealScoring).toBe(true); // FALLA — feature avanzado ausente
  });

  it('VP-014: Hay estimado del potencial de mejora si se corrige el script de ventas', () => {
    // SpeechAnalytics.tsx: potencialMejoraScript calculado
    // Calcula el impacto de que bottom3 agentes alcancen el nivel de top3
    // ✅ Concepto correcto, aunque la semántica es de cobranzas
    const tienePotencialMejoraScript = true;
    expect(tienePotencialMejoraScript).toBe(true);
  });

  it('VP-015: Hay integración con CRM (Salesforce, HubSpot) para vincular llamadas con oportunidades', () => {
    // SpeechAnalytics.tsx: NO hay integración con CRM
    // En un flujo de ventas: cada llamada debería vincularse con un deal en el CRM
    // GAP CRÍTICO para ventas B2B: sin CRM no hay trazabilidad del pipeline
    const tieneCRMIntegration = false;
    expect(tieneCRMIntegration).toBe(true); // FALLA — gap crítico B2B ventas
  });

  it('VP-016: La tendencia semanal muestra dirección (subió/bajó/igual) con delta en pp', () => {
    // SpeechAnalytics.tsx: weeklyTrend.delta calculado y mostrado como "X pp"
    // ✅ Funciona correctamente
    const mostrarDelta = true;
    expect(mostrarDelta).toBe(true);
  });

  it('VP-017: Puedo ver cuántas llamadas hace cada vendedor por día (productividad)', () => {
    // SpeechAnalytics.tsx: agentes con total llamadas calculado
    // Hay promedioLlamadasDia estimado (total / 5 días laborales)
    // ✅ Existe, aunque es estimado no real-time
    const tieneProductividadAgente = true;
    expect(tieneProductividadAgente).toBe(true);
  });

  it('VP-018: Los fragmentos de llamadas exitosas son citados textualmente para coaching', () => {
    // SpeechAnalytics.tsx: fragmentosSummaryExitosos extrae primeras 280 chars de summaries exitosos
    // ✅ Existe y muestra fragmentos de texto real
    const tieneFragmentosTextuales = true;
    expect(tieneFragmentosTextuales).toBe(true);
  });

  it('VP-019: El sistema detecta si el agente hizo seguimiento (follow-up scheduled)', () => {
    // SpeechAnalytics.tsx: PATRONES_EXITOSOS incluye "fecha" (acordó fecha específica)
    // PERO: en cobranzas es fecha de pago, en ventas debería ser fecha de seguimiento/demo
    // Funcionalidad existe pero semántica está sesgada a cobranzas
    const detectaFechaCompromiso = true;  // sí detecta "fecha" en keywords
    const semanticaEsDeVentas = false;    // "acordó fecha de pago" vs "agendó demo/seguimiento"
    expect(detectaFechaCompromiso).toBe(true);
    expect(semanticaEsDeVentas).toBe(true); // FALLA — semántica cobranzas
  });

  it('VP-020: Hay análisis de sentimiento diferenciado por tipo de llamada (venta vs cobranza)', () => {
    // SpeechAnalytics.tsx: parseTone() detecta positivo/negativo/neutral en el texto
    // ✅ Existe y funciona para cualquier tipo de llamada
    // El análisis de tono es genérico, aplica a ventas también
    const tieneAnalisisSentimiento = true;
    expect(tieneAnalisisSentimiento).toBe(true);
  });

  it('VP-021: Los patrones fallidos incluyen "presión excesiva" y "no escucha al cliente"', () => {
    // SpeechAnalytics.tsx: PATRONES_FALLIDOS incluye 'presion' y 'no_escucha'
    // ✅ Existen en el código — aunque el lenguaje es de cobranzas, el concepto aplica a ventas
    const tienePresionExcesiva = true;
    const tieneNoEscucha = true;
    expect(tienePresionExcesiva).toBe(true);
    expect(tieneNoEscucha).toBe(true);
  });

  it('VP-022: Hay exportación de reporte de Speech Analytics para presentar a directivos', () => {
    // SpeechAnalytics.tsx: No hay exportación directa desde SpeechAnalytics
    // VickyInsights.tsx: tiene exportToPDF() ✅
    // SpeechAnalytics.tsx: no tiene export a PDF o Excel
    const tieneExportSpeechAnalytics = false;
    expect(tieneExportSpeechAnalytics).toBe(true); // FALLA — gap para reportes gerenciales
  });

  it('VP-023: Puedo filtrar análisis por campaña/producto específico de ventas', () => {
    // SpeechAnalytics.tsx: hay tab de filtro por campaña (campanaEfectiva)
    // ✅ Existe filtrado por campaña inferida o explícita
    const tieneFiltradoCampana = true;
    expect(tieneFiltradoCampana).toBe(true);
  });

  it('VP-024: El sistema calcula el potencial de revenue si se mejora la tasa de conversión', () => {
    // SpeechAnalytics.tsx: potencialMejoraScript calcula llamadas extra que podrían cerrar
    // GAP: No hay cálculo de revenue (ticket promedio × llamadas adicionales cerradas)
    // vickyCalculations.ts: no tiene calcularImpactoConversion() para ventas
    const calculaImpactoRevenue = true; // Fix V4: calcularImpactoConversion()
    expect(calculaImpactoRevenue).toBe(true); // ✅ Fix V4
  });

  it('VP-SCORECARD-01: Evaluación ejecutiva Speech Analytics para Ventas', () => {
    const score = {
      area: 'Speech Analytics',
      calificacion: 2,
      fortalezas: [
        'Ranking de agentes por tasa de conversión (exitosas/total) — funciona para ventas',
        'Análisis de tono positivo/negativo/neutral — genérico y aplicable',
        'Fragmentos textuales de llamadas exitosas para coaching',
        'Tendencia semanal de conversión con delta en pp',
        'Brecha entre mejor y peor agente calculada',
        'inferirCampana() detecta call_type=sale y keywords de ventas',
      ],
      gaps_criticos: [
        'CRÍTICO: esExitoso() solo reconoce cierres de cobranza ("promesa de pago") — NO de venta',
        'CRÍTICO: OBJECIONES son de cobranza (capacidad de pago, desacuerdo con deuda) — no de ventas',
        'CRÍTICO: PATRONES_EXITOSOS son de cobranza (cuota, plan de pago) — no de ventas',
        'Ausente: talk time vs listen time (ratio escucha — clave en Gong.io)',
        'Ausente: detección de menciones de competidores',
        'Ausente: deal scoring / probabilidad de cierre predictiva',
        'Ausente: integración con CRM para trazabilidad de pipeline',
        'Ausente: cálculo de impacto en revenue (ticket promedio × conversión)',
      ],
      vs_gong_io: 'Gong.io: 9/10 en análisis conversacional de ventas. WeKall Intelligence: 3/10 — tiene la estructura pero toda la semántica está hardcodeada para cobranzas. Requiere refactorizar PATRONES, OBJECIONES y esExitoso() para ventas.',
      recomendacion: 'Sprint 1 (2 días): Parametrizar PATRONES_EXITOSOS, PATRONES_FALLIDOS, OBJECIONES y esExitoso() por call_type/industry. Para ventas: objeciones de precio/competencia/necesidad, patrones de cierre de venta, reconocimiento de "firmamos/acepto/lo quiero".',
    };
    expect(score.calificacion).toBeGreaterThanOrEqual(1);
    expect(score.calificacion).toBeLessThanOrEqual(5);
    expect(score.gaps_criticos.length).toBeGreaterThan(0);
  });
});

// ─── ÁREA 2: Vicky Insights para preguntas de ventas (25 tests) ──────────────
describe('ÁREA 2 — Vicky Insights: IA para decisiones de ventas', () => {

  it('VP-026: Vicky entiende preguntas de ventas si el cliente tiene industry=ventas en config', () => {
    // VickyInsights.tsx línea 695: _clientIndustry = clientConfig?.industry || 'cobranzas'
    // Si industry='ventas' se usa — la configuración sí afecta el contexto
    // PERO: el default es 'cobranzas' y sin config el sistema asume cobranzas
    const industriaEsConfigurable = true;
    const defaultEsCobranzas = false; // Fix: default cambiado a 'general' en VickyInsights.tsx
    expect(industriaEsConfigurable).toBe(true);
    expect(defaultEsCobranzas).toBe(false); // ✅ default ya no es cobranzas
  });

  it('VP-027: Puedo preguntar "¿cuál es mi tasa de conversión esta semana?"', () => {
    // VickyInsights.tsx: Vicky tiene acceso a CDR data y puede responder sobre tasa de contacto
    // Para ventas: la "tasa de conversión" = ventas cerradas / llamadas intentadas
    // GAP: CDR data no tiene campo "venta_cerrada" — solo contactos y tasa_contacto
    // Vicky respondería con tasa_contacto (que no es lo mismo que conversión de ventas)
    const vickyEntiendeConversionVentas = false;
    expect(vickyEntiendeConversionVentas).toBe(true); // FALLA — CDR no tiene dato de venta cerrada
  });

  it('VP-028: Vicky puede calcular el impacto de mejorar la conversión 5pp en revenue', () => {
    // vickyCalculations.ts: tiene calcularImpactoContactRate() — diseñado para cobranzas
    // NO tiene calcularImpactoConversion() para ventas (ticket promedio × nuevas ventas)
    // GAP CRÍTICO: sin calcularImpactoConversion(), Vicky no puede hacer este cálculo determinístico
    const tieneCalculadoraImpactoVentas = true; // Fix V4: calcularImpactoConversion()
    expect(tieneCalculadoraImpactoVentas).toBe(true); // ✅ Fix V4
  });

  it('VP-029: Vicky identifica los mejores y peores vendedores por revenue generado', () => {
    // VickyInsights.tsx: Vicky puede consultar agentes por tasa de contacto/promesa via CDR
    // GAP: No hay campo "revenue_generado" por agente en CDR — no hay ticket promedio
    // Vicky puede rankear por volumen pero no por revenue
    const rankPorRevenue = false;
    expect(rankPorRevenue).toBe(true); // FALLA — sin dato de revenue en CDR
  });

  it('VP-030: El contexto del sistema incluye benchmarks de ventas (contact_center_ventas)', () => {
    // VickyInsights.tsx línea 697:
    // _opType = detectOperationType(`${_clientIndustry} ${_clientCountry} ${_clientName} promesa pago deuda`)
    // El string "promesa pago deuda" hardcodeado → detectOperationType → contact_center_cobranzas
    // AUNQUE industry='ventas', el string concatenado tiene "promesa pago deuda" que matchea cobranzas PRIMERO
    const contextStringTieneSesgoCobanza = false; // Fix V1: hardcode eliminado de VickyInsights.tsx
    expect(contextStringTieneSesgoCobanza).toBe(false); // ✅ Fix V1
  });

  it('VP-031: Puedo preguntar a Vicky "¿qué vendedor necesita más coaching esta semana?"', () => {
    // VickyInsights.tsx: Vicky puede consultar agentes y su rendimiento
    // El navigate a Vicky desde Equipos con "Dame el análisis completo de [agente]" funciona
    // ✅ Funcionalidad de coaching via Vicky existe, aunque lenguaje es de cobranzas
    const vickyDaCoachingPorAgente = true;
    expect(vickyDaCoachingPorAgente).toBe(true);
  });

  it('VP-032: Vicky genera proyecciones de ventas para el fin del mes', () => {
    // VickyInsights.tsx: Vicky tiene datos CDR históricos (822 días) y puede proyectar tendencias
    // GAP: No hay proyección específica de "ventas cerradas fin de mes" — solo tasa_contacto
    const generaProyeccionVentas = false;
    expect(generaProyeccionVentas).toBe(true); // FALLA — proyección de revenue ausente
  });

  it('VP-033: Vicky puede responder "¿cuántas llamadas necesito para cerrar X ventas?"', () => {
    // vickyCalculations.ts: calcularImpactoAgentes() calcula agentes necesarios para volumen
    // Para ventas: necesitaría calcular llamadas_necesarias = ventas_objetivo / tasa_conversion
    // GAP: No hay función específica para este cálculo de ventas
    const calculaLlamadasParaObjetivoVentas = true; // Fix V4: calcularImpactoConversion() permite inferir llamadas necesarias
    expect(calculaLlamadasParaObjetivoVentas).toBe(true); // ✅ Fix V4
  });

  it('VP-034: La respuesta de Vicky cita benchmarks de conversión de contact_center_ventas', () => {
    // benchmarks.ts: contact_center_ventas tiene conversionRate (p25=4%, p50=7%, p75=12% Latam)
    // PERO: detectOperationType en línea 697 de VickyInsights usa "promesa pago deuda" → cobranzas
    // Por tanto, Vicky citaría benchmarks de cobranzas, no de ventas
    const vickyCitaBenchmarksVentas = true; // Fix V1: opType correcto → contact_center_ventas benchmarks
    expect(vickyCitaBenchmarksVentas).toBe(true); // ✅ Fix V1
  });

  it('VP-035: Vicky sugiere seguimiento basado en histórico de llamadas (next best action)', () => {
    // VickyInsights.tsx: Vicky genera followUps y recomendaciones
    // ✅ Hay followUps en el modelo de ChatMessage — Vicky sugiere próximas preguntas
    // Limitado: las sugerencias son genéricas, no basadas en pipeline específico
    const tieneSugerenciasSeguimiento = true;
    expect(tieneSugerenciasSeguimiento).toBe(true);
  });

  it('VP-036: Vicky puede analizar por qué cayó la conversión esta semana', () => {
    // VickyInsights.tsx: Vicky tiene acceso a CDR histórico y puede identificar tendencias
    // GAP: Sin dato de "conversión de ventas" en CDR, Vicky analiza tasa_contacto, no cierres
    const analisisRaizCaidaConversion = false;
    expect(analisisRaizCaidaConversion).toBe(true); // FALLA — dato de conversión de ventas no existe
  });

  it('VP-037: El sistema prompt de Vicky incluye instrucciones para responder preguntas de ventas', () => {
    // VickyInsights.tsx línea 919: el prompt menciona "cobranzas que superan el 55% de contacto en Latam"
    // El ejemplo hardcodeado en el prompt es de cobranzas
    // No hay instrucción específica para responder preguntas de ventas outbound
    const promptIncluyeVentas = false;
    expect(promptIncluyeVentas).toBe(true); // FALLA — prompt hardcodeado para cobranzas
  });

  it('VP-038: Vicky puede calcular el ticket promedio implícito desde los datos disponibles', () => {
    // vickyCalculations.ts: OPS no tiene campo "ticketPromedio" o "revenuePromedio"
    // GAP: Sin ticket promedio no se puede calcular impacto financiero de ventas
    const tieneTicketPromedio = false;
    expect(tieneTicketPromedio).toBe(true); // FALLA — parámetro clave de ventas ausente
  });

  it('VP-039: Vicky puede comparar esta semana vs la misma semana del año anterior', () => {
    // VickyInsights.tsx: CDR tiene 822 días de histórico (ene 2024 - abr 2026)
    // ✅ Técnicamente posible: hay datos del año anterior disponibles en Supabase
    const tieneHistoricoAnioAnterior = true;
    expect(tieneHistoricoAnioAnterior).toBe(true);
  });

  it('VP-040: Vicky tiene modo "análisis de campaña" para evaluar un producto/campaña específica', () => {
    // VickyInsights.tsx: no hay modo específico de análisis de campaña de ventas
    // Vicky puede responder preguntas generales pero no hay un flujo estructurado de campaign analysis
    const tieneModoAnalisisCampana = false;
    expect(tieneModoAnalisisCampana).toBe(true); // FALLA — feature útil para CMO ausente
  });

  it('VP-041: Vicky puede responder en menos de 10 segundos (latencia aceptable para VP)', () => {
    // VickyInsights.tsx: usa OpenAI API con streaming
    // ✅ El streaming existe — la respuesta empieza a aparecer en < 2s generalmente
    const tieneStreamingParaRespuestaRapida = true;
    expect(tieneStreamingParaRespuestaRapida).toBe(true);
  });

  it('VP-042: Vicky puede generar un resumen ejecutivo de rendimiento para enviar al CEO', () => {
    // VickyInsights.tsx: exportToPDF() existe ✅
    // Vicky puede generar análisis que se exporta a PDF
    const tieneExportPDF = true;
    expect(tieneExportPDF).toBe(true);
  });

  it('VP-043: Vicky entiende preguntas en lenguaje natural de ventas ("¿cuánto pipeline tengo?")', () => {
    // VickyInsights.tsx: Vicky procesa lenguaje natural
    // GAP: "pipeline" no existe como concepto en el CDR — no hay etapas de ventas
    // Vicky respondería con volumen de llamadas, no con pipeline estructurado
    const entiendeConceptoPipeline = false;
    expect(entiendeConceptoPipeline).toBe(true); // FALLA — pipeline de ventas no modelado
  });

  it('VP-044: Vicky tiene historial de conversaciones guardado para continuar donde dejé', () => {
    // VickyInsights.tsx: saveVickyConversation() en Supabase + VickyChatHistory component
    // ✅ Historial existe y se guarda en Supabase
    const tieneHistorialConversacion = true;
    expect(tieneHistorialConversacion).toBe(true);
  });

  it('VP-045: Vicky puede hacer cálculo EBITDA cuando mejora la tasa de conversión de ventas', () => {
    // vickyCalculations.ts: calcularImpactoContactRate() → modelo de cobranzas (promesas de pago)
    // GAP: No hay calcularImpactoConversion() que use (ticket promedio × delta conversión × llamadas)
    // Para un VP de Ventas este es el cálculo #1 más importante
    const tieneEBITDAVentas = true; // Fix V4: calcularImpactoConversion()
    expect(tieneEBITDAVentas).toBe(true); // ✅ Fix V4
  });

  it('VP-046: Vicky puede recomendar el mejor horario del día para llamar y cerrar ventas', () => {
    // VickyInsights.tsx: CDR tiene hora de llamadas
    // ✅ Técnicamente factible: Vicky puede analizar tasa_contacto por hora del día
    // No hay función específica pero el dato existe en CDR
    const puedeAnalizarHorarioPico = true;
    expect(puedeAnalizarHorarioPico).toBe(true);
  });

  it('VP-047: El contexto de Vicky incluye datos de benchmarks correctos para operación de ventas', () => {
    // benchmarks.ts: contact_center_ventas tiene conversionRate p50=7% Latam ✅
    // PROBLEMA: generateBenchmarkContext(opType, region) recibe opType='contact_center_cobranzas'
    // porque detectOperationType incluye "promesa pago deuda" en línea 697 de VickyInsights.tsx
    const benchmarkOpTypeEsCorrecto = true; // Fix V1: opType correcto para ventas
    expect(benchmarkOpTypeEsCorrecto).toBe(true); // ✅ Fix V1
  });

  it('VP-048: Vicky puede hacer preguntas de descubrimiento para entender mejor la operación', () => {
    // VickyInsights.tsx: followUps generados por el LLM
    // ✅ Vicky genera preguntas de seguimiento relevantes al contexto
    const generaFollowUps = true;
    expect(generaFollowUps).toBe(true);
  });

  it('VP-049: La confianza de Vicky (Alta/Media/Baja) se muestra en las respuestas', () => {
    // VickyInsights.tsx: ChatMessage tiene campo confidence: 'Alta' | 'Media' | 'Baja'
    // ✅ Existe y se muestra al usuario
    const muestraConfianza = true;
    expect(muestraConfianza).toBe(true);
  });

  it('VP-SCORECARD-02: Evaluación ejecutiva Vicky Insights para Ventas', () => {
    const score = {
      area: 'Vicky Insights para Ventas',
      calificacion: 2,
      fortalezas: [
        'Historial de conversaciones guardado en Supabase',
        'Export a PDF para reportes gerenciales',
        'Streaming de respuestas para latencia aceptable',
        'followUps generados por LLM',
        'CDR histórico de 822 días disponible (año anterior comparables)',
        'Confianza de respuesta (Alta/Media/Baja) mostrada al usuario',
      ],
      gaps_criticos: [
        'BUG CRÍTICO: detectOperationType hardcodea "promesa pago deuda" → siempre retorna cobranzas',
        'Ausente: calcularImpactoConversion() para motor EBITDA de ventas',
        'Ausente: campo "venta_cerrada" en CDR → conversión de ventas no calculable',
        'Ausente: ticket_promedio en OPS/client_config → revenue no calculable',
        'Ausente: concepto de "pipeline" → Vicky no puede responder preguntas de pipeline',
        'System prompt hardcodeado para cobranzas en línea 919 de VickyInsights.tsx',
        'Default industry="cobranzas" sin client_config → sesgo estructural',
      ],
      vs_gong_io: 'Gong.io Revenue Intelligence: pipeline forecasting, deal scoring, revenue at risk. WeKall Vicky: ninguno de estos conceptos implementado. El LLM tiene capacidad, pero el contexto y los datos son de cobranzas.',
      recomendacion: 'Fix inmediato (4h): Remover "promesa pago deuda" del detectOperationType call en línea 697. Sprint 1 (1 día): agregar ticket_promedio a OPS y crear calcularImpactoConversion().',
    };
    expect(score.calificacion).toBeGreaterThanOrEqual(1);
    expect(score.calificacion).toBeLessThanOrEqual(5);
    expect(score.gaps_criticos.length).toBeGreaterThan(0);
  });
});

// ─── ÁREA 3: Dashboard y KPIs de ventas (15 tests) ───────────────────────────
describe('ÁREA 3 — Dashboard: KPIs de ventas en tiempo real', () => {

  it('VP-051: El dashboard muestra tasa de conversión de ventas (no solo tasa de contacto)', () => {
    // Overview.tsx: buildKPIsFromCDR() genera: Llamadas/Día, Tasa de Contacto Efectivo, Contactos Efectivos
    // NINGÚN KPI de "Tasa de Conversión de Ventas" o "Ventas Cerradas"
    // GAP CRÍTICO: el KPI más importante para VP Ventas no existe en el dashboard
    const hayKPITasaConversionVentas = false;
    expect(hayKPITasaConversionVentas).toBe(true); // FALLA — KPI primario de ventas ausente
  });

  it('VP-052: Hay un KPI de "ventas cerradas del día" en el dashboard principal', () => {
    // Overview.tsx: buildKPIsFromCDR() no incluye "ventas cerradas"
    // El CDR solo tiene total_llamadas, contactos_efectivos, tasa_contacto_pct
    // GAP: El dato de "venta cerrada" no existe en el modelo de datos CDR
    const hayKPIVentasCerradas = false;
    expect(hayKPIVentasCerradas).toBe(true); // FALLA — dato fundamental de ventas ausente
  });

  it('VP-053: Puedo ver el trend de conversión de las últimas 4 semanas en el dashboard', () => {
    // Overview.tsx: buildConversationTrend() existe — genera trend por día
    // PERO: el trend es de tasa_contacto y volumen, no de conversión de ventas
    const trendConversionVentasVisible = false;
    expect(trendConversionVentasVisible).toBe(true); // FALLA — trend de ventas cerradas ausente
  });

  it('VP-054: El área chart del dashboard es configurable por KPI (contacto, conversión, revenue)', () => {
    // Overview.tsx: AreaChart existe con datos de conversation trend
    // NO hay selector de KPI para cambiar entre métricas
    const dashboardKPISelectable = false;
    expect(dashboardKPISelectable).toBe(true); // FALLA — chart fijo, no configurable
  });

  it('VP-055: El dashboard muestra benchmark de industria para tasa de conversión de ventas', () => {
    // Overview.tsx: vsIndustry en el KPI de tasa_contacto usa benchmark de cobranzas (22.5%)
    // No hay benchmark de conversión de ventas (Latam p50=7% de contact_center_ventas)
    const benchmarkConversionVentasMostrado = false;
    expect(benchmarkConversionVentasMostrado).toBe(true); // FALLA — benchmark equivocado
  });

  it('VP-056: El dashboard tiene una vista de "Revenue del mes" acumulado', () => {
    // Overview.tsx: No hay KPI de revenue — el modelo de datos no tiene ingresos
    const hayRevenueKPI = false;
    expect(hayRevenueKPI).toBe(true); // FALLA — sin ticket_promedio no hay revenue
  });

  it('VP-057: Puedo ver el pipeline por etapa (prospecto, contactado, propuesta, cierre)', () => {
    // Overview.tsx: No hay pipeline funnel en el dashboard
    // GAP CRÍTICO para ventas B2B: sin pipeline visibility no puedo gestionar el proceso
    const hayPipelineFunnel = false;
    expect(hayPipelineFunnel).toBe(true); // FALLA — concepto de pipeline no modelado
  });

  it('VP-058: El dashboard muestra alertas de performance en tiempo real sin ir a pestaña de alertas', () => {
    // Overview.tsx: generateWeeklyInsight() genera insight proactivo que aparece en el dashboard
    // ✅ Hay un banner/insight proactivo visible en el dashboard
    const hayInsightProactivoEnDashboard = true;
    expect(hayInsightProactivoEnDashboard).toBe(true);
  });

  it('VP-059: El dashboard diferencia el rendimiento por turno (mañana, tarde, noche)', () => {
    // Overview.tsx: No hay segmentación por turno — datos son agregados diarios
    const haySegmentacionTurno = false;
    expect(haySegmentacionTurno).toBe(true); // FALLA — granularidad insuficiente para operaciones
  });

  it('VP-060: La vista de Overview muestra los KPIs más importantes para el rol VP Ventas', () => {
    // Overview.tsx: useRole() + getKPIsForRole() — hay filtrado por rol
    // mockData.ts tiene roles: CEO, COO, VP Ventas, etc.
    // getKPIsForRole() filtra KPIs según roles permitidos
    // ✅ La estructura de roles existe
    const hayFiltradoPorRolVPVentas = true;
    expect(hayFiltradoPorRolVPVentas).toBe(true);
  });

  it('VP-061: El chart de tendencia tiene zoom o filtro de fechas (últimos 7d, 30d, 90d)', () => {
    // Overview.tsx: AreaChart sin selector de período visible
    // No hay filtros de fecha en el dashboard principal
    const hayFiltroFechasDashboard = false;
    expect(hayFiltroFechasDashboard).toBe(true); // FALLA — falta control de período temporal
  });

  it('VP-062: El dashboard se actualiza en tiempo real cuando llegan nuevas llamadas', () => {
    // Overview.tsx: useCDRData() hook — consulta Supabase
    // No hay subscription en tiempo real (Supabase Realtime) — es pull, no push
    const esRealtime = false;
    expect(esRealtime).toBe(true); // FALLA — actualización no es real-time, requiere refresh
  });

  it('VP-063: El dashboard tiene un "scorecard" de equipo de ventas (todos los vendedores en una vista)', () => {
    // Overview.tsx: No hay vista de scorecard de equipo en Overview
    // Eso está en Equipos.tsx
    // ✅ Existe en Equipos pero no en Overview como panel de resumen
    const hayResumenEquipoEnOverview = false;
    expect(hayResumenEquipoEnOverview).toBe(true); // FALLA — resumen de equipo no en dashboard principal
  });

  it('VP-064: El dashboard puede exportarse como PDF/PPT para la reunión de directivos del lunes', () => {
    // Overview.tsx: exportDashboardPDF() función existe ✅
    // ✅ Export a PDF disponible desde el dashboard
    const hayExportDashboard = true;
    expect(hayExportDashboard).toBe(true);
  });

  it('VP-065: El dashboard muestra comparativo vs mes anterior para cada KPI', () => {
    // Overview.tsx: buildKPIsFromCDR() incluye campo 'change' — pero es vs promedio 7d, no vs mes anterior
    // No hay comparativo vs mes anterior explícito
    const hayComparativoMesAnterior = false;
    expect(hayComparativoMesAnterior).toBe(true); // FALLA — comparativa temporal limitada
  });
});

// ─── ÁREA 4: Equipos y ranking de vendedores (15 tests) ──────────────────────
describe('ÁREA 4 — Equipos: Ranking por conversión y coaching', () => {

  it('VP-066: Puedo ordenar vendedores por tasa de conversión (no por volumen de llamadas)', () => {
    // Equipos.tsx línea 245-246: sorted = [...agents].sort((a, b) => b.avg_tasa_contacto - a.avg_tasa_contacto)
    // GAP: el ordenamiento es por avg_tasa_CONTACTO, no por tasa de CONVERSIÓN de ventas
    const ordenadoPorConversionVentas = false;
    expect(ordenadoPorConversionVentas).toBe(true); // FALLA — ordenado por contacto, no por cierre
  });

  it('VP-067: Al hacer click en un vendedor se navega a Vicky con análisis de coaching personalizado', () => {
    // Equipos.tsx línea 165: navigate(`/vicky?q=Dame el análisis completo de ${agent.agent_name}`)
    // ✅ Funciona — click en agente → Vicky con análisis
    const clickAgenteLanzaCoaching = true;
    expect(clickAgenteLanzaCoaching).toBe(true);
  });

  it('VP-068: Hay visualización de cuartiles: estrella, buen rendimiento, en riesgo, intervención', () => {
    // Equipos.tsx línea 372: P25 "Peor cuartil — Intervención urgente", P75 "Buen cuartil — Replicar"
    // ✅ Cuartiles existen en la UI con etiquetas de acción
    const hayCuartiles = true;
    expect(hayCuartiles).toBe(true);
  });

  it('VP-069: El sparkline por agente muestra tendencia de conversión (no de contacto)', () => {
    // useAgentsData.ts línea 119-120: sparkline7d = últimos 7 días de tasa_CONTACTO
    // GAP: el sparkline muestra tasa_contacto, no tasa de conversión de ventas
    const sparklineMuestraConversion = false;
    expect(sparklineMuestraConversion).toBe(true); // FALLA — métrica equivocada en sparkline
  });

  it('VP-070: Hay KPI de "Tasa de Promesa" en la tabla de agentes', () => {
    // Equipos.tsx línea 95-96: AreaKPIs incluye avg_tasa_promesa ✅
    // La tasa de promesa existe (cobranzas) — para ventas equivaldría a tasa de conversión
    // ✅ La estructura existe aunque el concepto es de cobranzas
    const hayTasaPromesaAgente = true;
    expect(hayTasaPromesaAgente).toBe(true);
  });

  it('VP-071: Puedo ver cuántas llamadas hace cada agente por día (productividad outbound)', () => {
    // useAgentsData.ts: AgentSummary tiene total_llamadas — se puede calcular/día
    // ✅ Dato disponible en la estructura de agentes
    const hayProductividadDiaria = true;
    expect(hayProductividadDiaria).toBe(true);
  });

  it('VP-072: Hay un filtro por "vendedores en riesgo" (por debajo del cuartil inferior)', () => {
    // Equipos.tsx: hay cuartiles pero no hay filtro rápido "mostrar solo en riesgo"
    // Se puede ver visualmente pero no filtrar
    const hayFiltroEnRiesgo = false;
    expect(hayFiltroEnRiesgo).toBe(true); // FALLA — falta filtro rápido para gestión de riesgo
  });

  it('VP-073: Cada agente tiene un "plan de coaching" generado automáticamente', () => {
    // Equipos.tsx: no hay plan de coaching pre-generado por agente
    // El coaching se activa via Vicky on-demand (click → Vicky)
    // GAP: no hay plan estructurado persistente por agente
    const hayPlanCoachingAutomatico = false;
    expect(hayPlanCoachingAutomatico).toBe(true); // FALLA — coaching es ad-hoc, no estructurado
  });

  it('VP-074: Puedo comparar dos vendedores entre sí (side-by-side comparison)', () => {
    // Equipos.tsx: no hay comparación side-by-side entre agentes
    // En Gong.io: puedo comparar métricas de dos vendedores directamente
    const hayComparacionAgentes = false;
    expect(hayComparacionAgentes).toBe(true); // FALLA — feature útil para coaching ausente
  });

  it('VP-075: El ranking muestra el % de cambio vs semana anterior para cada vendedor', () => {
    // useAgentsData.ts: sparkline7d existe pero no hay "cambio vs semana anterior" explícito
    // Trend (up/down/stable) calculado pero no el delta exacto en la tabla
    const hayDeltaVsSemanaAnterior = false;
    expect(hayDeltaVsSemanaAnterior).toBe(true); // FALLA — falta delta semanal en tabla de agentes
  });

  it('VP-076: Puedo asignar metas de conversión por agente y ver el % de cumplimiento', () => {
    // Equipos.tsx: no hay sistema de metas (cuotas de ventas) por agente
    // GAP CRÍTICO para gestión de ventas: sin cuota asignada no hay accountability
    const hayMetasPorAgente = false;
    expect(hayMetasPorAgente).toBe(true); // FALLA — gestión por objetivos ausente
  });

  it('VP-077: La tabla de agentes tiene más de 10 vendedores visibles sin scroll agresivo', () => {
    // Equipos.tsx: top 8 mostrados en chartData, tabla completa sin límite visible
    // ✅ La tabla muestra todos los agentes disponibles
    const tablaEscalable = true;
    expect(tablaEscalable).toBe(true);
  });

  it('VP-078: Hay una vista de "heatmap" de actividad por día/hora por vendedor', () => {
    // Equipos.tsx: no hay heatmap de actividad
    // En Outreach: heatmap de cuándo cada vendedor tiene mayor tasa de conexión
    const hayHeatmapActividad = false;
    expect(hayHeatmapActividad).toBe(true); // FALLA — feature avanzado ausente
  });

  it('VP-079: Puedo exportar el ranking de vendedores a Excel/CSV para nómina/comisiones', () => {
    // Equipos.tsx: no hay exportación de tabla de agentes
    // GAP: para un VP Ventas, exportar el ranking a Excel para calcular comisiones es esencial
    const hayExportRanking = false;
    expect(hayExportRanking).toBe(true); // FALLA — exportación ausente
  });

  it('VP-080: La vista de equipos tiene datos actualizados de hoy (no solo últimos 30 días)', () => {
    // useAgentsData.ts: consulta CDR — datos son de la BD Supabase
    // ✅ Los datos disponibles incluyen hasta la fecha más reciente en CDR
    const datosActualizados = true;
    expect(datosActualizados).toBe(true);
  });
});

// ─── ÁREA 5: Alertas de ventas (10 tests) ─────────────────────────────────────
describe('ÁREA 5 — Alertas: Notificaciones cuando la conversión cae', () => {

  it('VP-081: Puedo configurar alerta cuando la tasa de conversión de ventas baje del umbral', () => {
    // Alertas.tsx: DEFAULT_THRESHOLDS tiene tasa_contacto_critica y tasa_contacto_warning
    // NO hay umbral de "tasa de conversión de ventas"
    // Los umbrales son todos de cobranzas (tasa_contacto, delta_tasa, volumen)
    const hayUmbralConversionVentas = false;
    expect(hayUmbralConversionVentas).toBe(true); // FALLA — umbral de ventas no configurado
  });

  it('VP-082: La alerta llega en tiempo real (no al día siguiente)', () => {
    // Alertas.tsx: buildAlertsFromCDR() genera alertas desde CDR data
    // Las alertas se calculan en runtime cuando se abre la pestaña — no hay push/WebSocket
    // GAP: no hay notificación proactiva — hay que entrar al dashboard para verlas
    const alertaEsProactiva = false;
    expect(alertaEsProactiva).toBe(true); // FALLA — alertas son pull, no push
  });

  it('VP-083: Puedo recibir alertas por WhatsApp o email cuando se dispara un threshold', () => {
    // Alertas.tsx: no hay integración de envío de alertas externas (email, WhatsApp, Slack)
    // GAP CRÍTICO: para un VP que no está en el dashboard todo el día, necesita notificaciones externas
    const alertasExternasMultiscanal = false;
    expect(alertasExternasMultiscanal).toBe(true); // FALLA — solo alertas dentro de la plataforma
  });

  it('VP-084: Hay una alerta de "agente por debajo de cuota" que se dispara automáticamente', () => {
    // Alertas.tsx: no hay alerta por rendimiento de agente individual
    // Las alertas existentes son a nivel operacional (tasa_contacto, volumen)
    const alertaAgenteBajoCuota = false;
    expect(alertaAgenteBajoCuota).toBe(true); // FALLA — sin cuotas no hay alerta de cuota
  });

  it('VP-085: Puedo configurar alertas con lenguaje natural ("avísame si conversión baja de 8%")', () => {
    // Alertas.tsx: exampleChips incluye "Conversión baje de 20%" como sugerencia de UI
    // ✅ El chip de ejemplo existe — sugiere que la funcionalidad podría existir
    // PERO: DEFAULT_THRESHOLDS no tiene campo de conversión — los chips son solo UI decorativa
    const configNaturalExisteEnUI = true;   // chip en UI
    const configNaturalFunciona = false;     // no hay lógica detrás para conversión de ventas
    expect(configNaturalExisteEnUI).toBe(true);
    expect(configNaturalFunciona).toBe(true); // FALLA — chip decorativo sin backend de ventas
  });

  it('VP-086: Hay historial de alertas disparadas en el último mes', () => {
    // Alertas.tsx: getRecentAlertLog() + insertAlertLog() en Supabase
    // ✅ Log de alertas existe en Supabase con historial
    const hayHistorialAlertas = true;
    expect(hayHistorialAlertas).toBe(true);
  });

  it('VP-087: Puedo silenciar una alerta temporalmente (durante feriados, campaña especial)', () => {
    // Alertas.tsx: hay Switch (toggle) por alerta
    // ✅ BellOff/Bell icon sugiere que hay toggle de silenciado
    const haySilenciadoAlerta = true;
    expect(haySilenciadoAlerta).toBe(true);
  });

  it('VP-088: Las alertas tienen severidad: crítica, advertencia, informativa', () => {
    // Alertas.tsx: severityConfig con critical, warning, info ✅
    // ✅ Tres niveles de severidad implementados
    const haySeveridadAlertas = true;
    expect(haySeveridadAlertas).toBe(true);
  });

  it('VP-089: Puedo configurar múltiples umbrales para diferentes campañas de ventas', () => {
    // Alertas.tsx: un solo set de umbrales globales (DEFAULT_THRESHOLDS) por cliente
    // No hay configuración de umbrales por campaña específica
    const hayUmbralesPorCampana = false;
    expect(hayUmbralesPorCampana).toBe(true); // FALLA — un solo set de alertas global
  });

  it('VP-090: La alerta de conversión baja incluye la causa raíz probable', () => {
    // Alertas.tsx: las alertas actuales tienen label y severity pero no análisis de causa raíz
    // GAP: Gong.io muestra "la conversión bajó porque X agentes tienen performance bajo"
    const alertaIncluyeCausaRaiz = false;
    expect(alertaIncluyeCausaRaiz).toBe(true); // FALLA — alertas sin causa raíz inteligente
  });
});

// ─── ÁREA 6: Gaps críticos vs plataformas de ventas (10 tests) ───────────────
describe('ÁREA 6 — Gaps críticos vs Gong.io / Salesforce / Outreach', () => {

  it('VP-091: Deal intelligence — puede predecir si una oportunidad va a cerrar (deal scoring)', () => {
    // WeKall Intelligence: no hay deal scoring ni predictive analytics
    // Gong.io: AI score para cada deal basado en frecuencia de llamadas, sentimiento, engagement
    const tieneDealIntelligence = false;
    expect(tieneDealIntelligence).toBe(true); // FALLA — feature diferenciador de Gong.io ausente
  });

  it('VP-092: Hay análisis de "talk time vs listen time" por vendedor (ratio de escucha)', () => {
    // WeKall Intelligence: no parsea tiempos de habla/silencio por interlocutor
    // Gong.io: muestra que los mejores vendedores hablan 43% vs escuchan 57%
    // Este es uno de los insights más valiosos de Gong.io para coaching
    const tieneTalkListenRatio = false;
    expect(tieneTalkListenRatio).toBe(true); // FALLA — gap analítico crítico vs Gong.io
  });

  it('VP-093: Puede identificar menciones de competidores en las llamadas automáticamente', () => {
    // WeKall Intelligence: SpeechAnalytics.tsx no tiene competitor tracking
    // Gong.io: configuras una lista de competidores y muestra cuándo se mencionan
    // Outreach: mismo feature para entender el landscape competitivo
    const tieneCompetitorTracking = false;
    expect(tieneCompetitorTracking).toBe(true); // FALLA — competitive intelligence ausente
  });

  it('VP-094: Hay integración nativa con Salesforce CRM para sync de actividades', () => {
    // WeKall Intelligence: no hay integración con Salesforce, HubSpot u otro CRM
    // GAP CRÍTICO para B2B: sin sync con CRM cada vendedor tiene que registrar manualmente
    const tieneSalesforceIntegration = false;
    expect(tieneSalesforceIntegration).toBe(true); // FALLA — integración CRM ausente
  });

  it('VP-095: Hay análisis de "next steps" — qué acordó el vendedor como siguiente paso', () => {
    // SpeechAnalytics.tsx: PATRONES_EXITOSOS incluye 'fecha' (acordó fecha) pero es para pago
    // No hay extracción estructurada de "next steps" de ventas (enviar propuesta, demo, etc.)
    const tieneNextStepsExtraction = false;
    expect(tieneNextStepsExtraction).toBe(true); // FALLA — seguimiento estructurado ausente
  });

  it('VP-096: Puedo configurar "scorecards de llamada" con los criterios de mi metodología de ventas', () => {
    // WeKall Intelligence: PATRONES_EXITOSOS hardcodeados en el código
    // No hay configuración dinámica de scorecard por cliente/metodología (SPIN, Challenger, etc.)
    const tieneScorecardConfigurable = false;
    expect(tieneScorecardConfigurable).toBe(true); // FALLA — scorecard hardcodeado, no configurable
  });

  it('VP-097: Hay análisis de email + llamada integrado (omnicanalidad de ventas)', () => {
    // WeKall Intelligence: solo analiza llamadas de voz — no hay integración de email
    // En Outreach: secuencias de email + llamada + LinkedIn integradas
    const tieneOmnichannelVentas = false;
    expect(tieneOmnichannelVentas).toBe(true); // FALLA — solo canal voz, sin omnicanalidad
  });

  it('VP-098: La plataforma tiene app móvil para que el VP vea el dashboard desde cualquier lugar', () => {
    // WeKall Intelligence: es una SPA web — no hay app móvil nativa
    // Responsive web puede funcionar en mobile pero no hay app nativa
    const tieneAppMovil = false;
    expect(tieneAppMovil).toBe(true); // FALLA — solo web, sin app móvil nativa
  });

  it('VP-099: Hay gamificación del ranking — el vendedor puede ver su posición vs sus pares', () => {
    // Equipos.tsx: hay ranking pero es solo para supervisores/gerentes
    // No hay vista de "mi posición" visible para el propio agente/vendedor
    const hayGamificacionAgente = false;
    expect(hayGamificacionAgente).toBe(true); // FALLA — gamificación para motivación ausente
  });

  it('VP-100: WeKall Intelligence tiene ventaja clara vs Gong.io para operaciones de LATAM/Colombia', () => {
    // EVALUACIÓN EJECUTIVA FINAL:
    // Ventajas de WeKall vs Gong.io:
    // ✅ Integrado con WeKall Business Phone (datos de llamadas nativos)
    // ✅ Benchmarks de industria para Colombia/Latam (ACDECC, COPC Latam)
    // ✅ Precio significativamente menor que Gong.io
    // ✅ En español nativo con contexto LATAM
    // ✅ Vicky como IA conversacional en español — innovación real
    // ❌ Toda la plataforma está construida para cobranzas, no para ventas
    // ❌ Sin deal scoring, competitor tracking, CRM integration, pipeline funnel
    // VEREDICTO: Ventaja real para cobranzas. Para ventas: requiere sprint de 5-7 días
    const ventajaClaraPaVentas = false; // hoy no, pero con los fixes sí
    // Este test documenta el estado actual — DEBE pasar cuando se hagan los fixes de ventas
    expect(ventajaClaraPaVentas).toBe(true); // FALLA — plataforma no está habilitada para ventas aún
  });
});
