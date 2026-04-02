// vickyCalculations.ts
// Motor de cálculo determinístico para Vicky Insights
// Todos los cálculos financieros viven aquí — nunca en el LLM

export interface CalcResult {
  formula: string;
  variables: Record<string, string | number>;
  steps: string[];
  result: number;
  unit: string;
  validation: { ok: boolean; message: string };
  scenarios?: Record<string, string>;
}

// ─── Constantes operativas reales (CDR 30-Mar-2026) ────────────────────────────
export const OPS = {
  // Volúmenes
  llamadasTotales: 16129,
  contactosEfectivos: 6951,
  tasaContacto: 0.431,
  promesasPago: 2780,
  tasaPromesa: 0.40,

  // Agentes
  agentesActivos: 81,
  promedioLlamadasAgente: 110.7,
  p10Agentes: 49,
  p25Agentes: 76,
  p50Agentes: 120,
  p75Agentes: 143,
  p90Agentes: 154,
  topAgente: 261, // Teresa Meza

  // Tiempos
  ahtMinutos: 8.1,
  horasTrabajo: 8,
  diasLaborales: 22,

  // Costos Colombia
  costoAgenteMes: 3_000_000,
  nominaActivaMes: 243_000_000,
  costoAgentePorMinuto: 284, // 3M / 22 días / 8h / 60min

  // TRM referencia
  trmCopUsd: 4100,
} as const;

// ─── Funciones de cálculo ────────────────────────────────────────────────────────

export function calcularImpactoAHT(ahtObjetivo: number): CalcResult {
  // Validar rango
  if (ahtObjetivo < 3 || ahtObjetivo > 12) {
    return {
      formula: 'calcularImpactoAHT',
      variables: { ahtObjetivo },
      steps: ['AHT objetivo fuera de rango operativo (3-12 min)'],
      result: 0,
      unit: 'COP/mes',
      validation: { ok: false, message: `AHT objetivo ${ahtObjetivo} min está fuera del rango operativo (3-12 min)` },
    };
  }

  const diferencia = OPS.ahtMinutos - ahtObjetivo;
  if (diferencia <= 0) {
    return {
      formula: 'calcularImpactoAHT',
      variables: { ahtObjetivo },
      steps: ['El AHT objetivo es mayor o igual al AHT actual — no hay liberación de capacidad'],
      result: 0,
      unit: 'COP/mes',
      validation: { ok: false, message: 'AHT objetivo debe ser menor al AHT actual (8.1 min)' },
    };
  }

  // CORRECTO: AHT aplica solo a contactos efectivos, no a llamadas totales
  const minutosLiberadosDia = diferencia * OPS.contactosEfectivos;
  const minutosPorAgenteDia = OPS.horasTrabajo * 60;
  const agentesEquivalentes = minutosLiberadosDia / minutosPorAgenteDia;
  const ahorroMes = agentesEquivalentes * OPS.costoAgenteMes;

  // Escenario B: llamadas adicionales con la capacidad liberada
  const llamadasAdicionalesDia = minutosLiberadosDia / OPS.ahtMinutos;
  const contactosAdicionalesDia = llamadasAdicionalesDia * OPS.tasaContacto;
  const promesasAdicionalesDia = contactosAdicionalesDia * OPS.tasaPromesa;
  const promesasAdicionalesMes = promesasAdicionalesDia * OPS.diasLaborales;

  // Validación
  const ok = agentesEquivalentes <= OPS.agentesActivos && ahorroMes <= OPS.nominaActivaMes;

  return {
    formula: 'calcularImpactoAHT',
    variables: {
      'AHT actual': `${OPS.ahtMinutos} min`,
      'AHT objetivo': `${ahtObjetivo} min`,
      'Contactos efectivos/día': `${OPS.contactosEfectivos} (NO las ${OPS.llamadasTotales} llamadas totales)`,
      'Costo/agente/mes': `COP $${OPS.costoAgenteMes.toLocaleString()}`,
    },
    steps: [
      `Diferencia AHT: ${OPS.ahtMinutos} - ${ahtObjetivo} = ${diferencia.toFixed(1)} min`,
      `Minutos liberados/día: ${diferencia.toFixed(1)} × ${OPS.contactosEfectivos} = ${minutosLiberadosDia.toFixed(0)} min`,
      `Agentes equivalentes: ${minutosLiberadosDia.toFixed(0)} / ${minutosPorAgenteDia} min/agente = ${agentesEquivalentes.toFixed(1)} agentes`,
      `Ahorro Escenario A: ${agentesEquivalentes.toFixed(1)} × COP $3,000,000 = COP $${Math.round(ahorroMes).toLocaleString()}/mes`,
      `Llamadas adicionales (Esc. B): ${minutosLiberadosDia.toFixed(0)} / ${OPS.ahtMinutos} = ${llamadasAdicionalesDia.toFixed(0)}/día`,
      `Promesas adicionales (Esc. B): ${promesasAdicionalesDia.toFixed(0)}/día = ${promesasAdicionalesMes.toFixed(0)}/mes`,
    ],
    result: Math.round(ahorroMes),
    unit: 'COP/mes (Escenario A — reducción costo)',
    validation: {
      ok,
      message: ok
        ? `✅ ${agentesEquivalentes.toFixed(1)} agentes < 81 activos ✓ | COP $${(ahorroMes / 1_000_000).toFixed(0)}M < COP $243M nómina ✓`
        : `⚠️ Resultado fuera de rango: revisar parámetros`,
    },
    scenarios: {
      'Escenario A (eficiencia)': `COP $${(ahorroMes / 1_000_000).toFixed(1)}M/mes en ahorro de nómina (${agentesEquivalentes.toFixed(1)} agentes equivalentes)`,
      'Escenario B (crecimiento)': `${Math.round(promesasAdicionalesMes).toLocaleString()} promesas de pago adicionales/mes sin aumentar headcount`,
      'Para EBITDA completo': 'Se necesita el ticket promedio de cartera por cliente (pendiente de Crediminuto)',
    },
  };
}

