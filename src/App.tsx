import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '@/contexts/RoleContext';
import { ClientProvider } from '@/contexts/ClientContext';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});
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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Fix 2A, 2B, 2C — Páginas activas: Transcripciones, Subir Grabación, Búsqueda
import TranscriptionList from '@/pages/TranscriptionList';
import TranscriptionDetail from '@/pages/TranscriptionDetail';
import UploadRecording from '@/pages/UploadRecording';
import SearchView from '@/pages/SearchView';
// Feature V20: Speech Analytics
import SpeechAnalytics from '@/pages/SpeechAnalytics';
import ForecastView from '@/pages/ForecastView';
import FinancialIntelligence from '@/pages/FinancialIntelligence';
// Scale-G (21 abr 2026): ChatRAG, AlertsView, IntegrationsView, SettingsView y Dashboard
// son páginas huérfanas — NO se enrutan. Funcionalidad cubierta por VickyInsights y Alertas.
// Se mantienen en el repo pero sin ruta activa para evitar fragmentación de UX.

/**
 * AuthGuard — Control de acceso estricto:
 *
 * 1. Sesión activa de Supabase Auth → acceso permitido
 * 2. Sin sesión → redirigir a /login (siempre, sin excepciones)
 *
 * El localStorage wki_client_id solo se usa para recordar el cliente activo,
 * NO para saltarse la autenticación.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        // Confiar en la sesión de Supabase como fuente de verdad.
        // No bloquear por flags de localStorage — el JWT de Supabase es suficiente garantía.
        if (data.session) {
          setAuthState('allowed');
        } else {
          setAuthState('denied');
        }
      } catch {
        setAuthState('denied');
      }
    }

    checkAuth();

    // Suscribirse a cambios de sesión en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthState('allowed');
      } else {
        setAuthState('denied');
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
    <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={300}>
      <ClientProvider>
        <RoleProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Rutas protegidas */}
              <Route
                element={
                  <AuthGuard>
                    <AppLayout />
                  </AuthGuard>
                }
              >
                <Route path="/" element={<ErrorBoundary><Overview /></ErrorBoundary>} />
                <Route path="/vicky" element={<ErrorBoundary><VickyInsights /></ErrorBoundary>} />
                <Route path="/document-analysis" element={<ErrorBoundary><DocumentAnalysis /></ErrorBoundary>} />
                <Route path="/alertas" element={<ErrorBoundary><Alertas /></ErrorBoundary>} />
                <Route path="/equipos" element={<ErrorBoundary><Equipos /></ErrorBoundary>} />
                <Route path="/config" element={<ErrorBoundary><Configuracion /></ErrorBoundary>} />
                <Route path="/admin" element={<ErrorBoundary><Admin /></ErrorBoundary>} />
                {/* Fix 2A: Transcripciones */}
                <Route path="/transcriptions" element={<ErrorBoundary><TranscriptionList /></ErrorBoundary>} />
                <Route path="/transcriptions/:id" element={<ErrorBoundary><TranscriptionDetail /></ErrorBoundary>} />
                {/* Fix 2B: Subir grabación */}
                <Route path="/upload" element={<ErrorBoundary><UploadRecording /></ErrorBoundary>} />
                {/* Fix 2C: Búsqueda semántica global */}
                <Route path="/search" element={<ErrorBoundary><SearchView /></ErrorBoundary>} />
                <Route path="/speech-analytics" element={<ErrorBoundary><SpeechAnalytics /></ErrorBoundary>} />
                <Route path="/forecast" element={<ErrorBoundary><ForecastView /></ErrorBoundary>} />
                <Route path="/financial" element={<ErrorBoundary><FinancialIntelligence /></ErrorBoundary>} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </RoleProvider>
      </ClientProvider>
    </TooltipProvider>
    </QueryClientProvider>
  );
}
