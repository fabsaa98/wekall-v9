import { MagnifyingGlass, House } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center px-4">
      <div className="rounded-full bg-primary/10 p-6 mb-6">
        <MagnifyingGlass size={56} weight="light" className="text-primary" />
      </div>
      <h1 className="text-[35px] font-light text-foreground mb-2">404</h1>
      <p className="text-lg font-medium text-foreground mb-1">Página no encontrada</p>
      <p className="text-sm text-muted-foreground mb-6">La página que buscas no existe o fue movida.</p>
      <Link to="/" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-wk-violet-dark transition-colors">
        <House size={18} weight="light" /> Volver al Dashboard
      </Link>
    </div>
  );
}