export function calcularImpactoContactRate(tasaObjetivo: number): CalcResult {
  if (tasaObjetivo <= OPS.tasaContacto || tasaObjetivo > 1) {
    return {
      formula: 'calcularImpactoContactRate',
      variables: { tasaObjetivo: `${(tasaObjetivo * 100).toFixed(1)}%` },
      steps: ['Tasa objetivo debe ser mayor a la actual (43.1%) y no mayor al 100%'],
      result: 0,
      unit: 'promesas/mes',
      validation: { ok: false, message: `Tasa objetivo ${(tasaObjetivo * 100).toFixed(1)}% no es válida` },
    };
  }

  const contactosActualesDia = OPS.contactosEfectivos;
  const contactosObjetivoDia = OPS.llamadasTotales * tasaObjetivo;
  const contactosAdicionalesDia = contactosObjetivoDia - contactosActualesDia;
  const promesasAdicionalesDia = contactosAdicionalesDia * OPS.tasaPromesa;
  const promesasAdicionalesMes = promesasAdicionalesDia * OPS.diasLaborales;

  const ok = contactosAdicionalesDia <= OPS.llamadasTotales && promesasAdicionalesDia <= OPS.promesasPago;

  return {
    formula: 'calcularImpactoContactRate',
    variables: {
      'Tasa actual': '43.1%',
      'Tasa objetivo': `${(tasaObjetivo * 100).toFixed(1)}%`,
      'Llamadas totales/día': OPS.llamadasTotales,
      'Tasa promesa de pago': '40%',
    },
    steps: [
      `Contactos actuales: 43.1% × 16,129 = ${contactosActualesDia} /día`,
      `Contactos objetivo: ${(tasaObjetivo * 100).toFixed(1)}% × 16,129 = ${contactosObjetivoDia.toFixed(0)} /día`,
      `Contactos adicionales: ${contactosObjetivoDia.toFixed(0)} - ${contactosActualesDia} = ${contactosAdicionalesDia.toFixed(0)} /día`,
      `Promesas adicionales/día: ${contactosAdicionalesDia.toFixed(0)} × 40% = ${promesasAdicionalesDia.toFixed(0)}`,
      `Promesas adicionales/mes: ${promesasAdicionalesDia.toFixed(0)} × 22 días = ${promesasAdicionalesMes.toFixed(0)}`,
    ],
    result: Math.round(promesasAdicionalesMes),
    unit: 'promesas adicionales/mes',
    validation: {
      ok,
      message: ok
        ? `✅ ${promesasAdicionalesDia.toFixed(0)} prom/día adicionales < 2,780 actual ✓`
        : '⚠️ Resultado supera límite lógico — revisar',
    },
    scenarios: {
      'Promesas adicionales/mes': `${Math.round(promesasAdicionalesMes).toLocaleString()}`,
      'Para EBITDA': 'Multiplicar por ticket promedio de cartera (pendiente de Crediminuto)',
    },
  };
}

