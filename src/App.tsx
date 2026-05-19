import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '@/contexts/RoleContext';
import { ClientProvider } from '@/contexts/ClientContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/lib/supabase';

// Sprint 1 · P1-6: lazy loading de rutas.
// Antes: las 26 páginas se importaban estáticamente → bundle inicial >1.5MB.
// Después: cada ruta se carga on-demand → bundle inicial <300KB (target).
//
// AppLayout y Login NO son lazy porque siempre se cargan (frame de la app + ruta pública por defecto).
import AppLayout from '@/layouts/AppLayout';
import Login from '@/pages/Login';

const Overview = lazy(() => import('@/pages/Overview'));
const DashboardAPI = lazy(() => import('@/pages/DashboardAPI').then((m) => ({ default: m.DashboardAPI })));
const VickyInsights = lazy(() => import('@/pages/VickyInsights'));
const Alertas = lazy(() => import('@/pages/Alertas'));
const Equipos = lazy(() => import('@/pages/Equipos'));
const Configuracion = lazy(() => import('@/pages/Configuracion'));
const DocumentAnalysis = lazy(() => import('@/pages/DocumentAnalysis'));
const ExecutiveInsightsHistory = lazy(() => import('@/pages/ExecutiveInsightsHistory'));
const AsyncDocumentTest = lazy(() => import('@/pages/AsyncDocumentTest').then((m) => ({ default: m.AsyncDocumentTest })));
const Admin = lazy(() => import('@/pages/Admin'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Logout = lazy(() => import('@/pages/Logout'));
const TranscriptionList = lazy(() => import('@/pages/TranscriptionList'));
const TranscriptionDetail = lazy(() => import('@/pages/TranscriptionDetail'));
const UploadRecording = lazy(() => import('@/pages/UploadRecording'));
const SearchView = lazy(() => import('@/pages/SearchView'));
const SpeechAnalytics = lazy(() => import('@/pages/SpeechAnalytics'));
const CustomerJourney = lazy(() => import('@/pages/CustomerJourney'));
const ForecastView = lazy(() => import('@/pages/ForecastView'));
const FinancialIntelligence = lazy(() => import('@/pages/FinancialIntelligence'));
const FinancialConfig = lazy(() => import('@/pages/FinancialConfig'));
const ChannelCostComparison = lazy(() => import('@/pages/ChannelCostComparison'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
});

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" role="status" aria-label="Cargando ruta">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function withSuspense(node: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{node}</Suspense>
    </ErrorBoundary>
  );
}

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
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center" role="status" aria-label="Verificando sesión">
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
                <Route path="/logout" element={withSuspense(<Logout />)} />
                <Route path="/forgot-password" element={withSuspense(<ForgotPassword />)} />
                <Route path="/reset-password" element={withSuspense(<ResetPassword />)} />

                {/* Rutas protegidas */}
                <Route
                  element={
                    <AuthGuard>
                      <AppLayout />
                    </AuthGuard>
                  }
                >
                  <Route path="/" element={withSuspense(<Overview />)} />
                  <Route path="/dashboard-api" element={withSuspense(<DashboardAPI />)} />
                  <Route path="/vicky" element={withSuspense(<VickyInsights />)} />
                  <Route path="/document-analysis" element={withSuspense(<DocumentAnalysis />)} />
                  <Route path="/executive-insights/history" element={withSuspense(<ExecutiveInsightsHistory />)} />
                  <Route path="/async-test" element={withSuspense(<AsyncDocumentTest />)} />
                  <Route path="/alertas" element={withSuspense(<Alertas />)} />
                  <Route path="/equipos" element={withSuspense(<Equipos />)} />
                  <Route path="/config" element={withSuspense(<Configuracion />)} />
                  <Route path="/admin" element={withSuspense(<Admin />)} />
                  <Route path="/transcriptions" element={withSuspense(<TranscriptionList />)} />
                  <Route path="/transcriptions/:id" element={withSuspense(<TranscriptionDetail />)} />
                  <Route path="/upload" element={withSuspense(<UploadRecording />)} />
                  <Route path="/search" element={withSuspense(<SearchView />)} />
                  <Route path="/speech-analytics" element={withSuspense(<SpeechAnalytics />)} />
                  <Route path="/customer-journey" element={withSuspense(<CustomerJourney />)} />
                  <Route path="/forecast" element={withSuspense(<ForecastView />)} />
                  <Route path="/financial" element={withSuspense(<FinancialIntelligence />)} />
                  <Route path="/financial-config" element={withSuspense(<FinancialConfig />)} />
                  <Route path="/channel-costs" element={withSuspense(<ChannelCostComparison />)} />
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
