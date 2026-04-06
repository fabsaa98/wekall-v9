import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldCheck, Users, Building2, Plus, Eye, PowerOff, Power,
  ChevronRight, X, Loader2, RefreshCw, UserPlus
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useClient } from '@/contexts/ClientContext';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientRow {
  client_id: string;
  client_name: string;
  industry?: string;
  country?: string;
  currency?: string;
  active?: boolean;
  userCount?: number;
  cdrDays?: number;
}

interface ClientBranding {
  client_id: string;
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
  tagline?: string;
}

interface UserRow {
  id?: string;
  email: string;
  client_id: string;
  role: string;
  name?: string;
  active?: boolean;
  created_at?: string;
  last_login?: string;
}

interface CDRMetric {
  fecha: string;
  total_llamadas: number;
  contactos_efectivos: number;
  tasa_contacto_pct: number;
}

interface ClientDetail {
  branding: ClientBranding | null;
  users: UserRow[];
  cdrMetrics: CDRMetric[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'cobranzas', 'servicio', 'ventas', 'soporte', 'banca', 'salud', 'retail', 'telco'
];

const COUNTRIES = [
  { value: 'colombia', label: 'Colombia', currency: 'COP' },
  { value: 'peru', label: 'Perú', currency: 'PEN' },
  { value: 'mexico', label: 'México', currency: 'MXN' },
  { value: 'ecuador', label: 'Ecuador', currency: 'USD' },
  { value: 'chile', label: 'Chile', currency: 'CLP' },
  { value: 'argentina', label: 'Argentina', currency: 'ARS' },
];

const CURRENCY_MAP: Record<string, string> = {
  colombia: 'COP', peru: 'PEN', mexico: 'MXN',
  ecuador: 'USD', chile: 'CLP', argentina: 'ARS',
};

const INDUSTRY_COLORS: Record<string, string> = {
  cobranzas: 'bg-red-500/15 text-red-400 border-red-500/30',
  servicio: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ventas: 'bg-green-500/15 text-green-400 border-green-500/30',
  soporte: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  banca: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  salud: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  retail: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  telco: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  );
}

// ─── Client Detail Panel ─────────────────────────────────────────────────────

