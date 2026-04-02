import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Bell, Users, Settings, Zap, X, Menu } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Vicky Insights', path: '/vicky', icon: Zap },
  { label: 'Alertas', path: '/alertas', icon: Bell },
  { label: 'Equipos', path: '/equipos', icon: Users },
  { label: 'Configuración', path: '/config', icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const { role } = useRole();

  const initials = role.split(' ').map(w => w[0]).join('').slice(0, 2);

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
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Business Intelligence</p>
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map(item => {
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
                  <span className="truncate lg:block">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer — Logo cliente + rol */}
        <div className="border-t border-border px-3 py-3 space-y-2">
          {/* Logo cliente */}
          {!collapsed && (
            <div className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-secondary/50">
              <img
                src="/wekall-v9/credismart-logo.png"
                alt="CrediSmart"
                className="h-7 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          {/* Usuario y rol */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary border border-primary/20">
              {initials}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">{role}</p>
                <p className="text-[10px] text-muted-foreground truncate">Crediminuto / CrediSmart</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
