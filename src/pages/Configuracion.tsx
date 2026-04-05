import { useState } from 'react';
import { CheckCircle, AlertCircle, Phone, MessageSquare, FileText, Zap, User, Palette, Database, Plug, Building2, LogOut, Globe, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useClient } from '@/contexts/ClientContext';
import { useNavigate } from 'react-router-dom';

interface DataSource {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'pending' | 'error';
  icon: React.ReactNode;
  records?: number;
  lastSync?: string;
}

const dataSources: DataSource[] = [
  {
    id: 'phone',
    name: 'WeKall Business Phone',
    description: 'Llamadas entrantes y salientes · Grabaciones · Transcripciones automáticas',
    status: 'connected',
    icon: <Phone size={18} />,
    records: 12483,
    lastSync: 'hace 5 min',
  },
  {
    id: 'engage360',
    name: 'WeKall Engage360',
    description: 'Contact Center · Omnicanalidad · Gestión de interacciones · ACD · IVR',
    status: 'connected',
    icon: <Zap size={18} />,
    records: 8921,
    lastSync: 'hace 12 min',
  },
  {
    id: 'messenger',
    name: 'WeKall Messenger Hub',
    description: 'WhatsApp · Email · SMS · Redes sociales · Chat web',
    status: 'connected',
    icon: <MessageSquare size={18} />,
    records: 4230,
    lastSync: 'hace 8 min',
  },
  {
    id: 'notes',
    name: 'WeKall Notes',
    description: 'Notas de agentes · Comentarios post-contacto · Tags de interacción',
    status: 'pending',
    icon: <FileText size={18} />,
    lastSync: 'No sincronizado',
  },
];

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'pending';
  category: string;
}

const integrations: Integration[] = [
  { id: 'salesforce', name: 'Salesforce', description: 'CRM · Sync de oportunidades y contactos', status: 'pending', category: 'CRM' },
  { id: 'hubspot', name: 'HubSpot', description: 'Marketing Hub · Pipeline de ventas', status: 'connected', category: 'CRM' },
  { id: 'slack', name: 'Slack', description: 'Notificaciones de alertas · Resúmenes diarios', status: 'connected', category: 'Comunicación' },
  { id: 'teams', name: 'Microsoft Teams', description: 'Notificaciones y reportes automáticos', status: 'pending', category: 'Comunicación' },
  { id: 'powerbi', name: 'Power BI', description: 'Export de datos para dashboards avanzados', status: 'pending', category: 'Analytics' },
  { id: 'looker', name: 'Looker Studio', description: 'Visualización y reportes personalizados', status: 'pending', category: 'Analytics' },
];

function StatusBadge({ status }: { status: 'connected' | 'pending' | 'error' }) {
  const config = {
    connected: { label: 'Conectado', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={11} /> },
    pending: { label: 'Pendiente', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <AlertCircle size={11} /> },
    error: { label: 'Error', classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <AlertCircle size={11} /> },
  }[status];

  return (
    <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', config.classes)}>
      {config.icon}
      {config.label}
    </span>
  );
}