export function calcularImpactoAgentes(percentilObjetivo: number): CalcResult {
  const volumenObjetivo = percentilObjetivo === 50 ? OPS.p50Agentes :
                         percentilObjetivo === 75 ? OPS.p75Agentes :
                         percentilObjetivo === 90 ? OPS.p90Agentes : OPS.p50Agentes;

  const agentesEnP25 = Math.round(OPS.agentesActivos * 0.25); // ~20 agentes
  const llamadasAdicionalesDia = (volumenObjetivo - OPS.p25Agentes) * agentesEnP25;
  const contactosAdicionalesDia = llamadasAdicionalesDia * OPS.tasaContacto;
  const promesasAdicionalesDia = contactosAdicionalesDia * OPS.tasaPromesa;
  const promesasAdicionalesMes = promesasAdicionalesDia * OPS.diasLaborales;

  return {
    formula: 'calcularImpactoAgentes',
    variables: {
      'P25 actual (peor cuartil)': `${OPS.p25Agentes} llamadas/día`,
      'P50 (mediana real)': `${OPS.p50Agentes} llamadas/día`,
      'P75 (mejor cuartil)': `${OPS.p75Agentes} llamadas/día`,
      'Agentes en peor cuartil': agentesEnP25,
      'Percentil objetivo': percentilObjetivo,
      'Volumen objetivo': `${volumenObjetivo} llamadas/día`,
    },
    steps: [
      `Agentes en P25: ~${agentesEnP25} (25% de 81)`,
      `Brecha: ${volumenObjetivo} - ${OPS.p25Agentes} = ${volumenObjetivo - OPS.p25Agentes} llamadas/agente/día`,
      `Llamadas adicionales: ${volumenObjetivo - OPS.p25Agentes} × ${agentesEnP25} agentes = ${llamadasAdicionalesDia}/día`,
      `Contactos adicionales: ${llamadasAdicionalesDia} × 43.1% = ${contactosAdicionalesDia.toFixed(0)}/día`,
      `Promesas adicionales: ${contactosAdicionalesDia.toFixed(0)} × 40% = ${promesasAdicionalesDia.toFixed(0)}/día`,
      `Promesas/mes: ${promesasAdicionalesDia.toFixed(0)} × 22 = ${promesasAdicionalesMes.toFixed(0)}`,
    ],
    result: Math.round(promesasAdicionalesMes),
    unit: 'promesas adicionales/mes',
    validation: {
      ok: llamadasAdicionalesDia <= OPS.llamadasTotales,
      message: `✅ ${llamadasAdicionalesDia} llamadas adicionales < 16,129 total ✓`,
    },
    scenarios: {
      'Promesas adicionales/mes': `${Math.round(promesasAdicionalesMes).toLocaleString()}`,
      'Sin cambios de headcount ni costo': 'Solo mejora de productividad del peor cuartil',
    },
  };
}

export function getEstadoOperativo(): Record<string, string | number> {
  return {
    llamadasTotales: OPS.llamadasTotales,
    contactosEfectivos: OPS.contactosEfectivos,
    tasaContacto: '43.1%',
    promesasPago: OPS.promesasPago,
    tasaPromesa: '40%',
    aht: `${OPS.ahtMinutos} min`,
    agentesActivos: OPS.agentesActivos,
    promedioAgente: `${OPS.promedioLlamadasAgente} llamadas/día`,
    p25Agentes: `${OPS.p25Agentes} llamadas/día (peor cuartil)`,
    p50Agentes: `${OPS.p50Agentes} llamadas/día (mediana)`,
    p75Agentes: `${OPS.p75Agentes} llamadas/día (mejor cuartil)`,
    nominaActivaMes: `COP $${OPS.nominaActivaMes.toLocaleString()}/mes`,
    costoAgenteMes: `COP $${OPS.costoAgenteMes.toLocaleString()}/mes`,
  };
}
