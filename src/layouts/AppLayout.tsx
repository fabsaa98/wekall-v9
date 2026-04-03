import { useState, useEffect } from 'react';

// Extend Window interface for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
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
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { role, setRole } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    (installPrompt as BeforeInstallPromptEvent).prompt();
    setShowInstallBanner(false);
    setInstallPrompt(null);
  }

  const currentPage = breadcrumbs[location.pathname] ?? 'WeKall Intelligence';

  function handleSurprise() {
    const q = surpriseQuestions[Math.floor(Math.random() * surpriseQuestions.length)];
    navigate('/vicky', { state: { question: q } });
  }

  function handleSearchOpen() {
    setSearchQuery('');
    setSearchOpen(true);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate('/vicky', { state: { question: searchQuery.trim() } });
      setSearchQuery('');
    }
  }

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleSearchOpen();
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-primary text-primary-foreground text-sm shrink-0 z-50">
          <span>📲 Instalar WeKall Intelligence como app</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-white font-medium text-xs transition-all"
            >
              Instalar
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="px-2 py-1 rounded hover:bg-white/20 text-white/70 text-xs transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    <div className="flex flex-1 h-0 overflow-hidden">
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

          {/* Search — conectado a Vicky */}
          <button
            onClick={handleSearchOpen}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-muted-foreground text-xs hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Search size={13} />
            <span>Pregúntale a Vicky...</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px]">⌘K</span>
          </button>

          {/* Search Modal */}
          {searchOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSearchOpen(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-xl mx-4 rounded-xl border border-border bg-card shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 p-4">
                  <Search size={18} className="text-primary shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="¿Cuál es el agente con más llamadas? ¿Cómo mejorar el contacto?..."
                    className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-all"
                  >
                    Preguntar
                  </button>
                </form>
                <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Powered by Vicky Insights · Enter para preguntar · Esc para cerrar</span>
                  <span className="text-[10px] text-muted-foreground">⌘K</span>
                </div>
              </div>
            </div>
          )}

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
    </div>
  );
}