export default function Configuracion() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [slackAlerts, setSlackAlerts] = useState(true);

  const { clientConfig, clientBranding, currentUser, setClientId, setCurrentUser } = useClient();
  const navigate = useNavigate();

  function handleChangeCompany() {
    // Limpiar sesión y redirigir a login
    setCurrentUser(null);
    setClientId('credismart'); // reset default
    localStorage.removeItem('wki_client_id');
    localStorage.removeItem('wki_current_user');
    navigate('/login', { replace: true });
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Fuentes de datos, integraciones y preferencias</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="h-9">
          <TabsTrigger value="empresa" className="text-sm">
            <Building2 size={13} className="mr-1.5" />Mi Empresa
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-sm">
            <Database size={13} className="mr-1.5" />Fuentes
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-sm">
            <Plug size={13} className="mr-1.5" />Integraciones
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-sm">
            <User size={13} className="mr-1.5" />Perfil
          </TabsTrigger>
          <TabsTrigger value="theme" className="text-sm">
            <Palette size={13} className="mr-1.5" />Tema
          </TabsTrigger>
        </TabsList>

        {/* ─── Mi Empresa ─────────────────────────────────────────────── */}
        <TabsContent value="empresa" className="mt-6 space-y-4">

          {/* Header empresa */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-primary/15 text-primary shrink-0">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {clientBranding?.company_name || clientConfig?.client_name || 'Mi Empresa'}
                  </h3>
                  {clientBranding?.tagline && (
                    <p className="text-sm text-muted-foreground mt-0.5">{clientBranding.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      {clientConfig?.client_id || 'credismart'}
                    </span>
                    {currentUser?.role && (
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {currentUser.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleChangeCompany}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <LogOut size={13} />
                Cambiar empresa
              </button>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Información de la empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Empresa', value: clientConfig?.client_name || '—', icon: <Building2 size={13} /> },
                { label: 'Industria', value: clientConfig?.industry || '—', icon: <Database size={13} /> },
                { label: 'País', value: clientConfig?.country || '—', icon: <Globe size={13} /> },
                { label: 'Moneda', value: clientConfig?.currency || '—', icon: <DollarSign size={13} /> },
                { label: 'Zona horaria', value: clientConfig?.timezone || '—', icon: null },
                { label: 'Plan', value: 'WeKall Intelligence Pro', icon: <Zap size={13} /> },
              ].map(field => (
                <div key={field.label}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    {field.label}
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-1.5">
                    {field.icon && <span className="text-muted-foreground">{field.icon}</span>}
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Branding */}
          {clientBranding && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Branding</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Color primario</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border border-white/10"
                      style={{ background: clientBranding.primary_color || '#6334C0' }}
                    />
                    <p className="text-sm text-foreground font-mono">{clientBranding.primary_color || '#6334C0'}</p>
                  </div>
                </div>
                {clientBranding.logo_url && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Logo</p>
                    <img src={clientBranding.logo_url} alt="Logo empresa" className="h-8 object-contain" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usuario actual */}
          {currentUser && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Sesión activa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Usuario</p>
                  <p className="text-sm text-foreground">{currentUser.name || currentUser.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm text-foreground">{currentUser.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Rol</p>
                  <p className="text-sm text-foreground">{currentUser.role}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Empresa</p>
                  <p className="text-sm text-foreground font-mono">{currentUser.client_id}</p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Data Sources */}
        <TabsContent value="sources" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            WeKall Intelligence se conecta a tu ecosistema WeKall para unificar todos los datos de conversaciones con clientes.
          </p>
          {dataSources.map(source => (
            <div key={source.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    {source.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{source.name}</p>
                      <StatusBadge status={source.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{source.description}</p>
                    {source.status === 'connected' && (
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span>{source.records?.toLocaleString()} registros</span>
                        <span>·</span>
                        <span>Sincronizado {source.lastSync}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button className={cn(
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  source.status === 'connected'
                    ? 'bg-secondary text-muted-foreground hover:text-foreground border border-border'
                    : 'bg-primary text-white hover:bg-primary/80',
                )}>
                  {source.status === 'connected' ? 'Configurar' : 'Conectar'}
                </button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="mt-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Conecta WeKall Intelligence con tu stack de herramientas empresariales.
          </p>
          {['CRM', 'Comunicación', 'Analytics'].map(category => (
            <div key={category}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">{category}</p>
              <div className="space-y-2">
                {integrations.filter(i => i.category === category).map(integration => (
                  <div key={integration.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{integration.name}</p>
                        <StatusBadge status={integration.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                    </div>
                    <button className={cn(
                      'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      integration.status === 'connected'
                        ? 'bg-secondary text-muted-foreground hover:text-foreground border border-border'
                        : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20',
                    )}>
                      {integration.status === 'connected' ? 'Configurado' : 'Conectar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Información de la empresa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Empresa', value: clientConfig?.client_name || 'Crediminuto / CrediSmart' },
                { label: 'Industria', value: clientConfig?.industry || 'Servicios empresariales' },
                { label: 'País', value: clientConfig?.country || 'Colombia' },
                { label: 'Plan', value: 'WeKall Intelligence Pro' },
              ].map(field => (
                <div key={field.label}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{field.label}</p>
                  <p className="text-sm text-foreground">{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
            <div className="space-y-3">
              {[
                { id: 'notif', label: 'Notificaciones en app', desc: 'Alertas y actualizaciones en tiempo real', state: notifications, set: setNotifications },
                { id: 'email', label: 'Alertas por email', desc: 'Resumen diario y alertas críticas', state: emailAlerts, set: setEmailAlerts },
                { id: 'slack', label: 'Notificaciones por Slack', desc: 'Enviar alertas al canal configurado', state: slackAlerts, set: setSlackAlerts },
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm text-foreground">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.state} onCheckedChange={item.set} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Theme */}
        <TabsContent value="theme" className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Apariencia</h3>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-foreground">Modo oscuro</Label>
                <p className="text-xs text-muted-foreground">Interfaz optimizada para uso nocturno y larga duración</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {['Compacto', 'Normal', 'Cómodo'].map((density, i) => (
                <button
                  key={density}
                  className={cn(
                    'py-2.5 rounded-lg border text-xs font-medium transition-all',
                    i === 1
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/30',
                  )}
                >
                  {density}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Acento de color</h3>
            <div className="flex gap-3">
              {[
                { color: '#6334C0', label: 'WeKall Violet', active: true },
                { color: '#2563EB', label: 'Azul' },
                { color: '#16A34A', label: 'Verde' },
                { color: '#DC2626', label: 'Rojo' },
              ].map(c => (
                <button
                  key={c.color}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    c.active ? 'border-white scale-110' : 'border-transparent hover:scale-105',
                  )}
                  style={{ background: c.color }}
                  title={c.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Color de acento predeterminado: WeKall Violet #6334C0</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
