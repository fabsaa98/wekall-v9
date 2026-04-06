import { useState } from 'react';
import { CheckCircle, AlertCircle, Phone, MessageSquare, FileText, Zap, User, Palette, Database, Plug, Building2, LogOut, Globe, DollarSign, Linkedin, Instagram, Twitter, Facebook, Mail, Pencil, Save, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/lib/supabase';
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

  // ─── Bloque 3: Edición de branding ───────────────────────────────────────
  const [editingBranding, setEditingBranding] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    primary_color: clientBranding?.primary_color || '#6334C0',
    tagline: clientBranding?.tagline || '',
    website_url: clientBranding?.website_url || '',
    linkedin_url: clientBranding?.linkedin_url || '',
    instagram_url: clientBranding?.instagram_url || '',
    industry_description: clientBranding?.industry_description || '',
    contact_email: clientBranding?.contact_email || '',
    phone: clientBranding?.phone || '',
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  function startEditBranding() {
    // Sincronizar formulario con datos actuales de Supabase
    setBrandingForm({
      primary_color: clientBranding?.primary_color || '#6334C0',
      tagline: clientBranding?.tagline || '',
      website_url: clientBranding?.website_url || '',
      linkedin_url: clientBranding?.linkedin_url || '',
      instagram_url: clientBranding?.instagram_url || '',
      industry_description: clientBranding?.industry_description || '',
      contact_email: clientBranding?.contact_email || '',
      phone: clientBranding?.phone || '',
    });
    setEditingBranding(true);
    setSaveMsg('');
  }

  async function saveBranding() {
    if (!clientConfig?.client_id) return;
    setSavingBranding(true);
    setSaveMsg('');
    try {
      const { error } = await supabase
        .from('client_branding')
        .upsert({
          client_id: clientConfig.client_id,
          ...brandingForm,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

      if (error) throw error;
      setSaveMsg('✅ Cambios guardados correctamente');
      setEditingBranding(false);
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (err) {
      setSaveMsg(`❌ Error al guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setSavingBranding(false);
    }
  }

  function handleChangeCompany() {
    // Limpiar sesión y redirigir a login
    setCurrentUser(null);
    setClientId(''); // Fix 1G: limpiar sin resetear a 'credismart' hardcodeado
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
                    {/* Fix 1G: sin hardcodeo de 'credismart' */}
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      {clientConfig?.client_id || '—'}
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

          {/* Branding — Bloque 3: editable con botón Editar / Guardar */}
          {(clientBranding || clientConfig) && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Branding e identidad</h3>
                {!editingBranding ? (
                  <button
                    onClick={startEditBranding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingBranding(false); setSaveMsg(''); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-all"
                    >
                      <X size={12} /> Cancelar
                    </button>
                    <button
                      onClick={saveBranding}
                      disabled={savingBranding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/80 disabled:opacity-50 transition-all"
                    >
                      <Save size={12} />
                      {savingBranding ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                )}
              </div>

              {saveMsg && (
                <p className={cn(
                  'text-xs font-medium rounded-lg px-3 py-2 border',
                  saveMsg.startsWith('✅') ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20',
                )}>
                  {saveMsg}
                </p>
              )}

              {!editingBranding ? (
                /* ─── Modo lectura ─── */
                <>
                  {/* Logo + color */}
                  <div className="flex items-center gap-4">
                    {clientBranding?.logo_url ? (
                      <img
                        src={clientBranding.logo_url}
                        alt="Logo empresa"
                        className="h-14 w-14 rounded-xl object-contain border border-border bg-white/5 p-1"
                      />
                    ) : (
                      <div
                        className="h-14 w-14 rounded-xl border border-border flex items-center justify-center shrink-0 text-white font-bold text-xl"
                        style={{ backgroundColor: clientBranding?.primary_color || '#6334C0' }}
                      >
                        {(clientBranding?.company_name || clientConfig?.client_name || '?')
                          .split(' ')
                          .slice(0, 2)
                          .map((w: string) => w[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{clientBranding?.company_name || clientConfig?.client_name}</p>
                      {clientBranding?.tagline && (
                        <p className="text-xs text-muted-foreground mt-0.5">{clientBranding.tagline}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: clientBranding?.primary_color || '#6334C0' }} />
                        <code className="text-[11px] text-muted-foreground">{clientBranding?.primary_color || '#6334C0'}</code>
                      </div>
                    </div>
                  </div>

                  {clientBranding?.industry_description && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descripción</p>
                      <p className="text-sm text-foreground leading-relaxed">{clientBranding.industry_description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
                    {clientBranding?.website_url && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sitio web</p>
                        <a href={clientBranding.website_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1.5">
                          <Globe size={12} />{clientBranding.website_url.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {clientBranding?.contact_email && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email de contacto</p>
                        <a href={`mailto:${clientBranding.contact_email}`}
                          className="text-sm text-foreground hover:text-primary flex items-center gap-1.5">
                          <Mail size={12} className="text-muted-foreground" />{clientBranding.contact_email}
                        </a>
                      </div>
                    )}
                    {clientBranding?.phone && (
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Teléfono</p>
                        <p className="text-sm text-foreground">{clientBranding.phone}</p>
                      </div>
                    )}
                  </div>

                  {(clientBranding?.linkedin_url || clientBranding?.instagram_url || clientBranding?.twitter_url || clientBranding?.facebook_url) && (
                    <div className="border-t border-border pt-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Redes sociales</p>
                      <div className="flex items-center gap-4">
                        {clientBranding?.linkedin_url && (
                          <a href={clientBranding.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Linkedin size={14} /> LinkedIn
                          </a>
                        )}
                        {clientBranding?.instagram_url && (
                          <a href={clientBranding.instagram_url.startsWith('http') ? clientBranding.instagram_url : `https://instagram.com/${clientBranding.instagram_url.replace('@', '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-pink-400 transition-colors">
                            <Instagram size={14} /> Instagram
                          </a>
                        )}
                        {clientBranding?.twitter_url && (
                          <a href={clientBranding.twitter_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-sky-400 transition-colors">
                            <Twitter size={14} /> Twitter/X
                          </a>
                        )}
                        {clientBranding?.facebook_url && (
                          <a href={clientBranding.facebook_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-400 transition-colors">
                            <Facebook size={14} /> Facebook
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* ─── Modo edición — Bloque 3 ─── */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Color primario</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandingForm.primary_color}
                          onChange={e => setBrandingForm(f => ({ ...f, primary_color: e.target.value }))}
                          className="h-8 w-12 rounded border border-border cursor-pointer bg-card"
                        />
                        <input
                          type="text"
                          value={brandingForm.primary_color}
                          onChange={e => setBrandingForm(f => ({ ...f, primary_color: e.target.value }))}
                          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                          placeholder="#6334C0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Tagline</label>
                      <input
                        type="text"
                        value={brandingForm.tagline}
                        onChange={e => setBrandingForm(f => ({ ...f, tagline: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        placeholder="Slogan de tu empresa"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Sitio web</label>
                      <input
                        type="url"
                        value={brandingForm.website_url}
                        onChange={e => setBrandingForm(f => ({ ...f, website_url: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        placeholder="https://www.empresa.com"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Email de contacto</label>
                      <input
                        type="email"
                        value={brandingForm.contact_email}
                        onChange={e => setBrandingForm(f => ({ ...f, contact_email: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Teléfono</label>
                      <input
                        type="tel"
                        value={brandingForm.phone}
                        onChange={e => setBrandingForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        placeholder="+57 300 000 0000"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">LinkedIn</label>
                      <input
                        type="url"
                        value={brandingForm.linkedin_url}
                        onChange={e => setBrandingForm(f => ({ ...f, linkedin_url: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        placeholder="https://linkedin.com/company/..."
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Instagram</label>
                      <input
                        type="text"
                        value={brandingForm.instagram_url}
                        onChange={e => setBrandingForm(f => ({ ...f, instagram_url: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        placeholder="@empresa o URL"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descripción de la empresa</label>
                    <textarea
                      value={brandingForm.industry_description}
                      onChange={e => setBrandingForm(f => ({ ...f, industry_description: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 resize-none"
                      placeholder="Describe brevemente tu empresa, industria y propuesta de valor..."
                    />
                  </div>
                </div>
              )}
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
            {/* Fix 1G: sin fallbacks hardcodeados de 'Crediminuto / CrediSmart' */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Empresa', value: clientConfig?.client_name || 'Sin configurar' },
                { label: 'Industria', value: clientConfig?.industry || '—' },
                { label: 'País', value: clientConfig?.country || '—' },
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
