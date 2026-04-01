import { Plug, Check, X, Clock, ArrowRight } from '@phosphor-icons/react';
import { mockIntegrations } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig = {
  connected: { label: 'Conectado', classes: 'bg-wk-green/10 text-wk-green-dark' },
  disconnected: { label: 'Desconectado', classes: 'bg-wk-gray/10 text-muted-foreground' },
  error: { label: 'Error', classes: 'bg-wk-red/10 text-wk-red' },
  coming_soon: { label: 'Próximamente', classes: 'bg-wk-yellow/10 text-wk-yellow-dark' },
};

export default function IntegrationsView() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {mockIntegrations.map(int => {
        const st = statusConfig[int.status];
        return (
          <div key={int.id} className="rounded-lg border border-border bg-card p-5 shadow-wk-sm transition-shadow hover:shadow-wk-md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <Plug size={22} weight="light" className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-card-foreground">{int.name}</h3>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${st.classes}`}>{st.label}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{int.description}</p>

            {int.status === 'connected' && (
              <div className="space-y-2 text-xs mb-4">
                {int.lastSync && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={12} weight="light" />
                    Última sincronización: {format(new Date(int.lastSync), "d MMM, HH:mm", { locale: es })}
                  </div>
                )}
                <div className="flex gap-3">
                  {int.config.sendSummary && <span className="flex items-center gap-1 text-wk-green-dark"><Check size={12} /> Resumen</span>}
                  {int.config.sendTranscript && <span className="flex items-center gap-1 text-wk-green-dark"><Check size={12} /> Transcripción</span>}
                  {int.config.sendTags && <span className="flex items-center gap-1 text-wk-green-dark"><Check size={12} /> Etiquetas</span>}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {int.status === 'connected' && (
                <>
                  <button onClick={() => toast.success('Conexión exitosa')} className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-card-foreground hover:bg-secondary">Test</button>
                  <button onClick={() => toast.info('Desconectado')} className="flex-1 rounded-lg border border-wk-red/30 py-2 text-xs font-medium text-wk-red hover:bg-wk-red/5">Desconectar</button>
                </>
              )}
              {int.status === 'disconnected' && (
                <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground hover:bg-wk-violet-dark transition-colors">
                  Conectar <ArrowRight size={14} weight="light" />
                </button>
              )}
              {int.status === 'coming_soon' && (
                <button disabled className="w-full rounded-lg bg-secondary py-2.5 text-xs font-medium text-muted-foreground cursor-not-allowed">
                  Próximamente
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
