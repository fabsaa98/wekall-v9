// Scale-H US-EI-008: Página Historial Completo
// Executive Insights History — Tabla completa con filtros
// 01 de mayo de 2026

import { useState, useEffect } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { getExecutiveInsights, deleteExecutiveInsight, type ExecutiveInsight } from '@/lib/executiveInsights';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search, Eye, Trash2, ChevronLeft, ChevronRight, FileAudio, FileText, FileSpreadsheet, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 20;

type DateFilter = 'all' | '7d' | '30d' | '90d';

export default function ExecutiveInsightsHistory() {
  const { clientConfig } = useClient();
  const navigate = useNavigate();
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (clientConfig) {
      getExecutiveInsights(clientConfig.client_id).then((data) => {
        setInsights(data);
        setLoading(false);
      });
    }
  }, [clientConfig]);

  // Filtrado
  const filtered = insights.filter((doc) => {
    // Búsqueda por nombre
    if (searchQuery && !doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filtro de fecha
    if (dateFilter !== 'all') {
      const docDate = new Date(doc.created_at);
      const now = new Date();
      const daysAgo = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      if (docDate < cutoff) return false;
    }

    // Filtro de estado
    if (statusFilter === 'approved' && doc.analysis.startsWith('❌')) return false;
    if (statusFilter === 'rejected' && !doc.analysis.startsWith('❌')) return false;

    return true;
  });

  // Paginación
  const paginatedData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Export CSV
  const exportCSV = () => {
    if (!clientConfig) return;

    const csv = [
      ['Fecha', 'Archivo', 'Tipo', 'Estado', 'Executive Brief'].join(','),
      ...filtered.map((doc) => [
        new Date(doc.created_at).toLocaleDateString('es-CO'),
        doc.file_name,
        doc.file_type,
        doc.analysis.startsWith('❌') ? 'Rechazado' : 'Aprobado',
        `"${(doc.executive_brief || '').replace(/"/g, '""')}"`, // Escape quotes
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-insights-${clientConfig.client_id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este análisis? Esta acción no se puede deshacer.')) return;
    const success = await deleteExecutiveInsight(id);
    if (success) {
      setInsights((prev) => prev.filter((doc) => doc.id !== id));
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'audio':
        return <FileAudio size={16} className="text-primary" />;
      case 'pdf':
      case 'word':
        return <FileText size={16} className="text-primary" />;
      case 'excel':
      case 'csv':
        return <FileSpreadsheet size={16} className="text-primary" />;
      case 'image':
        return <ImageIcon size={16} className="text-primary" />;
      case 'whatsapp':
        return <MessageCircle size={16} className="text-primary" />;
      default:
        return <FileText size={16} className="text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Executive Insights — Historial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} documento{filtered.length !== 1 ? 's' : ''} analizad{filtered.length !== 1 ? 'os' : 'o'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => navigate('/document-analysis')} variant="default">
            Volver al análisis
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de archivo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset page on search
            }}
            className="pl-9"
          />
        </div>
        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value as DateFilter);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">Todas las fechas</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'approved' | 'rejected');
            setPage(1);
          }}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">Todos los estados</option>
          <option value="approved">Solo aprobados</option>
          <option value="rejected">Solo rechazados</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No se encontraron documentos</p>
          {searchQuery && (
            <Button
              variant="link"
              onClick={() => {
                setSearchQuery('');
                setDateFilter('all');
                setStatusFilter('all');
                setPage(1);
              }}
              className="mt-2"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Fecha</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="w-[80px]">Tipo</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Executive Brief</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('es-CO')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.file_type)}
                        <span className="font-medium text-sm truncate max-w-xs">{doc.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                        {doc.file_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-bold',
                          doc.analysis.startsWith('❌')
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-green-500/10 text-green-600'
                        )}
                      >
                        {doc.analysis.startsWith('❌') ? 'Rechazado' : 'Aprobado'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-md">
                      {doc.executive_brief ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground hover:text-foreground">
                            Ver brief...
                          </summary>
                          <p className="text-xs mt-2 leading-relaxed">{doc.executive_brief}</p>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin brief</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/document-analysis', { state: { selectedDocId: doc.id } })}
                          title="Ver análisis completo"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(doc.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1 px-3 py-1 text-sm">
                  Página {page} de {totalPages}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
