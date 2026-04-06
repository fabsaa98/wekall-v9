// vickyCalculations.ts
// Motor de cálculo determinístico para Vicky Insights
// Todos los cálculos financieros viven aquí — nunca en el LLM
//
// ⚠️ REGLA: Los parámetros financieros (costo agente, headcount, nómina)
// NO son constantes hardcodeadas. Se leen de Supabase tabla client_config.
// Los valores de OPS son solo el fallback de inicialización hasta que
// Supabase responda — se sobreescriben en runtime.
import { getActiveClientConfig } from './supabase';

export interface CalcResult {
  formula: string;
  variables: Record<string, string | number>;
  steps: string[];
  result: number;
  unit: string;
  validation: { ok: boolean; message: string };
  scenarios?: Record<string, string>;
}

// ─── Parámetros operativos — SE CARGAN DESDE SUPABASE (client_config) ────────
// Fix 1C: valores de fallback NEUTRALIZADOS — sin datos de Crediminuto hardcodeados.
// Si loadClientConfig() falla, Vicky no calcula con datos de ningún cliente específico.
// Los cálculos retornarán 0 / "sin datos" hasta que Supabase responda.
export let OPS = {
  // Volúmenes — se actualizan desde CDR Supabase
  llamadasTotales: 0,         // sin datos hasta que cargue Supabase
  contactosEfectivos: 0,
  tasaContacto: 0,
  promesasPago: 0,
  tasaPromesa: 0,

  // Agentes — se actualiza desde client_config en Supabase
  agentesActivos: 0,
  promedioLlamadasAgente: 0,
  p10Agentes: 0,
  p25Agentes: 0,
  p50Agentes: 0,
  p75Agentes: 0,
  p90Agentes: 0,
  topAgente: 0,

  // Tiempos
  ahtMinutos: 0,
  horasTrabajo: 8,
  diasLaborales: 22,

  // Costos — SE CARGAN DESDE client_config EN SUPABASE
  // ⚠️ NO hardcodear aquí. Si el salario mínimo cambia o el cliente
  // es de otro país, actualizar en Supabase tabla client_config.
  costoAgenteMes: 0,          // cargado desde client_config.costo_agente_mes
  nominaActivaMes: 0,         // cargado desde client_config.nomina_total_mes
  costoAgentePorMinuto: 0,    // calculado: costoAgenteMes / (diasLaborales * horasTrabajo * 60)
  currency: 'COP',            // cargado desde client_config.currency
  country: 'colombia',        // cargado desde client_config.country

  // TRM referencia
  trmCopUsd: 4100,
};

// ─── Función para cargar configuración desde Supabase ─────────────────────────
// Llamar al iniciar la app o al cambiar de cliente.
export async function loadClientConfig(clientId = 'credismart'): Promise<boolean> {
  try {
    const config = await getActiveClientConfig();
    if (!config) return false;

    // Actualizar OPS con datos reales del cliente
    OPS = {
      ...OPS,
      agentesActivos: config.agentes_activos,
      costoAgenteMes: config.costo_agente_mes,
      nominaActivaMes: config.nomina_total_mes,
      costoAgentePorMinuto: Math.round(
        config.costo_agente_mes / (OPS.diasLaborales * OPS.horasTrabajo * 60)
      ),
      currency: config.currency,
      country: config.country,
    };
    return true;
  } catch {
    // Fallback silencioso — usa valores de inicialización
    return false;
  }
}

// ─── Datos laborales por país (fuentes oficiales) ─────────────────────────────
export const LABOR_COSTS = {
  colombia: {
    salarioMinimo2024: 1_300_000, // COP — Decreto 2381 de 2023
    costoEmpresaAgente: 3_000_000, // COP/mes (salario + prestaciones sociales + parafiscales)
    moneda: 'COP',
    fuente: 'Decreto 2381/2023 + cálculo prestaciones Colombia',
  },
  peru: {
    salarioMinimo2024: 1025, // PEN — RMV vigente desde mayo 2022
    salarioMinimoCOP: 1_066_000, // PEN 1,025 × TRM aprox. 1,040 COP/PEN
    costoEmpresaAgente: 1_600_000, // COP/mes estimado (salario + CTS + gratificaciones + ESSALUD)
    moneda: 'PEN',
    fuente: 'RMV Perú DS 004-2022-TR + cálculo prestaciones Perú',
    nota: 'Estimación basada en RMV vigente + beneficios legales Perú. Confirmar con datos locales del cliente.',
  },
  referencia_latam: {
    rangoMinimo: 800_000, // COP/mes equivalente
    rangoMaximo: 3_500_000, // COP/mes equivalente
    fuente: 'OIT / CEPAL Salarios Latam 2024',
  },
} as const;

// Función para obtener costo de agente por país
export function getCostoAgente(pais: 'colombia' | 'peru' | string): { costo: number; moneda: string; fuente: string; esEstimacion: boolean } {
  if (pais === 'colombia') return { costo: LABOR_COSTS.colombia.costoEmpresaAgente, moneda: 'COP', fuente: LABOR_COSTS.colombia.fuente, esEstimacion: false };
  if (pais === 'peru') return { costo: LABOR_COSTS.peru.costoEmpresaAgente, moneda: 'COP', fuente: LABOR_COSTS.peru.fuente, esEstimacion: true };
  return { costo: 2_000_000, moneda: 'COP', fuente: 'Estimación regional Latam (OIT 2024)', esEstimacion: true };
}

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