function ClientDetailPanel({
  client,
  onClose,
}: {
  client: ClientRow;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [brandingRes, usersRes, cdrRes] = await Promise.all([
          supabase.from('client_branding').select('*').eq('client_id', client.client_id).maybeSingle(),
          supabase.from('app_users').select('*').eq('client_id', client.client_id),
          supabase.from('cdr_daily_metrics')
            .select('fecha, total_llamadas, contactos_efectivos, tasa_contacto_pct')
            .eq('client_id', client.client_id)
            .order('fecha', { ascending: false })
            .limit(3),
        ]);
        setDetail({
          branding: brandingRes.data as ClientBranding | null,
          users: (usersRes.data || []) as UserRow[],
          cdrMetrics: (cdrRes.data || []) as CDRMetric[],
        });
      } catch (e) {
        console.error(e);
        toast.error('Error cargando detalles del cliente');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client.client_id]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-foreground">{client.client_name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{client.client_id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : detail ? (
          <>
            {/* Branding */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Branding</h3>
              <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg border border-border shrink-0"
                    style={{ backgroundColor: detail.branding?.primary_color || '#6334C0' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {detail.branding?.company_name || client.client_name}
                    </p>
                    {detail.branding?.tagline && (
                      <p className="text-xs text-muted-foreground">{detail.branding.tagline}</p>
                    )}
                  </div>
                </div>
                {detail.branding?.logo_url && (
                  <img
                    src={detail.branding.logo_url}
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                  />
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Color: <code className="text-foreground">{detail.branding?.primary_color || '#6334C0'}</code></span>
                </div>
              </div>
            </section>

            {/* Users */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Usuarios ({detail.users.length})
              </h3>
              {detail.users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin usuarios registrados</p>
              ) : (
                <div className="space-y-2">
                  {detail.users.map((u, i) => (
                    <div key={u.id || i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CDR */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Últimos CDR ({detail.cdrMetrics.length} días)
              </h3>
              {detail.cdrMetrics.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos CDR</p>
              ) : (
                <div className="space-y-2">
                  {detail.cdrMetrics.map((m) => (
                    <div key={m.fecha} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{m.fecha}</span>
                        <span className="text-xs font-semibold text-primary">{m.tasa_contacto_pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Llamadas: <span className="text-foreground">{m.total_llamadas.toLocaleString()}</span></span>
                        <span>Contactos: <span className="text-foreground">{m.contactos_efectivos.toLocaleString()}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── New User Form ────────────────────────────────────────────────────────────

function NewUserForm({
  clients,
  onClose,
  onCreated,
}: {
  clients: ClientRow[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '', email: '', client_id: '', role: 'viewer',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.client_id) {
      toast.error('Nombre, email y cliente son requeridos');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('app_users').insert({
        email: form.email,
        name: form.name,
        client_id: form.client_id,
        role: form.role,
        active: true,
      });
      if (error) throw error;
      toast.success(`Usuario ${form.name} creado exitosamente`);
      onCreated();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error creando usuario: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">Nuevo Usuario</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X size={14} />
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Nombre *</Label>
          <Input
            placeholder="Juan Pérez"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email *</Label>
          <Input
            type="email"
            placeholder="juan@empresa.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Cliente *</Label>
          <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.client_id} value={c.client_id}>{c.client_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Rol</Label>
          <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
            Crear usuario
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Tab 1: Clients ───────────────────────────────────────────────────────────

function ClientsTab() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data: configs, error } = await supabase
        .from('client_config')
        .select('*')
        .order('client_name', { ascending: true });
      if (error) throw error;

      // Enrich with user counts and CDR counts
      const enriched = await Promise.all(
        (configs || []).map(async (c) => {
          const [usersRes, cdrRes] = await Promise.all([
            supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('client_id', c.client_id),
            supabase.from('cdr_daily_metrics').select('fecha', { count: 'exact', head: true }).eq('client_id', c.client_id),
          ]);
          return {
            ...c,
            userCount: usersRes.count ?? 0,
            cdrDays: cdrRes.count ?? 0,
          } as ClientRow;
        })
      );
      setClients(enriched);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const toggleActive = async (client: ClientRow) => {
    setToggling(client.client_id);
    try {
      const newActive = !client.active;
      const { error } = await supabase
        .from('client_config')
        .update({ active: newActive })
        .eq('client_id', client.client_id);
      if (error) throw error;
      setClients(prev => prev.map(c =>
        c.client_id === client.client_id ? { ...c, active: newActive } : c
      ));
      toast.success(`Cliente ${newActive ? 'activado' : 'desactivado'}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error: ${msg}`);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{clients.length} clientes registrados</p>
        <Button variant="outline" size="sm" onClick={loadClients} disabled={loading}>
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card className="border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Nombre</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">ID</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Industria</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">País</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Estado</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Usuarios</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">CDR días</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Sin clientes registrados
                </TableCell>
              </TableRow>
            ) : (
              clients.map(client => (
                <TableRow key={client.client_id} className="border-border hover:bg-secondary/20">
                  <TableCell className="font-medium text-foreground">{client.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{client.client_id}</code>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {client.industry ? (
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${INDUSTRY_COLORS[client.industry] || 'bg-secondary/50 text-muted-foreground border-border'}`}
                      >
                        {client.industry}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground capitalize">
                    {client.country || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={client.active
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-secondary/50 text-muted-foreground border-border'}
                    >
                      {client.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {client.userCount ?? 0}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {client.cdrDays ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedClient(client)}
                      >
                        <Eye size={13} className="mr-1" />
                        Detalles
                        <ChevronRight size={13} className="ml-0.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${client.active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                        onClick={() => toggleActive(client)}
                        disabled={toggling === client.client_id}
                        title={client.active ? 'Desactivar' : 'Activar'}
                      >
                        {toggling === client.client_id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : client.active ? (
                          <PowerOff size={13} />
                        ) : (
                          <Power size={13} />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail panel */}
      {selectedClient && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelectedClient(null)}
          />
          <ClientDetailPanel
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
          />
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Users ─────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUser, setShowNewUser] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, clientsRes] = await Promise.all([
        supabase.from('app_users').select('*').order('created_at', { ascending: false }),
        supabase.from('client_config').select('client_id, client_name').order('client_name', { ascending: true }),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (clientsRes.error) throw clientsRes.error;
      setUsers((usersRes.data || []) as UserRow[]);
      setClients((clientsRes.data || []) as ClientRow[]);
    } catch (e) {
      console.error(e);
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getClientName = (clientId: string) =>
    clients.find(c => c.client_id === clientId)?.client_name || clientId;

  const toggleUserActive = async (user: UserRow) => {
    if (!user.id) return;
    setToggling(user.id);
    try {
      const newActive = !user.active;
      const { error } = await supabase
        .from('app_users')
        .update({ active: newActive })
        .eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newActive } : u));
      toast.success(`Usuario ${newActive ? 'activado' : 'desactivado'}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error: ${msg}`);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewUser(v => !v)}>
            <UserPlus size={14} className="mr-2" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      {showNewUser && (
        <NewUserForm
          clients={clients}
          onClose={() => setShowNewUser(false)}
          onCreated={loadData}
        />
      )}

      <Card className="border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Nombre</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Email</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cliente</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Rol</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Estado</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Último login</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Sin usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map(user => (
                <TableRow key={user.id || user.email} className="border-border hover:bg-secondary/20">
                  <TableCell className="font-medium text-foreground">{user.name || '—'}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {getClientName(user.client_id)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize bg-primary/10 text-primary border-primary/20">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={user.active
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-secondary/50 text-muted-foreground border-border'}
                    >
                      {user.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(user.last_login)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${user.active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                      onClick={() => toggleUserActive(user)}
                      disabled={toggling === user.id}
                      title={user.active ? 'Desactivar' : 'Activar'}
                    >
                      {toggling === user.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : user.active ? (
                        <PowerOff size={13} />
                      ) : (
                        <Power size={13} />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Tab 3: Create Client ─────────────────────────────────────────────────────

const EMPTY_FORM = {
  companyName: '',
  clientId: '',
  industry: '',
  country: '',
  currency: '',
  primaryColor: '#6334C0',
  ceoEmail: '',
  ceoName: '',
  ceoRole: 'CEO',
};

function CreateClientTab() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ clientId: string; ceoEmail: string; ceoName: string } | null>(null);

  const update = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-slugify clientId when companyName changes
      if (field === 'companyName') {
        next.clientId = slugify(value);
      }
      // Auto-set currency when country changes
      if (field === 'country') {
        next.currency = CURRENCY_MAP[value] || '';
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['companyName', 'clientId', 'industry', 'country', 'ceoEmail', 'ceoName'] as const;
    for (const field of required) {
      if (!form[field]) {
        toast.error(`El campo "${field}" es requerido`);
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Insert client_config
      const { error: configError } = await supabase.from('client_config').insert({
        client_id: form.clientId,
        client_name: form.companyName,
        industry: form.industry,
        country: form.country,
        currency: form.currency,
        active: true,
      });
      if (configError) throw new Error(`client_config: ${configError.message}`);

      // 2. Insert client_branding
      const { error: brandingError } = await supabase.from('client_branding').insert({
        client_id: form.clientId,
        company_name: form.companyName,
        primary_color: form.primaryColor,
      });
      if (brandingError) throw new Error(`client_branding: ${brandingError.message}`);

      // 3. Insert app_users (CEO)
      const { error: userError } = await supabase.from('app_users').insert({
        email: form.ceoEmail,
        name: form.ceoName,
        client_id: form.clientId,
        role: form.ceoRole.toLowerCase().replace(/\s+/g, '_'),
        active: true,
      });
      if (userError) throw new Error(`app_users: ${userError.message}`);

      // 4. Success
      setSuccessInfo({ clientId: form.clientId, ceoEmail: form.ceoEmail, ceoName: form.ceoName });
      toast.success(`Cliente "${form.companyName}" creado exitosamente`);
      setForm({ ...EMPTY_FORM });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error creando cliente: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {successInfo && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <ShieldCheck size={16} />
            Cliente creado exitosamente
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Cliente ID: <code className="text-foreground">{successInfo.clientId}</code></p>
            <p>• CEO: <span className="text-foreground">{successInfo.ceoName}</span> — <span className="text-foreground">{successInfo.ceoEmail}</span></p>
            <p className="text-xs text-muted-foreground/70 mt-2">Cuando Supabase Auth esté activo, se enviará la invitación por email.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessInfo(null)}>Cerrar</Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Datos del cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nombre de la empresa *</Label>
              <Input
                placeholder="CrediSmart S.A.S."
                value={form.companyName}
                onChange={e => update('companyName', e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ID del cliente *</Label>
              <Input
                placeholder="credismart"
                value={form.clientId}
                onChange={e => update('clientId', e.target.value)}
                className="h-10 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Auto-generado. Puede editarse manualmente.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Industria *</Label>
              <Select value={form.industry} onValueChange={v => update('industry', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar industria" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => (
                    <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>País *</Label>
              <Select value={form.country} onValueChange={v => update('country', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Input
                value={form.currency}
                onChange={e => update('currency', e.target.value)}
                placeholder="COP"
                className="h-10 font-mono text-sm"
                readOnly={!!form.country}
              />
              <p className="text-xs text-muted-foreground">Auto por país</p>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-1.5 flex-1">
                <Label>Color principal</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={form.primaryColor}
                    onChange={e => update('primaryColor', e.target.value)}
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={e => update('primaryColor', e.target.value)}
                    placeholder="#6334C0"
                    className="h-10 font-mono text-sm flex-1"
                  />
                </div>
              </div>
              <div
                className="h-14 w-14 rounded-xl border border-border shrink-0 mt-5"
                style={{ backgroundColor: form.primaryColor }}
              />
            </div>
          </CardContent>
        </Card>

        {/* CEO Info */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Usuario administrador (CEO)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="María García"
                value={form.ceoName}
                onChange={e => update('ceoName', e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="maria@empresa.com"
                value={form.ceoEmail}
                onChange={e => update('ceoEmail', e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={form.ceoRole} onValueChange={v => update('ceoRole', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="VP Ventas">VP Ventas</SelectItem>
                  <SelectItem value="VP CX">VP CX</SelectItem>
                  <SelectItem value="COO">COO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground pb-2">
                Se creará sin contraseña. Cuando Supabase Auth esté activo, recibirá invitación por email.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Creando cliente...
            </>
          ) : (
            <>
              <Plus size={16} className="mr-2" />
              Crear cliente
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function Admin() {
  const { currentUser } = useClient();

  // Guard: solo admins
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
          <ShieldCheck size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Consola de Administración</h1>
          <p className="text-sm text-muted-foreground">WeKall Intelligence — Panel de control global</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clients" className="space-y-5">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="clients" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Building2 size={14} />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Users size={14} />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Plus size={14} />
            Crear cliente
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-0">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <UsersTab />
        </TabsContent>
        <TabsContent value="create" className="mt-0">
          <CreateClientTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
