// Scale-H US-EI-011: Export to PDF
// 01 de mayo de 2026

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface BenchmarkMetric {
  metric: string;
  benchmark_value: number;
  benchmark_source: string;
  top_quartile?: number;
  bottom_quartile?: number;
  unit: string;
  current_value?: number;
  gap_percent?: number;
  position?: 'above' | 'below' | 'inline';
}

interface ExportPDFParams {
  fileName: string;
  fileType: string;
  clientName: string;
  executiveBrief?: string;
  analysis: string;
  benchmarks?: BenchmarkMetric[];
  sources?: string[];
  createdAt: string;
}

const metricLabels: Record<string, string> = {
  tasa_contacto: 'Tasa de Contacto',
  aht: 'AHT (Tiempo Promedio)',
  fcr: 'FCR (First Call Resolution)',
  csat: 'CSAT (Satisfacción)',
  nps: 'Net Promoter Score',
  abandono: 'Tasa de Abandono',
  conversion: 'Tasa de Conversión',
  tasa_promesa: 'Tasa de Promesa de Pago',
  costo_llamada: 'Costo por Llamada',
  tco: 'TCO (Total Cost of Ownership)',
  productividad: 'Productividad Agente',
  utilizacion: 'Utilización',
};

export function exportToPDF(params: ExportPDFParams) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Header
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Insights', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100);
  pdf.text(params.clientName, margin, yPosition);
  yPosition += 5;
  pdf.text(new Date(params.createdAt).toLocaleDateString('es-CO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), margin, yPosition);
  yPosition += 12;

  // Document info box
  pdf.setDrawColor(200);
  pdf.setFillColor(248, 248, 248);
  pdf.roundedRect(margin, yPosition, contentWidth, 18, 3, 3, 'FD');
  
  pdf.setFontSize(9);
  pdf.setTextColor(60);
  pdf.text(`Documento: ${params.fileName}`, margin + 5, yPosition + 7);
  pdf.text(`Tipo: ${params.fileType.toUpperCase()}`, margin + 5, yPosition + 13);
  yPosition += 25;

  // Executive Brief (if exists)
  if (params.executiveBrief) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text('Executive Brief', margin, yPosition);
    yPosition += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(40);
    const briefLines = pdf.splitTextToSize(params.executiveBrief, contentWidth);
    
    // Brief box con fondo dorado suave
    const briefHeight = briefLines.length * 5 + 8;
    pdf.setFillColor(254, 243, 199); // amber-100
    pdf.roundedRect(margin, yPosition - 2, contentWidth, briefHeight, 3, 3, 'F');
    
    pdf.text(briefLines, margin + 4, yPosition + 3);
    yPosition += briefHeight + 8;
  }

  // Check if we need a new page
  if (yPosition > 240) {
    pdf.addPage();
    yPosition = 20;
  }

  // Full Analysis
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0);
  pdf.text('Análisis Completo', margin, yPosition);
  yPosition += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40);
  const analysisLines = pdf.splitTextToSize(params.analysis, contentWidth);
  
  // Split into pages if needed
  let remainingLines = [...analysisLines];
  while (remainingLines.length > 0) {
    const linesThisPage = Math.floor((280 - yPosition) / 5);
    const pageLinesText = remainingLines.slice(0, linesThisPage);
    pdf.text(pageLinesText, margin, yPosition);
    
    remainingLines = remainingLines.slice(linesThisPage);
    if (remainingLines.length > 0) {
      pdf.addPage();
      yPosition = 20;
    } else {
      yPosition += pageLinesText.length * 5 + 10;
    }
  }

  // Benchmarks table (if exist)
  if (params.benchmarks && params.benchmarks.length > 0) {
    // Check if we need a new page
    if (yPosition > 220) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text('Comparación vs Benchmarks', margin, yPosition);
    yPosition += 7;

    const tableData = params.benchmarks.map((bm) => {
      const label = metricLabels[bm.metric] || bm.metric;
      const currentVal = bm.current_value !== undefined 
        ? `${bm.current_value.toFixed(1)}${bm.unit}` 
        : 'N/D';
      const benchVal = `${bm.benchmark_value.toFixed(1)}${bm.unit}`;
      const gap = bm.gap_percent !== undefined
        ? `${bm.gap_percent > 0 ? '+' : ''}${bm.gap_percent.toFixed(1)}%`
        : 'N/D';
      
      return [label, currentVal, benchVal, gap];
    });

    (pdf as any).autoTable({
      startY: yPosition,
      head: [['Métrica', 'Tu Performance', 'Benchmark', 'Gap']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // primary blue
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 10;
  }

  // Sources
  if (params.sources && params.sources.length > 0) {
    if (yPosition > 260) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Fuentes: ${params.sources.join(' · ')}`, margin, yPosition);
    yPosition += 8;
  }

  // Footer on last page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Generado por WeKall Intelligence — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      285,
      { align: 'center' }
    );
  }

  // Save
  const safeName = params.fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  pdf.save(`executive-insight-${safeName}.pdf`);
}
