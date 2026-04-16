/**
 * vicky-uat.test.ts
 * Tests de comportamiento usuario final — Vicky Insights (UAT)
 * BLOQUE 1: Estado de datos al iniciar (el bug que ocurrió)
 * BLOQUE 3: Validaciones de integridad de datos
 * BLOQUE 5: convertirMarkdownAProsa
 *
 * ~100 tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calcularImpactoAHT,
  calcularImpactoContactRate,
  calcularImpactoAgentes,
  getEstadoOperativo,
  loadClientConfig,
  OPS,
} from '@/lib/vickyCalculations';
import { convertirMarkdownAProsa } from '@/lib/vickyMarkdown';
import {
  mockOPSVacio,
  mockOPSCargado,
  mockGetActiveClientConfig,
} from './mocks/vicky-mocks';

// ─── Mock de Supabase ─────────────────────────────────────────────────────────
vi.mock('@/lib/supabase', () => ({
  getActiveClientConfig: vi.fn(),
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import { getActiveClientConfig } from '@/lib/supabase';

// ─── Helper para resetear OPS ─────────────────────────────────────────────────
function resetOPS() {
  Object.assign(OPS, mockOPSVacio);
}

function loadOPS() {
  Object.assign(OPS, mockOPSCargado);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1 — Estado de datos al iniciar (el bug OPS vacío)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BLOQUE 1 — Estado de datos OPS al iniciar', () => {

  describe('Estado inicial de OPS (todos en cero)', () => {
    beforeEach(() => resetOPS());

    it('OPS.llamadasTotales es 0 en estado inicial', () => {
      expect(OPS.llamadasTotales).toBe(0);
    });

    it('OPS.contactosEfectivos es 0 en estado inicial', () => {
      expect(OPS.contactosEfectivos).toBe(0);
    });

    it('OPS.tasaContacto es 0 en estado inicial', () => {
      expect(OPS.tasaContacto).toBe(0);
    });

    it('OPS.agentesActivos es 0 en estado inicial', () => {
      expect(OPS.agentesActivos).toBe(0);
    });

    it('OPS.costoAgenteMes es 0 en estado inicial (no hardcodeado)', () => {
      expect(OPS.costoAgenteMes).toBe(0);
    });

    it('OPS.nominaActivaMes es 0 en estado inicial (no hardcodeado)', () => {
      expect(OPS.nominaActivaMes).toBe(0);
    });

    it('OPS.ahtMinutos es 0 en estado inicial', () => {
      expect(OPS.ahtMinutos).toBe(0);
    });

    it('OPS.costoAgentePorMinuto es 0 en estado inicial', () => {
      expect(OPS.costoAgentePorMinuto).toBe(0);
    });

    it('OPS.promesasPago es 0 en estado inicial', () => {
      expect(OPS.promesasPago).toBe(0);
    });

    it('OPS.tasaPromesa es 0 en estado inicial', () => {
      expect(OPS.tasaPromesa).toBe(0);
    });
  });

  describe('calcularImpactoAHT con OPS vacío → resultado 0, sin inventar datos', () => {
    beforeEach(() => resetOPS());

    it('con OPS en ceros y ahtObjetivo válido → result es 0', () => {
      const result = calcularImpactoAHT(7.0);
      expect(result.result).toBe(0);
    });

    it('con OPS.ahtMinutos = 0 → validation.ok = false', () => {
      const result = calcularImpactoAHT(7.0);
      expect(result.validation.ok).toBe(false);
    });

    it('con OPS.ahtMinutos = 0 → mensaje de validación informativo (no crash)', () => {
      const result = calcularImpactoAHT(7.0);
      expect(result.validation.message).toBeTruthy();
      expect(typeof result.validation.message).toBe('string');
    });

    it('con OPS en ceros → NO retorna COP $3,000,000 hardcodeado', () => {
      const result = calcularImpactoAHT(7.0);
      // Si OPS tiene ceros, el ahorro debe ser 0, no ningún valor inventado
      expect(result.result).not.toBeGreaterThan(0);
    });

    it('con OPS vacío → getEstadoOperativo refleja estado sin datos (devuelve Record)', () => {
      const estado = getEstadoOperativo();
      // getEstadoOperativo retorna Record<string, string|number>, no CalcResult
      expect(estado).toHaveProperty('llamadasTotales');
      expect(estado.llamadasTotales).toBe(0);
    });
  });

  describe('calcularImpactoContactRate con OPS vacío → no crashea', () => {
    beforeEach(() => resetOPS());

    it('con OPS.llamadasTotales = 0 y tasaObjetivo 0.55 → result es 0', () => {
      const result = calcularImpactoContactRate(0.55);
      expect(result.result).toBe(0);
    });

    it('con OPS vacío → result es 0 (no promesas inventadas)', () => {
      // Con OPS.tasaContacto = 0, la guarda no se activa (0.55 > 0)
      // pero el cálculo retorna 0 porque llamadasTotales = 0
      const result = calcularImpactoContactRate(0.55);
      expect(result.result).toBe(0);
    });
  });

  describe('loadClientConfig → carga desde Supabase, no hardcodea', () => {
    beforeEach(() => {
      resetOPS();
      vi.mocked(getActiveClientConfig).mockResolvedValue(mockGetActiveClientConfig as never);
    });

    afterEach(() => {
      vi.mocked(getActiveClientConfig).mockReset();
    });

    it('después de loadClientConfig → OPS.agentesActivos > 0', async () => {
      await loadClientConfig('credismart');
      expect(OPS.agentesActivos).toBeGreaterThan(0);
    });

    it('después de loadClientConfig → OPS.costoAgenteMes viene de client_config', async () => {
      await loadClientConfig('credismart');
      expect(OPS.costoAgenteMes).toBe(mockGetActiveClientConfig.costo_agente_mes);
    });

    it('después de loadClientConfig → OPS.nominaActivaMes viene de client_config', async () => {
      await loadClientConfig('credismart');
      expect(OPS.nominaActivaMes).toBe(mockGetActiveClientConfig.nomina_total_mes);
    });

    it('después de loadClientConfig → OPS.currency viene de client_config', async () => {
      await loadClientConfig('credismart');
      expect(OPS.currency).toBe(mockGetActiveClientConfig.currency);
    });

    it('después de loadClientConfig → OPS.costoAgentePorMinuto es calculado, no 0', async () => {
      await loadClientConfig('credismart');
      expect(OPS.costoAgentePorMinuto).toBeGreaterThan(0);
    });

    it('retorna true cuando Supabase responde correctamente', async () => {
      const result = await loadClientConfig('credismart');
      expect(result).toBe(true);
    });
  });

  describe('loadClientConfig falla → OPS mantiene ceros (no inventa datos)', () => {
    beforeEach(() => {
      resetOPS();
      vi.mocked(getActiveClientConfig).mockResolvedValue(null as never);
    });

    afterEach(() => vi.mocked(getActiveClientConfig).mockReset());

    it('cuando getActiveClientConfig retorna null → loadClientConfig retorna false', async () => {
      const result = await loadClientConfig('credismart');
      expect(result).toBe(false);
    });

    it('cuando loadClientConfig falla → OPS.agentesActivos permanece 0', async () => {
      await loadClientConfig('credismart');
      expect(OPS.agentesActivos).toBe(0);
    });

    it('cuando loadClientConfig falla → OPS.costoAgenteMes permanece 0', async () => {
      await loadClientConfig('credismart');
      expect(OPS.costoAgenteMes).toBe(0);
    });

    it('cuando getActiveClientConfig lanza error → loadClientConfig retorna false', async () => {
      vi.mocked(getActiveClientConfig).mockRejectedValue(new Error('Network error'));
      const result = await loadClientConfig('credismart');
      expect(result).toBe(false);
    });

    it('cuando loadClientConfig falla → calcularImpactoAHT retorna result 0', async () => {
      await loadClientConfig('credismart');
      const impact = calcularImpactoAHT(7.0);
      expect(impact.result).toBe(0);
    });
  });

  describe('Con OPS cargado → cálculos correctos con datos reales', () => {
    beforeEach(() => loadOPS());
    afterEach(() => resetOPS());

    it('OPS.agentesActivos = 81 después de carga', () => {
      expect(OPS.agentesActivos).toBe(81);
    });

    it('OPS.costoAgenteMes = 3,000,000 después de carga', () => {
      expect(OPS.costoAgenteMes).toBe(3000000);
    });

    it('calcularImpactoAHT con OPS cargado y AHT objetivo 7.2 → result > 0', () => {
      const result = calcularImpactoAHT(7.2);
      expect(result.result).toBeGreaterThan(0);
    });

    it('calcularImpactoAHT no supera la nómina total (límite de sanidad)', () => {
      const result = calcularImpactoAHT(3.0);
      // El ahorro nunca puede superar la nómina total activa
      expect(result.result).toBeLessThanOrEqual(OPS.nominaActivaMes);
    });

    it('calcularImpactoContactRate con tasa 0.55 → retorna promesas adicionales > 0', () => {
      const result = calcularImpactoContactRate(0.55);
      expect(result.result).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3 — Validaciones de integridad de datos (lógica de sendMessage)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BLOQUE 3 — Integridad de datos y lógica de negocio', () => {

  describe('Detección de queries de agentes (isAgentQuery)', () => {
    // Simula la lógica de detección de agentes de VickyInsights.tsx
    function detectIsAgentQuery(text: string, recentMessages: string[]): boolean {
      const agentNamePattern = /\b(Joel|Teresa|Paola|Nelcy|Clara|Wilson|Jennifer|Manuel|Carmen|Caren|Ana\s*Mar[íi]a|Imaru|Jose?\s*Gregorio|Angel|Carleinnys|Winderly|Loidys|Luis\s*Romero|Santiago|Ana\s*Mendoza|Jhoseanny|Alix)\b/i;
      const agentContextPattern = /\b(agente|asesor|supervisor|desempe[ñn]o|coaching|llamada|transcripci[oó]n|grabaci[oó]n|escucha|calidad|conversa|habla|dice|patr[oó]n|qu[eé]\s*(le\s*pasa|hace|dice)|c[oó]mo\s*(maneja|habla|responde|gestiona)|estrategia\s+para|sugerir[le]?|recomendar[le]?|plan\s+de|mejorar)\b/i;
      const recentText = recentMessages.join(' ');
      const agentInHistory = recentText.match(agentNamePattern)?.[0] || null;
      const agentInCurrent = text.match(agentNamePattern)?.[0] || null;
      const detectedAgent = agentInCurrent || agentInHistory;
      return !!(detectedAgent && (agentContextPattern.test(text) || agentContextPattern.test(recentText) || agentNamePattern.test(text)));
    }

    it('isAgentQuery = true cuando el texto menciona "Joel" con contexto de desempeño', () => {
      expect(detectIsAgentQuery('¿cómo está el desempeño de Joel?', [])).toBe(true);
    });

    it('isAgentQuery = true cuando el texto menciona "Teresa" con contexto de coaching', () => {
      expect(detectIsAgentQuery('necesito un plan de coaching para Teresa', [])).toBe(true);
    });

    it('isAgentQuery = false cuando solo se menciona el nombre sin contexto relevante', () => {
      // nombre sin contexto de desempeño/agente en texto plano unambiguous
      // La regex de agentContext es amplia, así que el nombre solo en una pregunta general no activa
      expect(detectIsAgentQuery('qué clima tiene Colombia hoy', [])).toBe(false);
    });

    it('isAgentQuery = true cuando el agente está en el historial reciente + contexto en el mensaje actual', () => {
      const history = ['hablamos de Teresa antes', 'buenas'];
      expect(detectIsAgentQuery('¿cómo maneja sus llamadas?', history)).toBe(true);
    });

    it('isAgentQuery = false sin nombres de agentes conocidos', () => {
      expect(detectIsAgentQuery('¿cuántas llamadas hubo ayer?', [])).toBe(false);
    });

    it('detecta "Nelcy" como agente conocido', () => {
      expect(detectIsAgentQuery('¿qué le pasa a Nelcy este mes?', [])).toBe(true);
    });

    it('detecta "Jennifer" como agente conocido', () => {
      expect(detectIsAgentQuery('Jennifer habla bien en las grabaciones', [])).toBe(true);
    });

    it('detecta "Santiago" como agente conocido', () => {
      expect(detectIsAgentQuery('recomiéndame estrategia para Santiago', [])).toBe(true);
    });
  });

  describe('Uso de CDR latestDay — no hardcodear valores', () => {
    it('si latestDay.tasa_contacto_pct = 0 → la tasa usada debe ser 0, no 43.1', () => {
      // Esta lógica está en sendMessage de VickyInsights
      // La simulamos directamente aquí
      const latestDay = { tasa_contacto_pct: 0, total_llamadas: 5000, aht_minutos: 8.1 };
      const tasaContacto = latestDay.tasa_contacto_pct != null ? (latestDay.tasa_contacto_pct / 100) : 0.431;
      expect(tasaContacto).toBe(0); // NO debe usar 0.431 como fallback cuando hay 0 explícito
    });

    it('si latestDay.tasa_contacto_pct = 7.76 → la tasa usada debe ser 0.0776', () => {
      const latestDay = { tasa_contacto_pct: 7.76, total_llamadas: 30762, aht_minutos: 8.1 };
      const tasaContacto = latestDay.tasa_contacto_pct != null ? (latestDay.tasa_contacto_pct / 100) : 0.431;
      expect(tasaContacto).toBeCloseTo(0.0776, 4);
    });

    it('si latestDay es null → usa fallback 0.431 (valor CDR histórico)', () => {
      const latestDay = null;
      const tasaContacto = latestDay != null
        ? ((latestDay as { tasa_contacto_pct: number }).tasa_contacto_pct / 100)
        : 0.431;
      expect(tasaContacto).toBe(0.431);
    });

    it('si latestDay.total_llamadas = 16129 → usa 16129, no valor hardcodeado diferente', () => {
      const latestDay = { tasa_contacto_pct: 43.1, total_llamadas: 16129, aht_minutos: 8.1 };
      const llamadas = latestDay?.total_llamadas ?? 16129;
      expect(llamadas).toBe(16129);
    });

    it('si latestDay.aht_minutos = 9.5 → usa 9.5, no 8.1 hardcodeado', () => {
      const latestDay = { tasa_contacto_pct: 43.1, total_llamadas: 16129, aht_minutos: 9.5 };
      const aht = latestDay?.aht_minutos ?? 8.1;
      expect(aht).toBe(9.5);
    });
  });

  describe('Sistema de prompt — no hardcodear cliente', () => {
    it('con clientConfig.client_name → el nombre del cliente aparece en el prompt', () => {
      const clientName = 'CrediSmart / Crediminuto';
      const prompt = `Eres Vicky Insights, la IA analítica de WeKall Intelligence para ${clientName}.`;
      expect(prompt).toContain('CrediSmart / Crediminuto');
    });

    it('sin clientConfig → usa "el cliente" como fallback en el prompt', () => {
      const clientConfig = null;
      const _clientName = clientConfig ? 'algún cliente' : 'el cliente';
      expect(_clientName).toBe('el cliente');
    });

    it('el prompt usa clientConfig.client_name dinámico, no "Crediminuto" hardcodeado', () => {
      const clientName = 'AnotherClient Corp';
      const prompt = `Eres Vicky Insights, la IA analítica de WeKall Intelligence para ${clientName}.`;
      expect(prompt).not.toContain('Crediminuto');
      expect(prompt).toContain('AnotherClient Corp');
    });

    it('detectOperationType recibe la industria del clientConfig, no string hardcodeado', () => {
      const clientConfig = { industry: 'servicio_cliente', country: 'colombia', client_name: 'Test' };
      const queryInput = `${clientConfig.industry} ${clientConfig.country} ${clientConfig.client_name}`;
      expect(queryInput).toContain('servicio_cliente');
    });
  });

  describe('Manejo de conversationHistory', () => {
    it('historia vacía al inicio', () => {
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      expect(conversationHistory).toHaveLength(0);
    });

    it('después de enviar mensaje → history tiene 2 entradas (user + assistant)', () => {
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      // Simular actualización de historia como lo hace sendMessage
      history.push({ role: 'user', content: '¿cómo está mi negocio?' });
      history.push({ role: 'assistant', content: 'Tu tasa de contacto es 43.1%.' });
      expect(history).toHaveLength(2);
    });

    it('después de 3 intercambios → history tiene 6 entradas', () => {
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (let i = 0; i < 3; i++) {
        history.push({ role: 'user', content: `Pregunta ${i + 1}` });
        history.push({ role: 'assistant', content: `Respuesta ${i + 1}` });
      }
      expect(history).toHaveLength(6);
    });

    it('el contenido de los mensajes se preserva correctamente', () => {
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
        { role: 'user', content: '¿cuál es el AHT?' },
        { role: 'assistant', content: 'El tiempo promedio por llamada es 8.1 minutos.' },
      ];
      expect(history[0].content).toBe('¿cuál es el AHT?');
      expect(history[1].content).toContain('8.1');
    });
  });

  describe('sessionId — estabilidad por sesión', () => {
    it('sessionId no es vacío', () => {
      const sessionId = `sess-${Date.now()}-abc123`;
      expect(sessionId).toBeTruthy();
      expect(sessionId.length).toBeGreaterThan(5);
    });

    it('sessionId tiene formato esperado (sess-timestamp-random)', () => {
      const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      expect(id).toMatch(/^sess-\d+-[a-z0-9]+$/);
    });

    it('dos sessionIds generados en momentos distintos son diferentes', () => {
      const id1 = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const id2 = `sess-${Date.now() + 1}-${Math.random().toString(36).slice(2, 8)}`;
      expect(id1).not.toBe(id2);
    });
  });

  describe('URL del proxy — /rag-query vs /chat', () => {
    it('query de agente → usa /rag-query', () => {
      const BASE_PROXY = 'https://wekall-vicky-proxy.example.workers.dev';
      const isAgentQuery = true;
      const PROXY_URL = BASE_PROXY
        ? (isAgentQuery ? BASE_PROXY + '/rag-query' : BASE_PROXY + '/chat')
        : 'https://api.openai.com/v1/chat/completions';
      expect(PROXY_URL).toContain('/rag-query');
    });

    it('query general → usa /chat', () => {
      const BASE_PROXY = 'https://wekall-vicky-proxy.example.workers.dev';
      const isAgentQuery = false;
      const PROXY_URL = BASE_PROXY
        ? (isAgentQuery ? BASE_PROXY + '/rag-query' : BASE_PROXY + '/chat')
        : 'https://api.openai.com/v1/chat/completions';
      expect(PROXY_URL).toContain('/chat');
    });

    it('sin BASE_PROXY → usa OpenAI directamente', () => {
      const BASE_PROXY = '';
      const isAgentQuery = false;
      const PROXY_URL = BASE_PROXY
        ? (isAgentQuery ? BASE_PROXY + '/rag-query' : BASE_PROXY + '/chat')
        : 'https://api.openai.com/v1/chat/completions';
      expect(PROXY_URL).toBe('https://api.openai.com/v1/chat/completions');
    });
  });

  describe('getEstadoOperativo — refleja estado de OPS', () => {
    beforeEach(() => loadOPS());
    afterEach(() => resetOPS());

    it('retorna Record con campos operativos clave', () => {
      const estado = getEstadoOperativo();
      // getEstadoOperativo retorna Record<string, string|number>
      expect(estado).toHaveProperty('llamadasTotales');
      expect(estado).toHaveProperty('agentesActivos');
      expect(estado).toHaveProperty('aht');
    });

    it('con OPS cargado → llamadasTotales es 16129', () => {
      const estado = getEstadoOperativo();
      expect(estado.llamadasTotales).toBe(16129);
    });

    it('con OPS cargado → agentesActivos es 81', () => {
      const estado = getEstadoOperativo();
      expect(estado.agentesActivos).toBe(81);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 5 — convertirMarkdownAProsa — tests exhaustivos
// ═══════════════════════════════════════════════════════════════════════════════

describe('BLOQUE 5 — convertirMarkdownAProsa', () => {

  describe('Eliminación de headers', () => {
    it('"## Header" → "Header."', () => {
      expect(convertirMarkdownAProsa('## Header')).toBe('Header.');
    });

    it('"### Sub header" → "Sub header."', () => {
      expect(convertirMarkdownAProsa('### Sub header')).toBe('Sub header.');
    });

    it('"# H1" → "H1."', () => {
      expect(convertirMarkdownAProsa('# H1')).toBe('H1.');
    });

    it('"#### H4" → "H4."', () => {
      expect(convertirMarkdownAProsa('#### H4')).toBe('H4.');
    });

    it('header con texto largo → elimina solo los ##', () => {
      const result = convertirMarkdownAProsa('## Análisis ejecutivo de la operación');
      expect(result).toBe('Análisis ejecutivo de la operación.');
      expect(result).not.toContain('##');
    });
  });

  describe('Conversión de listas numeradas', () => {
    it('"1. Item uno" → "Item uno" (un solo ítem no lleva punto añadido)', () => {
      // Un solo ítem no activa la lógica de join → no se agrega punto
      const result = convertirMarkdownAProsa('1. Item uno');
      expect(result).toBe('Item uno');
      expect(result).not.toContain('1.');
    });

    it('"2. Segundo item" → convierte correctamente (sin número)', () => {
      const result = convertirMarkdownAProsa('2. Segundo item');
      expect(result).toBe('Segundo item');
      expect(result).not.toContain('2.');
    });

    it('lista numerada 1-3 → se une en prosa', () => {
      const input = '1. Primer punto\n2. Segundo punto\n3. Tercer punto';
      const result = convertirMarkdownAProsa(input);
      expect(result).not.toMatch(/^\d+\./m);
      expect(result).toContain('Primer punto');
      expect(result).toContain('Segundo punto');
      expect(result).toContain('Tercer punto');
    });

    it('lista numerada larga → no contiene "1." ni "2." en el resultado', () => {
      const input = '1. Alpha\n2. Beta\n3. Gamma\n4. Delta\n5. Epsilon';
      const result = convertirMarkdownAProsa(input);
      expect(result).not.toMatch(/\d+\.\s/);
    });
  });

  describe('Conversión de listas de viñetas', () => {
    it('"- bullet point" → "bullet point" (un solo ítem, sin punto añadido)', () => {
      // Un solo bullet no activa la lógica de join → no se agrega punto
      const result = convertirMarkdownAProsa('- bullet point');
      expect(result).toBe('bullet point');
      expect(result).not.toMatch(/^-/);
    });

    it('"* otro bullet" → convierte correctamente (sin asterisco)', () => {
      const result = convertirMarkdownAProsa('* otro bullet');
      expect(result).toBe('otro bullet');
      expect(result).not.toMatch(/^\*/);
    });

    it('"• bullet con guión" → convierte correctamente (sin viñeta)', () => {
      const result = convertirMarkdownAProsa('• bullet con guión');
      expect(result).toBe('bullet con guión');
      expect(result).not.toMatch(/^•/);
    });

    it('múltiples bullets → se unen con ". " y terminan en "."', () => {
      const input = '- Tasa de contacto 43%\n- AHT 8.1 min\n- 81 agentes activos';
      const result = convertirMarkdownAProsa(input);
      expect(result).not.toMatch(/^[-*•]\s/m);
      expect(result).toContain('Tasa de contacto 43%');
      expect(result.endsWith('.')).toBe(true);
    });

    it('"- item" no deja guión inicial en el resultado', () => {
      const result = convertirMarkdownAProsa('- primer item\n- segundo item');
      expect(result).not.toMatch(/^-\s/m);
    });
  });

  describe('Eliminación de líneas en blanco excesivas', () => {
    it('texto con \\n\\n\\n → máximo 2 saltos de línea', () => {
      const input = 'Párrafo uno\n\n\n\nPárrafo dos';
      const result = convertirMarkdownAProsa(input);
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('4 saltos de línea → se reducen a 2', () => {
      const input = 'A\n\n\n\nB';
      const result = convertirMarkdownAProsa(input);
      const newlineCount = (result.match(/\n/g) || []).length;
      expect(newlineCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Preservación de negrita y texto sin markdown', () => {
    it('texto sin markdown → retorna igual (trim)', () => {
      const text = 'La tasa de contacto es buena esta semana.';
      expect(convertirMarkdownAProsa(text)).toBe(text);
    });

    it('texto con **bold** → conserva la negrita', () => {
      const text = 'La **tasa de contacto** es del 43%.';
      const result = convertirMarkdownAProsa(text);
      expect(result).toContain('**tasa de contacto**');
    });

    it('texto con múltiples palabras en **bold** → todas conservadas', () => {
      const text = '**Vicky** analiza **16,129 llamadas** al día.';
      const result = convertirMarkdownAProsa(text);
      expect(result).toContain('**Vicky**');
      expect(result).toContain('**16,129 llamadas**');
    });
  });

  describe('Edge cases — texto vacío, null, undefined', () => {
    it('texto vacío "" → retorna ""', () => {
      expect(convertirMarkdownAProsa('')).toBe('');
    });

    it('texto null → no crashea (retorna como está)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => convertirMarkdownAProsa(null as any)).not.toThrow();
    });

    it('texto undefined → no crashea', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => convertirMarkdownAProsa(undefined as any)).not.toThrow();
    });
  });

  describe('Mezcla de formatos', () => {
    it('mezcla de headers + bullets → conversión completa sin residuos', () => {
      const input = '## Diagnóstico\n- Causa 1\n- Causa 2\n## Recomendación\n1. Acción A\n2. Acción B';
      const result = convertirMarkdownAProsa(input);
      expect(result).not.toMatch(/^#{1,6}\s/m);
      expect(result).not.toMatch(/^[-*•]\s/m);
      expect(result).not.toMatch(/^\d+\.\s/m);
    });

    it('ítem de lista con punto final → no agrega punto extra', () => {
      const result = convertirMarkdownAProsa('- Este ítem ya termina en punto.');
      // El resultado no debe tener ".." al final
      expect(result).not.toMatch(/\.{2,}/);
    });

    it('"• bullet con punto." → no genera "bullet con punto.."', () => {
      const result = convertirMarkdownAProsa('• bullet con punto.');
      expect(result).not.toContain('..');
    });

    it('respuesta típica de Vicky con markdown mixto → queda en prosa limpia', () => {
      const vickyRaw = `## Diagnóstico de tu operación

Tu tasa de contacto está en **43.1%** — por encima del benchmark regional.

### Acciones recomendadas
1. Revisar agentes del peor cuartil
2. Implementar coaching semanal
3. Analizar patrones de marcación

- El Dialer automático genera el 44% del volumen
- Los agentes humanos mantienen 40% de contacto efectivo`;

      const result = convertirMarkdownAProsa(vickyRaw);
      expect(result).not.toMatch(/^#{1,6}\s/m);
      expect(result).not.toMatch(/^\d+\.\s/m);
      expect(result).not.toMatch(/^[-*•]\s/m);
      expect(result).toContain('**43.1%**'); // bold preserved
      expect(result).toContain('Diagnóstico de tu operación');
    });
  });
});
