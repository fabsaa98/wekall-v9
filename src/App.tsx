import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Guard: si no hay client_id en localStorage, redirige a /login
// IMPORTANTE: Si no hay client_id, usa 'credismart' como default
// para no romper el acceso actual de Fabián.
function AuthGuard({ children }: { children: React.ReactNode }) {
  const stored = localStorage.getItem('wki_client_id');
  // Si no hay nada en localStorage, guardamos 'credismart' como default
  // para mantener compatibilidad con el acceso existente
  if (!stored) {
    localStorage.setItem('wki_client_id', 'credismart');
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
