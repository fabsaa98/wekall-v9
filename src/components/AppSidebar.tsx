import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Bell, Users, Settings, Zap, Brain, X, Menu, ShieldCheck, Mic, FileAudio, Upload, Search, TrendingUp, LogOut, DollarSign } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useClient } from '@/contexts/ClientContext';
import { signOut } from '@/lib/supabase';

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
      // Speech Analytics, Transcripciones y Búsqueda unificados bajo "Análisis de Llamadas"
      { label: 'Speech Analytics', path: '/speech-analytics', icon: Mic },
      { label: 'Transcripciones', path: '/transcriptions', icon: FileAudio },
      { label: 'Búsqueda', path: '/search', icon: Search },
      { label: 'Análisis Docs', path: '/document-analysis', icon: Brain },
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

// Acción de ingesta — botón flotante dentro de Transcripciones o modal
// (ya no ocupa ítem de menú de primer nivel)
const ingestAction = { label: 'Subir grabación', path: '/upload', icon: Upload };

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const { role } = useRole();
  const { clientConfig, clientBranding, currentUser, setCurrentUser } = useClient();
  const clientDisplayName = clientBranding?.company_name || clientConfig?.client_name || 'WeKall Intelligence';

  const initials = role.split(' ').map(w => w[0]).join('').slice(0, 2);

  function handleLogout() {
    // Limpiar todo el storage
    localStorage.clear();
    sessionStorage.clear();
    // Cerrar sesión Supabase en background (no await — no bloquear el redirect)
    signOut().catch(() => {});
    // Hard reload a /login — destruye todo el estado de React
    window.location.href = '/login';
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
        {/* pb-32 en móvil para que el último ítem quede visible sobre el footer */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 pb-32 lg:pb-3">
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

          {/* Acción de ingesta — separada del nav principal */}
          {(() => {
            const isActive = location.pathname === ingestAction.path;
            const Icon = ingestAction.icon;
            return (
              <div className="pt-1 border-t border-border/50">
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Acciones
                  </p>
                )}
                <NavLink
                  to={ingestAction.path}
                  onClick={onMobileClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                  }`}
                  title={collapsed ? ingestAction.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{ingestAction.label}</span>}
                </NavLink>
              </div>
            );
          })()}

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

          {/* Cerrar sesión — visible en el scroll del nav en móvil (lg: solo en footer) */}
          <div className="border-t border-border/50 pt-1 lg:hidden">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all"
            >
              <LogOut size={18} className="shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </nav>

        {/* Footer — Logo cliente + rol */}
        <div className="border-t border-border px-3 py-3 space-y-2">
          {/* Logo cliente */}
          {!collapsed && (
            <div className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-secondary/50">
              {clientBranding?.logo_url ? (
                <img
                  src={clientBranding.logo_url}
                  alt={clientDisplayName}
                  className="h-7 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground truncate">{clientDisplayName}</span>
              )}
            </div>
          )}
          {/* Usuario y rol */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/20">
              {initials}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium text-foreground truncate">{role}</p>
                <p className="text-[10px] text-muted-foreground truncate">{clientDisplayName}</p>
              </div>
            )}
          </div>
          {/* Botón Cerrar sesión */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all"
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
