import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Sparkles, ChevronDown, Check } from 'lucide-react';
import { AppSidebar } from '@/components/AppSidebar';
import { useRole } from '@/contexts/RoleContext';
import type { Role } from '@/data/mockData';
import { surpriseQuestions } from '@/data/mockData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ROLES: Role[] = ['CEO', 'VP Ventas', 'VP CX', 'COO'];

const breadcrumbs: Record<string, string> = {
  '/': 'Overview',
  '/vicky': 'Vicky Insights',
  '/alertas': 'Alertas',
  '/equipos': 'Equipos',
  '/config': 'Configuración',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role, setRole } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = breadcrumbs[location.pathname] ?? 'WeKall Intelligence';

  function handleSurprise() {
    const q = surpriseQuestions[Math.floor(Math.random() * surpriseQuestions.length)];
    navigate('/vicky', { state: { question: q } });
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main */}
      <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-[280px]'}`}>
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-card/50 backdrop-blur-sm px-4 h-16 shrink-0">
          <button
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden sm:block">WeKall Intelligence</span>
            <span className="text-muted-foreground hidden sm:block">/</span>
            <span className="font-semibold text-foreground">{currentPage}</span>
          </div>

          <div className="flex-1" />

          {/* Search hint */}
          <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-muted-foreground text-xs hover:text-foreground hover:border-primary/30 transition-all">
            <Search size={13} />
            <span>Buscar en tus datos...</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">⌘K</span>
          </button>

          {/* Sorpréndeme */}
          <button
            onClick={handleSurprise}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-all"
          >
            <Sparkles size={13} />
            <span className="hidden sm:block">Sorpréndeme</span>
          </button>

          {/* Role selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-all">
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
                  {role.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <span className="hidden sm:block">{role}</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {ROLES.map(r => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => setRole(r)}
                  className="flex items-center justify-between"
                >
                  <span>{r}</span>
                  {role === r && <Check size={14} className="text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
