/**
 * SettingsView — DECISIÓN FIX 2E (V20): NO enrutado en App.tsx.
 * Redundante con Configuracion.tsx (/config). Tiene features interesantes
 * (Hotwords, Retención, Auditoría) pero dependen de hooks/mocks no implementados
 * en el sistema actual (useHotwords, useAuditLogs, mockHotwords, mockAuditLogs).
 * Integrar estos features en Configuracion.tsx en una futura iteración.
 */
import { useState } from 'react';
import { Plus, Download, Trash } from '@phosphor-icons/react';
import { useHotwords, useDeleteHotword } from '@/hooks/useHotwords';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { mockHotwords, mockAuditLogs } from '@/data/mockData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const tabs = ['General', 'Hotwords', 'Retención', 'Modelos AI', 'Auditoría'] as const;

const categoryLabels: Record<string, string> = {
  proper_name: 'Nombre propio', company: 'Empresa', product: 'Producto', other: 'Otro',
};

const actionLabels: Record<string, string> = {
  view: 'Ver', search: 'Buscar', export: 'Exportar', chat: 'Chat AI', edit: 'Editar', delete: 'Eliminar',
};

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('General');

  const { data: hotwordsData, isLoading: loadingHotwords } = useHotwords();
  const { data: auditLogsData, isLoading: loadingLogs } = useAuditLogs();
  const deleteHotword = useDeleteHotword();

  const hotwords = hotwordsData ?? mockHotwords;
  const auditLogs = auditLogsData ?? mockAuditLogs;

  const handleDeleteHotword = (id: string, word: string) => {
    deleteHotword.mutate(id, {
      onSuccess: () => toast.success(`Hotword "${word}" eliminado`),
      onError: () => toast.error('No se pudo eliminar el hotword'),
    });
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === t ? 'bg-card text-card-foreground shadow-wk-xs' : 'text-muted-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'General' && (
        <div className="max-w-xl rounded-lg border border-border bg-card p-6 shadow-wk-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre de la empresa</label>
            <input defaultValue="Mi Empresa S.A.S" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Idioma de transcripción</label>
            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option>Español</option>
              <option>Inglés</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Zona horaria</label>
            <select className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option>America/Bogota (UTC-5)</option>
              <option>America/Mexico_City (UTC-6)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Notificaciones</label>
            {['Alertas por email', 'Resumen diario', 'Alertas de errores'].map(n => (
              <div key={n} className="flex items-center justify-between">
                <span className="text-sm text-card-foreground">{n}</span>
                <div className="relative h-5 w-9 rounded-full bg-wk-green cursor-pointer">
                  <div className="absolute left-[18px] top-0.5 h-4 w-4 rounded-full bg-card shadow-wk-xs" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => toast.success('Configuración guardada')} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-wk-violet-dark transition-colors">
            Guardar cambios
          </button>
        </div>
      )}

      {activeTab === 'Hotwords' && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-wk-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-card-foreground">Hotwords configurados</h3>
              <p className="text-[10px] text-muted-foreground">{hotwords.length}/500 hotwords usados</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-wk-violet-dark">
              <Plus size={14} weight="light" /> Agregar hotword
            </button>
          </div>
          {loadingHotwords ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-secondary animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Palabra</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Categoría</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Boost</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {hotwords.map(hw => (
                    <tr key={hw.id} className="border-b border-border/50">
                      <td className="py-2.5 text-card-foreground font-medium">{hw.word}</td>
                      <td className="py-2.5 text-muted-foreground">{categoryLabels[hw.category]}</td>
                      <td className="py-2.5">
                        <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => (
                          <div key={i} className={`h-2 w-2 rounded-full ${i < hw.boost ? 'bg-primary' : 'bg-secondary'}`} />
                        ))}</div>
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => handleDeleteHotword(hw.id, hw.word)}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-wk-red"
                        >
                          <Trash size={14} weight="light" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Retención' && (
        <div className="max-w-xl rounded-lg border border-border bg-card p-6 shadow-wk-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-card-foreground">Plan actual</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">12 meses</span>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Almacenamiento usado</span>
              <span className="text-card-foreground font-medium">42 GB / 100 GB</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-[42%] rounded-full bg-primary" />
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Próxima eliminación</span>
            <span className="text-card-foreground">1 de julio, 2026</span>
          </div>
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
            ℹ️ El audio se mueve a almacenamiento frío (Glacier) después de 3 meses. Las transcripciones y metadatos se mantienen accesibles durante todo el periodo de retención.
          </p>
          <button className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-wk-violet-dark transition-colors">
            Upgrade plan
          </button>
        </div>
      )}

      {activeTab === 'Modelos AI' && (
        <div className="grid gap-4 max-w-xl">
          {[
            { name: 'STT (Speech-to-Text)', model: 'faster-whisper large-v3-turbo', latency: '1.2s', uptime: '99.8%' },
            { name: 'LLM (Clasificación + Resumen)', model: 'Llama 3.1 8B', latency: '2.1s', uptime: '99.5%' },
            { name: 'Embeddings (Búsqueda + RAG)', model: 'multilingual-e5-large', latency: '0.3s', uptime: '99.9%' },
          ].map(m => (
            <div key={m.name} className="rounded-lg border border-border bg-card p-4 shadow-wk-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-card-foreground">{m.name}</p>
                <span className="rounded-full bg-wk-green/10 px-2 py-0.5 text-[10px] font-medium text-wk-green-dark">Activo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{m.model}</p>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span>Latencia: {m.latency}</span>
                <span>Disponibilidad: {m.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Auditoría' && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-wk-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-card-foreground">Logs de auditoría</h3>
            <button onClick={() => toast.success('CSV exportado')} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-secondary">
              <Download size={14} weight="light" /> Exportar CSV
            </button>
          </div>
          {loadingLogs ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-secondary animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Usuario</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Acción</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Detalle</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-border/50">
                      <td className="py-2.5 text-card-foreground">{log.user}</td>
                      <td className="py-2.5"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">{actionLabels[log.action]}</span></td>
                      <td className="py-2.5 text-xs text-muted-foreground max-w-xs truncate">{log.details}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">{format(new Date(log.timestamp), "d MMM, HH:mm", { locale: es })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
