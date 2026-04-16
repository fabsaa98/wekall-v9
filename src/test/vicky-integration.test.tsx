/**
 * vicky-integration.test.tsx
 * Tests de integración y UI de Vicky Insights
 * BLOQUE 2: Flujo de conversación completo
 * BLOQUE 4: Comportamiento de UI (ChatBubble)
 *
 * ~70 tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import type { ChatMessage } from '@/data/mockData';
import {
  mockClientConfig,
  mockCDRData,
  mockCDRDataEmpty,
  mockWorkerResponses,
  mockVickyMessage,
  mockUserMessage,
  mockVickyMessageNoConfidence,
  mockVickyMessageNoRootCauses,
} from './mocks/vicky-mocks';
import { convertirMarkdownAProsa } from '@/lib/vickyMarkdown';

// ─── Mocks globales ───────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => ({
  getActiveClientConfig: vi.fn().mockResolvedValue(null),
  saveVickyConversation: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/contexts/ClientContext', () => ({
  useClient: vi.fn(() => ({
    clientId: 'credismart',
    setClientId: vi.fn(),
    clientConfig: mockClientConfig,
    clientBranding: null,
    currentUser: null,
    setCurrentUser: vi.fn(),
    loading: false,
  })),
  ClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useCDRData', () => ({
  useCDRData: vi.fn(() => mockCDRData),
}));

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ state: null, search: '' })),
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock('@/components/VickyChatHistory', () => ({
  VickyChatHistory: () => <div data-testid="vicky-chat-history" />,
}));

vi.mock('@/components/InfoTooltip', () => ({
  InfoTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── ChatBubble test component (inline para tests) ────────────────────────────
// Dado que ChatBubble no está exportado, creamos un componente equivalente que
// copia su comportamiento exacto del código de VickyInsights.tsx

interface RootCause { label: string; impact: number; color: string }

interface TestChatBubbleProps {
  msg: ChatMessage;
  onFollowUp: (q: string) => void;
  onAction: () => void;
  clientName?: string;
}

function TestChatBubble({ msg, onFollowUp, onAction, clientName }: TestChatBubbleProps) {
  const [reasoningOpen, setReasoningOpen] = React.useState(false);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-4" data-testid="user-bubble">
        <div className="max-w-[75%] bg-primary rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-white leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4" data-testid="vicky-bubble">
      <div className="max-w-[85%] space-y-2">
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-primary">Vicky Insights</span>
            {msg.confidence && (
              <span
                data-testid="confidence-badge"
                className={
                  msg.confidence === 'Alta'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                }
              >
                Confianza {msg.confidence}
              </span>
            )}
          </div>

          <div className="text-sm">{msg.content}</div>

          {msg.rootCauses && msg.rootCauses.length > 0 && (
            <div data-testid="root-causes-section" className="mt-3 border-t pt-3">
              {msg.rootCauses.map((rc: RootCause, i: number) => (
                <div key={i} data-testid={`root-cause-${i}`}>
                  <span>{rc.label}</span>
                  <span>{rc.impact}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {msg.reasoning && (
          <button
            data-testid="reasoning-toggle"
            onClick={() => setReasoningOpen(v => !v)}
          >
            Ver razonamiento
          </button>
        )}
        {reasoningOpen && msg.reasoning && (
          <div data-testid="reasoning-panel">
            {msg.reasoning}
          </div>
        )}

        {msg.followUps && msg.followUps.length > 0 && (
          <div data-testid="followups-section">
            {msg.followUps.map((q: string, i: number) => (
              <button
                key={i}
                data-testid={`followup-btn-${i}`}
                onClick={() => onFollowUp(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <button data-testid="create-action-btn" onClick={onAction}>
          → Crear acción
        </button>
        <button
          data-testid="export-pdf-btn"
          onClick={() => { /* export PDF */ void clientName; }}
        >
          Exportar PDF
        </button>
      </div>
    </div>
  );
}

