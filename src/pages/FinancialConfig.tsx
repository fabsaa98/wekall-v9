/**
 * FinancialConfig - Scale-A
 * Panel de configuración financiera por cliente
 * Permite override de valores calculados: tickets, tasas, costos
 */
import { useState, useEffect } from 'react';
import { Save, RefreshCw, Info, AlertCircle } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

const PROXY = (import.meta.env.VITE_PROXY_URL || 'https://wekall-vicky-proxy.fabsaa98.workers.dev').replace(/\/$/, '');

interface FinancialConfig {
  client_id: string;
  ticket_promedio_cobro_cop: number | null;
  ticket_promedio_venta_cop: number | null;
  tasa_cumplimiento_pct: number | null;
  tasa_promesa_pct: number | null;
  tasa_conversion_pct: number | null;
  costo_agente_mes_cop: number | null;
  agentes_activos: number | null;
  notas: string | null;
}

export default function FinancialConfig() {
  const { clientId } = useClient();
  const { data: profile } = useBusinessProfile();
  
  const [config, setConfig] = useState<FinancialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Valores calculados (fallback cuando config es null)
  const [calculated, setCalculated] = useState({
    ticket_cobro: 566094,
    ticket_venta: 0,
    tasa_cumplimiento: 70.0,
    tasa_promesa: 40.0,
    tasa_conversion: 25.0,
  });

  useEffect(() => {
    if (!clientId) return;
    loadConfig();
    loadCalculatedValues();
  }, [clientId]);

  async function loadConfig() {
    try {
      const resp = await fetch(`${PROXY}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'client_financial_config',
          select: '*',
          client_id: clientId,
          limit: '1',
        }),
      });

      if (!resp.ok) throw new Error('Error cargando configuración');
      
      const data = await resp.json();
      setConfig(data[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCalculatedValues() {
    // TODO: Calcular desde transcripciones reales
    // Por ahora usa valores default
  }

  async function handleSave() {
    if (!config) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const resp = await fetch(`${PROXY}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'client_financial_config',
          upsert: {
            ...config,
            updated_at: new Date().toISOString(),
          },
        }),
      });

      if (!resp.ok) throw new Error('Error guardando configuración');
      
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' });
    } finally {
      setSaving(false);
    }
  }

  function handleReset(field: keyof FinancialConfig) {
    if (!config) return;
    setConfig({ ...config, [field]: null });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>;
  }

  const isCollections = profile?.business_type === 'collections';
  const isSales = profile?.business_type === 'sales';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Configuración Financiera</h1>
        <p className="text-sm text-muted-foreground">
          Configura valores específicos para tu operación. Si un campo está vacío, se usa el valor calculado automáticamente.
        </p>
      </div>

      {message && (
        <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        
        {/* Tickets promedio */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Tickets Promedio</h2>
          
          {isCollections && (
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Ticket Promedio Cobranza (COP)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={config?.ticket_promedio_cobro_cop || ''}
                  onChange={e => setConfig({ ...config!, ticket_promedio_cobro_cop: Number(e.target.value) || null })}
                  placeholder={`Calculado: $${calculated.ticket_cobro.toLocaleString('es-CO')}`}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => handleReset('ticket_promedio_cobro_cop')}
                  className="p-2 rounded-md border border-border hover:bg-secondary"
                  title="Usar valor calculado"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Valor calculado desde transcripciones reales: ${calculated.ticket_cobro.toLocaleString('es-CO')}
              </p>
            </div>
          )}

          {isSales && (
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Ticket Promedio Venta (COP)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={config?.ticket_promedio_venta_cop || ''}
                  onChange={e => setConfig({ ...config!, ticket_promedio_venta_cop: Number(e.target.value) || null })}
                  placeholder="Ej: 450000"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => handleReset('ticket_promedio_venta_cop')}
                  className="p-2 rounded-md border border-border hover:bg-secondary"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tasas */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Tasas de Conversión</h2>
          
          {isCollections && (
            <>
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Tasa Cumplimiento Promesas (%)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.1"
                    max="100"
                    value={config?.tasa_cumplimiento_pct || ''}
                    onChange={e => setConfig({ ...config!, tasa_cumplimiento_pct: Number(e.target.value) || null })}
                    placeholder={`Benchmark: ${calculated.tasa_cumplimiento}%`}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleReset('tasa_cumplimiento_pct')}
                    className="p-2 rounded-md border border-border hover:bg-secondary"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Benchmark alto LATAM: {calculated.tasa_cumplimiento}%
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Tasa Promesa (%)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.1"
                    max="100"
                    value={config?.tasa_promesa_pct || ''}
                    onChange={e => setConfig({ ...config!, tasa_promesa_pct: Number(e.target.value) || null })}
                    placeholder={`Benchmark: ${calculated.tasa_promesa}%`}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleReset('tasa_promesa_pct')}
                    className="p-2 rounded-md border border-border hover:bg-secondary"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {isSales && (
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Tasa Conversión Ventas (%)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  max="100"
                  value={config?.tasa_conversion_pct || ''}
                  onChange={e => setConfig({ ...config!, tasa_conversion_pct: Number(e.target.value) || null })}
                  placeholder="Ej: 25"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => handleReset('tasa_conversion_pct')}
                  className="p-2 rounded-md border border-border hover:bg-secondary"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Costos operativos */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Costos Operativos</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Costo Agente/Mes (COP)</label>
              <input
                type="number"
                value={config?.costo_agente_mes_cop || ''}
                onChange={e => setConfig({ ...config!, costo_agente_mes_cop: Number(e.target.value) || null })}
                placeholder="Ej: 3000000"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Agentes Activos</label>
              <input
                type="number"
                value={config?.agentes_activos || ''}
                onChange={e => setConfig({ ...config!, agentes_activos: Number(e.target.value) || null })}
                placeholder="Ej: 81"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="text-sm font-medium">Notas</label>
          <textarea
            value={config?.notas || ''}
            onChange={e => setConfig({ ...config!, notas: e.target.value })}
            placeholder="Notas adicionales sobre la configuración..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mt-2"
            rows={3}
          />
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* Advertencia */}
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-yellow-500 mb-1">Importante</p>
            <p>
              Los valores configurados aquí tienen prioridad sobre los calculados automáticamente.
              Si un campo está vacío, se usará el valor calculado desde tus datos reales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
