import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Bell, Users, Settings, Zap, Brain, X, Menu, ShieldCheck, Mic, FileAudio, Upload, Search, TrendingUp, LogOut, DollarSign, ChevronDown, Building2 } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useClient } from '@/contexts/ClientContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Navegación agrupada — Scale-G UX Refactor (21 abr 2026) ───────────────
// Reducido de 12 ítems planos → 3 grupos con jerarquía clara.
// Acciones de ingesta (Subir grabación) movidas fuera del menú principal.
// Financial Intelligence con nombre completo (sin truncar).
const navGroups = [
  {
    label: 'Core',
    items: [
      { label: 'Overview', path: '/', icon: LayoutDashboard },
      { label: 'Vicky Insights', path: '/vicky', icon: Zap },
      { label: 'Alertas', path: '/alertas', icon: Bell },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { label: 'Executive Insights', path: '/document-analysis', icon: TrendingUp },
      // Speech Analytics, Transcripciones y Búsqueda unificados bajo "Análisis de Llamadas"
      { label: 'Speech Analytics', path: '/speech-analytics', icon: Mic },
      { label: 'Transcripciones', path: '/transcriptions', icon: FileAudio },
      { label: 'Búsqueda', path: '/search', icon: Search },
      // Badge "Estimado" manejado en la página. Nombre completo visible.
      { label: 'Financial Intelligence', path: '/financial', icon: DollarSign, badge: 'Estimado' },
      { label: 'Forecast', path: '/forecast', icon: TrendingUp, badge: 'Estimado' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { label: 'Equipos', path: '/equipos', icon: Users },
      { label: 'Configuración', path: '/config', icon: Settings },
    ],
  },
];

// ELIMINADO: "Subir grabación" (duplicado de "Subir y Analizar")
// La funcionalidad de ingesta ahora está unificada en /document-analysis

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const { role } = useRole();
  const { clientConfig, clientBranding, currentUser, clientId, setClientId } = useClient();
  const clientDisplayName = clientBranding?.company_name || clientConfig?.client_name || 'WeKall Intelligence';

  const initials = role.split(' ').map(w => w[0]).join('').slice(0, 2);

  // ─── CC Switcher — V29 API Backend (01 may 2026) ───────────────────────────
  const [ccOptions, setCcOptions] = useState<Array<{ client_id: string; name: string }>>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    async function loadCCOptions() {
      if (!clientId) return;
      try {
        // Detectar base client_id (ej: "bold" de "bold2")
        const baseId = clientId.replace(/\d+$/, '');
        const candidates = [baseId, `${baseId}2`, `${baseId}3`, `${baseId}4`];
        
        // Consultar instancias en paralelo usando API backend
        const results = await Promise.all(
          candidates.map(async (id) => {
            try {
              const resp = await fetch(`/api/client/config?client_id=${id}`);
              if (!resp.ok) return null;
              const data = await resp.json();
              // Filtro: solo instancias con nombre real (client_name != client_id)
              if (data.client_name === id) return null;
              return { client_id: id, name: data.client_name || id };
            } catch {
              return null;
            }
          })
        );
        
        const valid = results.filter(r => r !== null) as Array<{ client_id: string; name: string }>;
        if (valid.length > 1) {
          setCcOptions(valid);
        }
      } catch { /* silencioso */ }
    }
    loadCCOptions();
  }, [clientId]);

  async function handleSwitchCC(targetClientId: string) {
    console.log('[CC Switcher] Cambio solicitado:', { from: clientId, to: targetClientId, switching });
    
    if (targetClientId === clientId) {
      console.log('[CC Switcher] Ya est\u00e1 en esta instancia');
      setSwitcherOpen(false);
      return;
    }
    
    if (switching) {
      console.log('[CC Switcher] Cambio en progreso, ignorando');
      return;
    }
    
    setSwitching(true);
    setSwitcherOpen(false);
    console.log('[CC Switcher] Iniciando cambio...');
    
    // Actualizar en Supabase Auth user_metadata (persistencia)
    try {
      await supabase.auth.updateUser({
        data: { client_id: targetClientId }
      });
      console.log('[CC Switcher] Auth actualizado');
    } catch (err) {
      console.warn('[CC Switcher] Error al actualizar Auth:', err);
    }
    
    // Actualizar client_id en estado local y localStorage
    setClientId(targetClientId);
    localStorage.setItem('wki_client_id', targetClientId);
    console.log('[CC Switcher] localStorage actualizado');
    
    // Hard reload para que todo el contexto cargue limpio
    console.log('[CC Switcher] Realizando hard reload...');
    window.location.href = '/';
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${collapsed ? 'lg:w-16' : 'lg:w-[280px]'}
        w-[280px]
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4 min-h-[64px]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquareText size={16} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <h1 className="text-sm font-bold text-foreground truncate">WeKall Intelligence</h1>
              {clientBranding?.logo_url ? (
                <img
                  src={clientBranding.logo_url}
                  alt={clientDisplayName}
                  className="h-8 w-auto object-contain mt-0.5"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{clientDisplayName}</p>
              )}
            </div>
          )}
          {/* Desktop toggle */}
          <button
            onClick={onToggle}
            className="hidden lg:flex shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Menu size={16} />
          </button>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="flex lg:hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav agrupado — Scale-G UX Refactor */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {!collapsed && 'badge' in item && item.badge && (
                        <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          {item.badge}
                        </span>
                      )}
                      {isActive && !collapsed && !('badge' in item && item.badge) && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Admin — solo para role admin */}
          {currentUser?.role === 'admin' && (() => {
            const isActive = location.pathname.startsWith('/admin');
            return (
              <div className="border-t border-border/50 pt-1">
                <NavLink
                  to="/admin"
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                  }`}
                  title={collapsed ? 'Admin' : undefined}
                >
                  <ShieldCheck size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">Admin</span>}
                  {isActive && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </NavLink>
              </div>
            );
          })()}

          {/* Usuario + CC Switcher — Antes de Cerrar sesión */}
          <div className="border-t border-border/50 pt-3 pb-2">
            <div className="relative px-0.5">
              <div
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors ${
                  ccOptions.length > 1
                    ? 'cursor-pointer hover:bg-secondary/60'
                    : 'bg-secondary/30'
                }`}
                onClick={() => ccOptions.length > 1 && setSwitcherOpen(v => !v)}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/20">
                  {initials}
                </div>
                {!collapsed && (
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{role}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{clientDisplayName}</p>
                  </div>
                )}
                {!collapsed && ccOptions.length > 1 && (
                  <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                )}
              </div>

              {/* Dropdown switcher */}
              {switcherOpen && ccOptions.length > 1 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50">
                  <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest border-b border-border bg-secondary/30">
                    <Building2 size={10} className="inline mr-1" />Cambiar contact center
                  </p>
                  {ccOptions.map(opt => (
                    <button
                      key={opt.client_id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSwitchCC(opt.client_id);
                      }}
                      disabled={switching}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                        opt.client_id === clientId
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground hover:bg-secondary'
                      } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${opt.client_id === clientId ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      <span className="truncate">{opt.name}</span>
                      {opt.client_id === clientId && <span className="ml-auto text-[10px] text-primary/60">activo</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cerrar sesión — visible en el scroll del nav en móvil */}
          <div className="border-t border-border/50 pt-1 lg:hidden">
            <a
              href="/logout"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all"
            >
              <LogOut size={18} className="shrink-0" />
              <span>Cerrar sesión</span>
            </a>
          </div>
        </nav>

        {/* Footer — Botón Cerrar sesión (desktop) */}
        <div className="hidden lg:block border-t border-border px-3 py-3 mt-auto shrink-0">
          <a
            href="/logout"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all"
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </a>
        </div>
      </aside>
    </>
  );
}