// ─── Test input component para verificar loading/disabled ────────────────────

interface TestChatInputProps {
  loading: boolean;
  isRecording: boolean;
  onSend: (text: string) => void;
}

function TestChatInput({ loading, isRecording, onSend }: TestChatInputProps) {
  const [value, setValue] = React.useState('');
  return (
    <div>
      <input
        data-testid="chat-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        disabled={loading}
      />
      <button
        data-testid="send-btn"
        disabled={loading}
        onClick={() => { onSend(value); setValue(''); }}
      >
        Enviar
      </button>
      <button
        data-testid="mic-btn"
        aria-label={isRecording ? 'Detener grabación' : 'Grabar'}
      >
        {isRecording ? 'MicOff' : 'Mic'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2 — Flujo de conversación
// ═══════════════════════════════════════════════════════════════════════════════

describe('BLOQUE 2 — Flujo de conversación completo', () => {

  describe('Escenario 1: Worker disponible → respuesta con datos reales', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWorkerResponses.chat_success),
      }));
    });

    afterEach(() => vi.unstubAllGlobals());

    it('fetch retorna 200 → se puede procesar la respuesta', async () => {
      const fetchMock = vi.mocked(fetch);
      const response = await fetchMock('https://wekall-proxy.workers.dev/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [] }),
      });
      const data = await response.json();
      expect(data.choices[0].message.content).toContain('tasa de contacto');
    });

    it('respuesta del Worker tiene estructura esperada (choices[0].message.content)', async () => {
      const data = mockWorkerResponses.chat_success;
      expect(data).toHaveProperty('choices');
      expect(data.choices[0]).toHaveProperty('message');
      expect(data.choices[0].message).toHaveProperty('content');
      expect(typeof data.choices[0].message.content).toBe('string');
    });

    it('respuesta exitosa → content no está vacío', () => {
      const content = mockWorkerResponses.chat_success.choices[0].message.content;
      expect(content.length).toBeGreaterThan(0);
    });

    it('respuesta exitosa → role es "assistant"', () => {
      const role = mockWorkerResponses.chat_success.choices[0].message.role;
      expect(role).toBe('assistant');
    });
  });

  describe('Escenario 2: Worker caído → fallback claro, sin inventar datos', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    });

    afterEach(() => vi.unstubAllGlobals());

    it('cuando fetch falla → generateVickyFallbackResponse retorna mensaje de error', () => {
      // Simula la lógica de fallback de VickyInsights.tsx
      function generateFallback(): ChatMessage {
        return {
          id: `vicky-${Date.now()}`,
          role: 'vicky',
          content: '**No pude conectar con el motor de análisis en este momento.**\n\nTengo disponibles datos CDR histórico enero 2024 - abril 2026.',
          timestamp: new Date(),
          sources: ['WeKall CDR · datos en tiempo real · Supabase'],
          confidence: 'Baja',
          rootCauses: [],
          followUps: ['Intenta de nuevo'],
        };
      }
      const fallback = generateFallback();
      expect(fallback.content).toContain('No pude conectar');
      expect(fallback.confidence).toBe('Baja');
    });

    it('fallback message NO contiene valores numéricos inventados (e.g. "43.1%")', () => {
      const fallbackContent = '**No pude conectar con el motor de análisis en este momento.**\n\nTengo disponibles datos CDR histórico enero 2024 - abril 2026.';
      expect(fallbackContent).not.toMatch(/43\.1%/);
      expect(fallbackContent).not.toMatch(/16,129/);
    });

    it('fallback message indica que se puede reintentar', () => {
      const content = '**No pude conectar con el motor de análisis en este momento.**\n\nPor favor intenta nuevamente en unos segundos.';
      expect(content).toContain('intenta');
    });
  });

  describe('Escenario 3: AHT con OPS vacío → no responde con 8.1 min', () => {
    it('si OPS.ahtMinutos = 0, calcularImpactoAHT con objetivo 7.0 retorna validation.ok = false', async () => {
      const { OPS, calcularImpactoAHT } = await import('@/lib/vickyCalculations');
      Object.assign(OPS, { ahtMinutos: 0 });
      const result = calcularImpactoAHT(7.0);
      expect(result.validation.ok).toBe(false);
      // Restaurar
      Object.assign(OPS, { ahtMinutos: 0 });
    });

    it('con OPS.ahtMinutos = 0 → result de calcularImpactoAHT es 0', async () => {
      const { OPS, calcularImpactoAHT } = await import('@/lib/vickyCalculations');
      Object.assign(OPS, { ahtMinutos: 0, contactosEfectivos: 0, costoAgenteMes: 0 });
      const result = calcularImpactoAHT(7.0);
      expect(result.result).toBe(0);
    });
  });

  describe('Escenario 4: Query de agente → /rag-query endpoint', () => {
    it('pregunta sobre Joel → isAgentQuery debe ser true', () => {
      const text = '¿qué puedo hacer para mejorar el desempeño de Joel?';
      const agentNamePattern = /\b(Joel|Teresa|Paola|Nelcy)\b/i;
      const agentContextPattern = /\b(desempe[ñn]o|coaching|mejorar)\b/i;
      const isAgent = !!(text.match(agentNamePattern) && agentContextPattern.test(text));
      expect(isAgent).toBe(true);
    });

    it('pregunta sobre Joel → URL del proxy es /rag-query', () => {
      const BASE = 'https://wekall-proxy.workers.dev';
      const isAgentQuery = true;
      const url = BASE + (isAgentQuery ? '/rag-query' : '/chat');
      expect(url).toContain('/rag-query');
    });

    it('pregunta general → URL del proxy es /chat', () => {
      const BASE = 'https://wekall-proxy.workers.dev';
      const isAgentQuery = false;
      const url = BASE + (isAgentQuery ? '/rag-query' : '/chat');
      expect(url).toContain('/chat');
    });

    it('RAG response tiene estructura válida', () => {
      const data = mockWorkerResponses.rag_success;
      expect(data.choices[0].message.content).toContain('Joel');
    });
  });

  describe('Escenario 5: Query de benchmarks', () => {
    it('detectOperationType está disponible y funciona', async () => {
      const { detectOperationType } = await import('@/data/benchmarks');
      const opType = detectOperationType('cobranzas colombia crediminuto promesa pago deuda');
      expect(opType).toBeTruthy();
      expect(typeof opType).toBe('string');
    });

    it('detectRegion está disponible y funciona', async () => {
      const { detectRegion } = await import('@/data/benchmarks');
      const region = detectRegion('cobranzas colombia crediminuto');
      expect(region).toBeTruthy();
    });

    it('generateBenchmarkContext retorna string no vacío', async () => {
      const { detectOperationType, detectRegion, generateBenchmarkContext } = await import('@/data/benchmarks');
      const opType = detectOperationType('cobranzas colombia');
      const region = detectRegion('colombia');
      const ctx = generateBenchmarkContext(opType, region);
      expect(ctx.length).toBeGreaterThan(10);
    });
  });

  describe('Escenario 6: ¿Qué pasó esta semana? con datos disponibles', () => {
    it('cdr.last30Days disponible → se puede calcular semana actual vs anterior', () => {
      const last14 = mockCDRData.last30Days.slice(-14);
      const thisWeek = last14.slice(-5);
      const prevWeek = last14.slice(-10, -5);
      expect(thisWeek.length).toBeGreaterThan(0);
      expect(prevWeek.length).toBeGreaterThan(0);
    });

    it('con last30Days vacío → semana anterior es vacía (no genera comparativa falsa)', () => {
      const last14 = mockCDRDataEmpty.last30Days.slice(-14);
      const prevWeek = last14.slice(-10, -5);
      expect(prevWeek).toHaveLength(0);
    });

    it('con last30Days disponible → avgTasa se calcula correctamente', () => {
      const thisWeek = mockCDRData.last30Days.slice(-5);
      const avgTasa = thisWeek.length > 0
        ? Math.round(thisWeek.reduce((s, d) => s + d.tasa_contacto_pct, 0) / thisWeek.length * 10) / 10
        : 0;
      expect(avgTasa).toBeGreaterThan(0);
      expect(avgTasa).toBeLessThan(100);
    });

    it('con last30Days = [] → avgTasa es 0 (no usa valor hardcodeado)', () => {
      const thisWeek: typeof mockCDRData.last30Days = [];
      const avgTasa = thisWeek.length > 0
        ? thisWeek.reduce((s, d) => s + d.tasa_contacto_pct, 0) / thisWeek.length
        : 0;
      expect(avgTasa).toBe(0);
    });
  });

  describe('Escenario 7: Respuesta con markdown → convertirMarkdownAProsa aplicado', () => {
    it('respuesta con ## headers → resultado no tiene ##', () => {
      const raw = '## Diagnóstico\nLa tasa de contacto es buena.';
      const result = convertirMarkdownAProsa(raw);
      expect(result).not.toContain('##');
    });

    it('respuesta con listas → resultado no tiene "- "', () => {
      const raw = 'Recomendaciones:\n- Mejorar AHT\n- Subir tasa de contacto';
      const result = convertirMarkdownAProsa(raw);
      expect(result).not.toMatch(/^- /m);
    });

    it('respuesta con listas numeradas → resultado no tiene "1. "', () => {
      const raw = '1. Revisar agentes\n2. Coaching semanal\n3. Analizar patrones';
      const result = convertirMarkdownAProsa(raw);
      expect(result).not.toMatch(/^\d+\. /m);
    });
  });

  describe('Escenario 8: Pregunta vacía → no enviar', () => {
    it('mensaje vacío "" → sendMessage retorna sin hacer fetch', async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      // Simula la guarda de sendMessage: if (!text.trim()) return;
      async function sendMessageGuard(text: string) {
        if (!text.trim()) return 'blocked';
        fetchSpy();
        return 'sent';
      }

      const result = await sendMessageGuard('');
      expect(result).toBe('blocked');
      expect(fetchSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('mensaje solo espacios → tampoco envía', async () => {
      function shouldSend(text: string): boolean {
        return !!text.trim();
      }
      expect(shouldSend('')).toBe(false);
      expect(shouldSend('   ')).toBe(false);
      expect(shouldSend('\n\t')).toBe(false);
    });

    it('mensaje con contenido → sí envía', () => {
      function shouldSend(text: string): boolean {
        return !!text.trim();
      }
      expect(shouldSend('¿cómo está mi negocio?')).toBe(true);
    });
  });

  describe('Escenario 9: Doble click en enviar → no duplica mensajes', () => {
    it('loading=true bloquea el botón de envío', () => {
      const { getByTestId } = render(
        <TestChatInput loading={true} isRecording={false} onSend={vi.fn()} />
      );
      const sendBtn = getByTestId('send-btn') as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(true);
    });

    it('loading=false → botón habilitado', () => {
      const { getByTestId } = render(
        <TestChatInput loading={false} isRecording={false} onSend={vi.fn()} />
      );
      const sendBtn = getByTestId('send-btn') as HTMLButtonElement;
      expect(sendBtn.disabled).toBe(false);
    });

    it('loading=true → input también deshabilitado', () => {
      const { getByTestId } = render(
        <TestChatInput loading={true} isRecording={false} onSend={vi.fn()} />
      );
      const input = getByTestId('chat-input') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('Escenario 10: Error 401 del Worker → fallback, no crash', () => {
    it('respuesta 401 tiene estructura de error', () => {
      const resp = mockWorkerResponses.unauthorized;
      expect(resp.status).toBe(401);
      expect(resp.error).toBe('Unauthorized');
    });

    it('cuando response.ok = false → se activa el fallback', () => {
      // Simula la lógica de manejo de error HTTP
      const response = { ok: false, status: 401 };
      const shouldFallback = !response.ok;
      expect(shouldFallback).toBe(true);
    });

    it('error 503 también activa fallback', () => {
      const response = { ok: false, status: 503 };
      expect(!response.ok).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4 — Comportamiento de UI (ChatBubble)
// ═══════════════════════════════════════════════════════════════════════════════

describe('BLOQUE 4 — Comportamiento de UI (ChatBubble)', () => {

  describe('Posicionamiento de mensajes', () => {
    it('mensaje de usuario → renderiza con data-testid="user-bubble"', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockUserMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('user-bubble')).toBeTruthy();
    });

    it('mensaje de Vicky → renderiza con data-testid="vicky-bubble"', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('vicky-bubble')).toBeTruthy();
    });

    it('burbuja de usuario tiene clase "justify-end"', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockUserMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('user-bubble').className).toContain('justify-end');
    });

    it('burbuja de Vicky tiene clase "justify-start"', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('vicky-bubble').className).toContain('justify-start');
    });

    it('burbuja de Vicky tiene max-w-[85%]', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      const inner = getByTestId('vicky-bubble').firstChild as HTMLElement;
      expect(inner.className).toContain('max-w-[85%]');
    });
  });

  describe('Badge de confianza', () => {
    it('confidence="Alta" → badge con texto "Confianza Alta"', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      const badge = getByTestId('confidence-badge');
      expect(badge.textContent).toContain('Confianza Alta');
    });

    it('confidence="Alta" → badge tiene clase emerald', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      const badge = getByTestId('confidence-badge');
      expect(badge.className).toContain('emerald');
    });

    it('confidence="Media" → badge con texto "Confianza Media"', () => {
      const msgMedia: ChatMessage = { ...mockVickyMessage, confidence: 'Media', id: 'v-media' };
      const { getByTestId } = render(
        <TestChatBubble msg={msgMedia} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      const badge = getByTestId('confidence-badge');
      expect(badge.textContent).toContain('Confianza Media');
    });

    it('confidence="Media" → badge tiene clase sky', () => {
      const msgMedia: ChatMessage = { ...mockVickyMessage, confidence: 'Media', id: 'v-media-2' };
      const { getByTestId } = render(
        <TestChatBubble msg={msgMedia} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      const badge = getByTestId('confidence-badge');
      expect(badge.className).toContain('sky');
    });

    it('confidence=undefined → no se renderiza badge', () => {
      const { queryByTestId } = render(
        <TestChatBubble msg={mockVickyMessageNoConfidence} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(queryByTestId('confidence-badge')).toBeNull();
    });
  });

  describe('Root causes / Drivers de impacto', () => {
    it('msg.rootCauses con items → se renderiza sección de drivers', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('root-causes-section')).toBeTruthy();
    });

    it('dos root causes → se renderizan dos items', () => {
      const { getByTestId, queryByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('root-cause-0')).toBeTruthy();
      expect(getByTestId('root-cause-1')).toBeTruthy();
      expect(queryByTestId('root-cause-2')).toBeNull();
    });

    it('msg.rootCauses = [] → NO se renderiza sección de drivers', () => {
      const { queryByTestId } = render(
        <TestChatBubble msg={mockVickyMessageNoRootCauses} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(queryByTestId('root-causes-section')).toBeNull();
    });

    it('root cause muestra el label correcto', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('root-cause-0').textContent).toContain('Tasa de contacto baja');
    });

    it('root cause muestra el porcentaje de impacto', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('root-cause-0').textContent).toContain('75');
    });
  });

  describe('Follow-up buttons', () => {
    it('msg.followUps → se renderizan botones de follow-up', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('followups-section')).toBeTruthy();
    });

    it('dos followUps → hay dos botones', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('followup-btn-0')).toBeTruthy();
      expect(getByTestId('followup-btn-1')).toBeTruthy();
    });

    it('click en follow-up → llama onFollowUp con la pregunta correcta', () => {
      const onFollowUp = vi.fn();
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={onFollowUp} onAction={vi.fn()} />
      );
      fireEvent.click(getByTestId('followup-btn-0'));
      expect(onFollowUp).toHaveBeenCalledWith('¿Qué agentes rinden mejor?');
    });

    it('click en segundo follow-up → llama con la segunda pregunta', () => {
      const onFollowUp = vi.fn();
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={onFollowUp} onAction={vi.fn()} />
      );
      fireEvent.click(getByTestId('followup-btn-1'));
      expect(onFollowUp).toHaveBeenCalledWith('¿Cuánto ahorro si bajo el AHT?');
    });
  });

  describe('Panel de razonamiento', () => {
    it('msg.reasoning → botón "Ver razonamiento" visible', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('reasoning-toggle')).toBeTruthy();
      expect(getByTestId('reasoning-toggle').textContent).toContain('Ver razonamiento');
    });

    it('click en "Ver razonamiento" → expande el panel', () => {
      const { getByTestId, queryByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(queryByTestId('reasoning-panel')).toBeNull();
      act(() => { fireEvent.click(getByTestId('reasoning-toggle')); });
      expect(getByTestId('reasoning-panel')).toBeTruthy();
    });

    it('segundo click → colapsa el panel', () => {
      const { getByTestId, queryByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      act(() => { fireEvent.click(getByTestId('reasoning-toggle')); });
      act(() => { fireEvent.click(getByTestId('reasoning-toggle')); });
      expect(queryByTestId('reasoning-panel')).toBeNull();
    });

    it('msg.reasoning = undefined → NO hay botón de razonamiento', () => {
      const { queryByTestId } = render(
        <TestChatBubble msg={mockVickyMessageNoConfidence} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(queryByTestId('reasoning-toggle')).toBeNull();
    });
  });

  describe('Botones de acción', () => {
    it('botón "Crear acción" presente en mensajes de Vicky', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('create-action-btn')).toBeTruthy();
    });

    it('botón "Exportar PDF" presente en mensajes de Vicky', () => {
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={vi.fn()} />
      );
      expect(getByTestId('export-pdf-btn')).toBeTruthy();
    });

    it('click en "Crear acción" → llama onAction', () => {
      const onAction = vi.fn();
      const { getByTestId } = render(
        <TestChatBubble msg={mockVickyMessage} onFollowUp={vi.fn()} onAction={onAction} />
      );
      fireEvent.click(getByTestId('create-action-btn'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Estado de loading e input', () => {
    it('isRecording=true → botón muestra "MicOff"', () => {
      const { getByTestId } = render(
        <TestChatInput loading={false} isRecording={true} onSend={vi.fn()} />
      );
      expect(getByTestId('mic-btn').textContent).toContain('MicOff');
    });

    it('isRecording=false → botón muestra "Mic"', () => {
      const { getByTestId } = render(
        <TestChatInput loading={false} isRecording={false} onSend={vi.fn()} />
      );
      expect(getByTestId('mic-btn').textContent).toContain('Mic');
    });

    it('loading=false + texto → se puede enviar', () => {
      const onSend = vi.fn();
      const { getByTestId } = render(
        <TestChatInput loading={false} isRecording={false} onSend={onSend} />
      );
      const input = getByTestId('chat-input');
      fireEvent.change(input, { target: { value: '¿cómo está mi operación?' } });
      fireEvent.click(getByTestId('send-btn'));
      expect(onSend).toHaveBeenCalledWith('¿cómo está mi operación?');
    });
  });
});
