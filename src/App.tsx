import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoleProvider } from '@/contexts/RoleContext';
import AppLayout from '@/layouts/AppLayout';
import Overview from '@/pages/Overview';
import VickyInsights from '@/pages/VickyInsights';
import Alertas from '@/pages/Alertas';
import Equipos from '@/pages/Equipos';
import Configuracion from '@/pages/Configuracion';

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter basename="/wekall-v9">
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/vicky" element={<VickyInsights />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/config" element={<Configuracion />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
