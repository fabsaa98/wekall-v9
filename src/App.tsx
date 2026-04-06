import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { RoleProvider } from '@/contexts/RoleContext';
import { ClientProvider } from '@/contexts/ClientContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/AppLayout';
import Overview from '@/pages/Overview';
import VickyInsights from '@/pages/VickyInsights';
import Alertas from '@/pages/Alertas';
import Equipos from '@/pages/Equipos';
import Configuracion from '@/pages/Configuracion';
import DocumentAnalysis from '@/pages/DocumentAnalysis';
import Login from '@/pages/Login';
import Admin from '@/pages/Admin';
import { supabase } from '@/lib/supabase';

/**
 * AuthGuard — Control de acceso con doble verificación:
 *
 * 1. Sesión activa de Supabase Auth → acceso permitido (autenticación real)
 * 2. localStorage wki_client_id → acceso permitido (modo legacy / compatibilidad)
 * 3. Nada → redirigir a /login
 *
 * Zero breaking changes: los usuarios existentes con localStorage siguen entrando.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    async function checkAuth() {
      try {
        // 1. Verificar sesión Supabase Auth
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setAuthState('allowed');
          return;
        }
      } catch {
        // Si falla la verificación de Auth, continuar con fallback
      }

      // 2. Fallback: verificar localStorage (modo legacy)
      const stored = localStorage.getItem('wki_client_id');
      if (stored) {
        setAuthState('allowed');
        return;
      }

      // 3. Sin autenticación → redirigir a login
      setAuthState('denied');
    }

    checkAuth();

    // También suscribirse a cambios de sesión en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthState('allowed');
      } else {
        // Solo denegar si tampoco hay localStorage
        const stored = localStorage.getItem('wki_client_id');
        if (!stored) {
          setAuthState('denied');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authState === 'checking') {
    // Pantalla de carga mínima mientras verifica auth
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'denied') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <ClientProvider>
        <RoleProvider>
          <BrowserRouter basename="/">
            <Routes>
              {/* Ruta pública */}
              <Route path="/login" element={<Login />} />

              {/* Rutas protegidas */}
              <Route
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              >
                <Route path="/" element={<Overview />} />
                <Route path="/vicky" element={<VickyInsights />} />
                <Route path="/document-analysis" element={<DocumentAnalysis />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/equipos" element={<Equipos />} />
                <Route path="/config" element={<Configuracion />} />
                <Route path="/admin" element={<Admin />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </ClientProvider>
    </TooltipProvider>
  );
}
